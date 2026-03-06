
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { evaluationQueue } from '../utils/queue.js';
import { fetchGithubRepoContent } from '../utils/github.js';
import { forgeAudit, cleanupForge } from '../utils/forge.js';

const router = express.Router();

// ---- Cerebras API Key Pool (round-robin rotation) ----
// Reads CEREBRAS_API_KEY, CEREBRAS_API_KEY_1, CEREBRAS_API_KEY_2, CEREBRAS_API_KEY_3, CEREBRAS_API_KEY_4, etc.
function buildCerebrasKeyPool() {
    const keys = [];
    if (process.env.CEREBRAS_API_KEY) keys.push(process.env.CEREBRAS_API_KEY.trim());
    for (let i = 1; i <= 10; i++) {
        const k = process.env[`CEREBRAS_API_KEY_${i}`];
        if (k && k.trim()) keys.push(k.trim());
    }
    return [...new Set(keys)]; // deduplicate
}

let _cerebrasKeyIndex = 0;
function getNextCerebrasKey() {
    const pool = buildCerebrasKeyPool();
    if (pool.length === 0) return null;
    const key = pool[_cerebrasKeyIndex % pool.length];
    _cerebrasKeyIndex++;
    return key;
}

// GET /api/evaluations
router.get('/', authMiddleware, async (req, res) => {
    try {
        const batch = req.query.batch || req.user.batch || '2027';

        // Fetch evaluations linked to submissions
        const [rows] = await pool.execute(`
            SELECT er.* 
            FROM evaluation_results er 
            LEFT JOIN submissions s ON er.submission_id = s.id 
            LEFT JOIN teams t ON s.team_id = t.id
            WHERE t.batch = ?
            ORDER BY er.submission_id DESC
        `, [batch]);

        res.json(rows);
    } catch (err) {
        console.error('Error in GET /api/evaluations:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/evaluations (manual save)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, forgeLogs, ...result } = req.body;
    try {
        await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
        await pool.execute(
            `INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback, detailed_report, file_tree, forge_logs)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [submissionId, result.code_quality || 0, result.req_satisfaction || 0, result.innovation || 0, result.total_score || 0,
                result.requirements_met || 0, result.total_requirements || 0, result.feedback || '',
                JSON.stringify(result.detailed_report || []), JSON.stringify(result.file_tree || []),
                JSON.stringify(forgeLogs || [])]
        );
        res.json({ message: 'Saved' });
    } catch (err) {
        console.error('Error saving evaluation:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


/**
 * ============================================================
 * 🤖 AI EVALUATION ENGINE — Deep Technical Audit
 * ============================================================
 * This evaluates a GitHub repo against hackathon requirements.
 * 
 * STRATEGY:
 * 1. Fetch and deeply scan the GitHub repo (30+ files)
 * 2. Build a structured context with file groupings
 * 3. Send a very detailed, strict prompt to AI
 * 4. AI evaluates EACH requirement individually with evidence
 * 5. Robust JSON parsing with multiple fallbacks
 * 6. If AI fails completely → mark as FAILED (not fake scores)
 * ============================================================
 */
// Evaluation logic worker
const evaluationWorker = async (data, job) => {
    const {
        submissionId, useCaseTitle, requirementText, githubUrl, phase,
        allRequirements, useCaseObjective, domainChallenge, skipForge
    } = data;

    try {
        console.log(`\n🤖 ======= Job Started: ${job.id} =======`);
        console.log(`   Submission ID: ${submissionId}`);

        // Normalize GitHub URL
        let finalUrl = githubUrl;
        if (finalUrl && !finalUrl.startsWith('http')) {
            finalUrl = `https://github.com/${finalUrl.replace(/^\//, '')}`;
        }
        console.log(`   GitHub (Final): ${finalUrl}`);

        // ---- STEP 0: Get Team Info for Identity Check ----
        const [[teamInfo]] = await pool.execute(`
            SELECT t.members, t.name, t.team_number 
            FROM teams t 
            JOIN submissions s ON s.team_id = t.id 
            WHERE s.id = ?
        `, [submissionId]);

        const teamMembers = teamInfo?.members ? JSON.parse(teamInfo.members) : [];

        // ---- STEP 1: Deep GitHub Scan ----
        const githubData = await fetchGithubRepoContent(finalUrl);
        const repoInfo = githubData?.repoInfo || {};

        if (!githubData || !githubData.fullContext || githubData.fullContext.trim().length < 50) {
            console.error('❌ GitHub scan returned no usable code');
            const evaluation = {
                codeQuality: 0, reqSatisfaction: 0, innovation: 0, totalScore: 0, requirementsMet: 0,
                feedback: `❌ EVALUATION FAILED: Could not access or read the GitHub repository at ${finalUrl}. Make sure the repository is PUBLIC and the URL is correct. If this is new, GitHub API rate limiting may also be the cause — try again in a few minutes.`,
                detailedReport: [],
                identityVerified: true,
            };
            await saveEvaluation(submissionId, evaluation, allRequirements || [], githubData?.fileTree || []);
            return evaluation;
        }

        // ---- STEP 1b: Run actual code via Forge (skip if AI-only evaluation) ----
        let execOutput = '';
        let forgeLogs = [];
        if (!skipForge) {
            const forgeId = `eval_${submissionId}_${Date.now()}`;
            try {
                console.log(`   🔨 Running Forge code execution for submission ${submissionId}...`);
                const forgeResult = await forgeAudit(finalUrl, forgeId);
                if (forgeResult.success) {
                    forgeLogs = forgeResult.buildLogs || [];
                    if (forgeResult.execResult?.ran) {
                        const exec = forgeResult.execResult;
                        execOutput = `\n\n## CODE EXECUTION RESULT\nEntry Point: ${exec.mainFile}\nExit Status: ${exec.exitSuccess ? 'Success' : exec.timedOut ? 'Timeout (server/app kept running)' : 'Error'}\n\nExecution Output:\n\`\`\`\n${exec.output || '(no output)'}\n\`\`\``;
                        console.log(`   ✅ Forge executed ${exec.mainFile}: ${exec.output?.substring(0, 100)}...`);
                    } else {
                        console.log(`   ⚠️ Forge execution skipped: ${forgeResult.execResult?.runLogs?.[0]?.text || 'no entry point'}`);
                    }
                }
                try { await cleanupForge(forgeId); } catch (_) {}
            } catch (forgeErr) {
                console.warn(`   ⚠️ Forge execution failed (non-fatal): ${forgeErr.message}`);
            }
        } else {
            console.log(`   ⏩ Skipping Forge (AI-only evaluation mode)`);
        }

        // ---- STEP 2: Build context ----
        const reqsList = Array.isArray(allRequirements) && allRequirements.length > 0
            ? allRequirements
            : (requirementText && requirementText !== 'ALL REQUIREMENTS' ? [requirementText] : []);
        const fileSummary = githubData.fileContents?.map(f => `  - ${f.path}`).join('\n') || 'None';

        // ---- STEP 3: Call AI (per-requirement — each req gets its own focused call) ----
        const cerebrasPool = buildCerebrasKeyPool();
        let evaluation = null;
        let aiSkipReason = null;

        if (cerebrasPool.length > 0 && reqsList.length > 0) {
            console.log(`   🔑 Cerebras key pool: ${cerebrasPool.length} key(s) | Evaluating ${reqsList.length} requirements individually...`);
            // Truncated code context per-call (keeps each prompt small and focused)
            const codeContext = githubData.fullContext.substring(0, 28000);
            evaluation = await callAIPerRequirement({
                getKey: getNextCerebrasKey,
                keyPoolSize: cerebrasPool.length,
                useCaseTitle,
                useCaseObjective,
                domainChallenge,
                phase,
                reqsList,
                codeContext,
                execOutput,
                fileSummary,
                repoStats: githubData.stats,
                teamMembers,
                repoInfo
            });
            if (!evaluation) aiSkipReason = 'AI call failed (rate limit or API error — all keys exhausted)';
        } else if (cerebrasPool.length === 0) {
            aiSkipReason = 'No CEREBRAS_API_KEY configured on server (add to Render env vars)';
            console.error(`   ❌ ${aiSkipReason}`);
        } else {
            aiSkipReason = 'No requirements found for this use case';
            console.warn(`   ⚠️ ${aiSkipReason}`);
        }

        // ---- STEP 4: Fallback ----
        if (!evaluation) {
            console.log(`⚠️ AI evaluation skipped: ${aiSkipReason}. Using keyword-based fallback...`);
            evaluation = keywordBasedEvaluation(githubData, reqsList, useCaseTitle, execOutput, aiSkipReason);
        }

        // ---- STEP 5: Save ----
        await saveEvaluation(submissionId, evaluation, reqsList, githubData.fileTree, forgeLogs);
        return evaluation;

    } catch (err) {
        console.error(`🔴 Evaluation ${job.id} crashed:`, err);
        // Save minimal failure result
        const fallback = {
            codeQuality: 0, reqSatisfaction: 0, innovation: 0, totalScore: 0, requirementsMet: 0,
            feedback: `Evaluation failed: ${err.message}`, detailedReport: []
        };
        await saveEvaluation(submissionId, fallback, [], []);
        throw err;
    }
};

// Register worker
evaluationQueue.setWorker(evaluationWorker);

router.post('/evaluate', authMiddleware, adminOnly, async (req, res) => {
    try {
        const jobId = evaluationQueue.add(req.body);
        res.json({ 
            message: 'Evaluation added to queue', 
            jobId: jobId,
            status: 'pending'
        });
    } catch (err) {
        console.error('Error adding evaluation to queue:', err);
        res.status(500).json({ 
            error: 'Failed to queue evaluation: ' + err.message 
        });
    }
});

/**
 * ============================================================
 * PER-REQUIREMENT AI EVALUATION
 * ============================================================
 * Each requirement is evaluated in its own focused AI call.
 * This prevents the model from losing track of requirements
 * in a long list and ensures every requirement is properly judged.
 * ============================================================
 */

/**
 * Make one Cerebras API call and return parsed JSON
 */
async function cerebrasCall({ getKey, keyPoolSize, systemPrompt, userPrompt }) {
    const maxAttempts = Math.max(keyPoolSize || 1, 1);
    let response = null;
    let lastError = null;

    const requestBody = JSON.stringify({
        model: 'llama3.1-8b',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 1024
    });

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    // Try each key; on 429 wait then retry with next key
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const apiKey = getKey();
        if (!apiKey) { console.error('   ❌ No Cerebras API keys available!'); break; }
        try {
            response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(60000),
                body: requestBody
            });
            if (response.ok) break;
            const errText = await response.text();
            console.error(`❌ Cerebras Error (attempt ${attempt + 1}): ${response.status} ${errText.substring(0, 150)}`);
            if (response.status === 429) {
                const waitMs = 3000 + attempt * 2000; // 3s, 5s, 7s...
                console.warn(`   ⏳ Rate limited — waiting ${waitMs / 1000}s before retry with next key...`);
                await sleep(waitMs);
                response = null; continue;
            }
            if (response.status === 401) { response = null; continue; }
            return null; // non-retryable
        } catch (fetchErr) {
            if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
                console.error(`❌ AI call timed out (attempt ${attempt + 1})`);
                return null;
            }
            throw fetchErr;
        }
    }

    if (!response || !response.ok) { console.error(`❌ AI call failed after ${maxAttempts} attempts`); return null; }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return parseAIResponse(content);
}

/**
 * Evaluate ALL requirements — each in its own focused AI call, then one summary call
 */
async function callAIPerRequirement({ getKey, keyPoolSize, useCaseTitle, useCaseObjective, domainChallenge, phase, reqsList, codeContext, execOutput, fileSummary, repoStats, teamMembers, repoInfo }) {

    const execSection = execOutput ? `\n\n## EXECUTION OUTPUT\n${execOutput}` : '';

    // ---- Evaluate each requirement independently ----
    const stripReqPrefix = (text) => String(text).replace(/^R?\d+[:\s.\-]+/i, '').trim();
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const detailedReport = [];
    for (let i = 0; i < reqsList.length; i++) {
        const rawReqText = typeof reqsList[i] === 'string' ? reqsList[i] : String(reqsList[i]);
        const reqText = stripReqPrefix(rawReqText); // remove any stored R1/R2 prefix
        if (i > 0) await sleep(1500); // 1.5s gap between calls to avoid rate limit
        console.log(`   📋 [${i + 1}/${reqsList.length}] Evaluating: ${reqText.substring(0, 50)}...`);

        const reqResult = await cerebrasCall({
            getKey,
            keyPoolSize,
            systemPrompt: 'You are a strict hackathon code judge. Respond ONLY with valid JSON. No markdown.',
            userPrompt: `You are evaluating a student hackathon project for ONE specific requirement.

## USE CASE: ${useCaseTitle}
## REQUIREMENT (R${i + 1}): ${reqText}

## CRITICAL RULES:
- DO NOT look for the exact function/method/variable name from the requirement text
- Look for the UNDERLYING CONCEPT implemented in ANY form with ANY naming
- If the logic/feature exists ANYWHERE in the codebase it COUNTS

## SCORING BANDS (you MUST differentiate — do NOT default to 85):
- "Met" with EXCELLENT implementation = score 90-100 (polished, robust, production-quality)
- "Met" with GOOD implementation = score 75-89 (works well but has minor gaps)
- "Met" with BASIC implementation = score 60-74 (functional but simplistic or has issues)
- "Partial" = concept attempted but incomplete = score 30-59
- "Not Met" = concept completely absent = score 0-29

## IMPORTANT: Vary your scores based on actual code quality. A simple 5-line implementation is NOT the same as a robust 50-line one.

## PROJECT FILES:
${fileSummary}
${execSection}

## CODE:
${codeContext}

Respond ONLY with this JSON:
{
  "status": "Met|Partial|Not Met",
  "score": <0-100>,
  "explanation": "<specific code evidence found — which files, what logic?>",
  "filesFound": ["<file1>"],
  "mistakes": ["<gap or improvement needed>"]
}`
        });

        const label = `R${i + 1}: ${reqText}`;
        if (reqResult) {
            const clamp = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
            const score = clamp(reqResult.score);
            let status = reqResult.status;
            if (!['Met', 'Partial', 'Not Met'].includes(status)) {
                status = score >= 60 ? 'Met' : score >= 30 ? 'Partial' : 'Not Met';
            }
            console.log(`      ✅ R${i + 1}: ${status} (${score}%)`);
            detailedReport.push({
                req: label,
                status,
                score,
                explanation: String(reqResult.explanation || 'No explanation provided'),
                filesFound: Array.isArray(reqResult.filesFound) ? reqResult.filesFound : [],
                mistakes: Array.isArray(reqResult.mistakes) ? reqResult.mistakes.map(String) : [],
            });
        } else {
            console.warn(`   ⚠️ R${i + 1} evaluation failed — marked Not Evaluated`);
            detailedReport.push({
                req: label,
                status: 'Not Met',
                score: 0,
                explanation: 'AI evaluation failed for this requirement (rate limit or API timeout — please retry).',
                filesFound: [],
                mistakes: ['Evaluation failed — retry this evaluation'],
            });
        }
    }

    // ---- One final call for overall quality, innovation, feedback ----
    await sleep(1500); // gap before final summary call
    console.log(`   🧠 Final: Generating overall quality + feedback...`);
    const reqsSummary = detailedReport.map(r => `${r.req}: ${r.status} (${r.score}%)`).join('\n');
    const summaryResult = await cerebrasCall({
        getKey,
        keyPoolSize,
        systemPrompt: 'You are a strict hackathon code judge. Respond ONLY with valid JSON. No markdown.',
        userPrompt: `You have already evaluated each requirement for a student hackathon project.

## USE CASE: ${useCaseTitle}
## REQUIREMENT RESULTS:
${reqsSummary}

## REPO INFO:
- Files analyzed: ${repoStats?.filesAnalyzed || 0}
- Languages: ${JSON.stringify(repoStats?.filesByType || {})}
${execSection}

Now provide OVERALL scores. IMPORTANT: Do NOT default to scores around 85. Actively differentiate:
- 90-100: Exceptional — clean architecture, proper error handling, well-organized modules
- 70-89: Good — decent structure but some gaps in error handling or organization
- 50-69: Average — basic structure, significant room for improvement
- 25-49: Below average — poor organization, missing error handling
- 0-24: Very poor — messy code, no structure

{
  "codeQuality": <0-100, judge code structure/error-handling/modularity — be specific and differentiated>,
  "innovation": <0-100, judge novelty/UX/production-readiness — be specific and differentiated>,
  "plagiarismRisk": "Low|Medium|High",
  "feedback": "<4-6 sentence technical summary. Mention specific files. What works, what's missing.>"
}`
    });

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
    const codeQuality = clamp(summaryResult?.codeQuality ?? 40, 0, 100);
    const innovation = clamp(summaryResult?.innovation ?? 30, 0, 100);
    const requirementsMet = detailedReport.filter(r => r.score >= 60).length;
    const reqSatisfaction = detailedReport.length > 0
        ? clamp(detailedReport.reduce((s, r) => s + r.score, 0) / detailedReport.length, 0, 100)
        : 0;
    const totalScore = clamp((codeQuality * 0.25) + (reqSatisfaction * 0.50) + (innovation * 0.25), 0, 100);

    console.log(`   ✅ Per-req evaluation done — ${requirementsMet}/${reqsList.length} met | Total: ${totalScore}`);

    return {
        codeQuality,
        reqSatisfaction,
        innovation,
        totalScore,
        requirementsMet,
        feedback: String(summaryResult?.feedback || `Evaluated ${requirementsMet}/${reqsList.length} requirements.`),
        detailedReport,
        plagiarismRisk: String(summaryResult?.plagiarismRisk || 'Low'),
        identityVerified: true,
    };
}

/**
 * Call Cerebras AI for deep evaluation (LEGACY — kept for reference)
 */
async function callAIEvaluation({ getKey, keyPoolSize, useCaseTitle, useCaseObjective, domainChallenge, phase, reqsFormatted, reqsList, githubContext, execOutput, fileSummary, repoStats, teamMembers, repoInfo }) {

    const teamNames = teamMembers.map(m => m.name || m).join(', ');

    const prompt = `You are a SENIOR TECHNICAL ARCHITECT and HACKATHON JUDGE performing a DEEP-LEVEL CODE AUDIT.

## ASSIGNED USE CASE
- **Use Case Title:** ${useCaseTitle}
${useCaseObjective ? `- **Objective:** ${useCaseObjective}` : ''}
${domainChallenge ? `- **Domain Challenge:** ${domainChallenge}` : ''}
- **Phase:** ${phase}

## CRITICAL: TOPIC ALIGNMENT CHECK
You MUST verify if the repository's project matches the assigned use case above.
**STRICT RULE:** If the code is for a COMPLETELY DIFFERENT topic (not related at all), give Total Score 0-5 and state "TOPIC MISMATCH".

## REQUIREMENTS TO VERIFY (Evaluate ALL ${reqsList.length} requirements)
${reqsFormatted}

## REPOSITORY METRICS
- Files Read: ${repoStats.filesAnalyzed}
- Total Items: ${repoStats.totalFilesInRepo}
- Languages Found: ${JSON.stringify(repoStats.filesByType || {})}

## KEY FILES ANALYZED
${fileSummary}
${execOutput ? execOutput : ''}

## EVALUATION CRITERIA (STRICT BUT FAIR):
1. **Requirement Satisfaction (50% weight)**: Does code implement each requirement's CONCEPT/FUNCTIONALITY — in ANY form?
2. **Code Quality (25% weight)**: Structure, error handling, modularity.
3. **Innovation (25% weight)**: Novel approach, good UX, extra features, production-readiness.

## ⚠️ CRITICAL EVALUATION RULES — READ CAREFULLY:
- **DO NOT** look for exact function names or variable names from the requirement text.
- Example: Requirement says "answer_with_citations()" → look for ANY code that answers questions while providing citations/sources/references. The function can be named ANYTHING.
- Example: Requirement says "Similarity threshold" → look for ANY threshold/cutoff/score comparison logic anywhere in the code. Variable can be named anything.
- Example: Requirement says "Top-k comparison" → look for any top-k / best-k / ranked results logic anywhere.
- Students write code in their OWN STYLE. Evaluate the UNDERLYING CONCEPT, not the exact naming.
- If the logic/feature exists ANYWHERE in the codebase (inline code, class method, route handler, helper function, lambda) it COUNTS.
- Only mark "Not Met" if the concept/feature is COMPLETELY ABSENT — zero evidence in the entire codebase.
- "Partial" = concept exists but is incomplete, simplified, or missing key aspects.

### SCORING SCALE:
- 90-100: Elite — fully implemented, polished, production-quality
- 70-89: Advanced — well implemented with minor gaps  
- 50-69: Intermediate — partially implemented or implemented differently than described
- 25-49: Novice — concept attempted but significantly incomplete
- 0-10: Concept completely absent from the entire codebase

### FOR EACH REQUIREMENT YOU MUST:
1. Understand WHAT the requirement is asking for (the concept/feature/behaviour, not the name)
2. Search ALL the code for ANY implementation of that concept — regardless of naming conventions
3. Look at: API routes, data structures, logic blocks, algorithms, variable names, comments — everything
4. Provide specific file names and describe the code evidence found
${execOutput ? `5. Check if execution output confirms the feature runs` : ''}

## RESPOND WITH VALID JSON ONLY — NO MARKDOWN, NO EXPLANATION:
{
  "codeQuality": <0-100>,
  "reqSatisfaction": <0-100>,
  "innovation": <0-100>,
  "totalScore": <0-100>,
  "requirementsMet": <count of requirements scoring >= 70>,
  "plagiarismRisk": "Low|Medium|High",
  "identityVerified": true,
  "feedback": "<4-6 sentence technical analysis. Mention specific file names. Describe what works and what's missing.>",
  "detailedReport": [
    {
      "req": "R1: <full requirement text>",
      "status": "Met|Partial|Not Met",
      "score": <0-100>,
      "explanation": "<what specific code evidence was found, which files, which functions?>",
      "filesFound": ["<file1>", "<file2>"],
      "mistakes": ["<specific issue 1>", "<specific issue 2>"]
    }
  ]
}

## REPOSITORY CONTENT:
${githubContext}`;

    console.log(`   📤 Sending to AI (context: ${(githubContext.length / 1024).toFixed(1)}KB)...`);

    try {
        // Trim context if too large to avoid token limits (Cerebras has ~8K output token limit)
        const MAX_CONTEXT = 60000;
        const trimmedContext = prompt.length > MAX_CONTEXT
            ? prompt.substring(0, MAX_CONTEXT) + '\n\n[CONTEXT TRUNCATED DUE TO LENGTH — evaluate based on available code above]'
            : prompt;

        const requestBody = JSON.stringify({
            model: 'llama3.1-8b',
            messages: [
                {
                    role: 'system',
                    content: 'You are a strict, precise hackathon judge. You MUST respond with ONLY valid JSON. No markdown. No explanation. No preamble.'
                },
                {
                    role: 'user',
                    content: trimmedContext
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
            max_tokens: 4096
        });

        // --- Retry loop with key rotation ---
        const maxAttempts = keyPoolSize || 1;
        let response = null;
        let lastError = null;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const apiKey = getKey();
            if (!apiKey) { console.error('   ❌ No Cerebras API keys available!'); break; }
            console.log(`   🔑 Cerebras attempt ${attempt + 1}/${maxAttempts} with key ...${apiKey.slice(-6)}`);
            try {
                response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(90000), // 90 second timeout
                    body: requestBody
                });
                if (response.ok) break; // success → exit retry loop
                const errText = await response.text();
                console.error(`❌ AI API Error (attempt ${attempt + 1}): ${response.status} ${errText.substring(0, 200)}`);
                if (response.status === 429) {
                    console.warn(`   ⚠️ Rate limited! Rotating to next key...`);
                    lastError = '429 Rate Limited';
                    response = null; // force retry
                    continue;
                }
                if (response.status === 401) {
                    console.warn(`   ⚠️ Invalid API key! Rotating to next key...`);
                    lastError = '401 Unauthorized';
                    response = null;
                    continue;
                }
                // Other errors: don't retry
                console.error(`   → Non-retryable error, giving up.`);
                return null;
            } catch (fetchErr) {
                if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
                    console.error(`❌ AI call timed out (attempt ${attempt + 1})`);
                    return null;
                }
                throw fetchErr;
            }
        }

        if (!response || !response.ok) {
            console.error(`❌ AI call failed after all ${maxAttempts} key(s). Last error: ${lastError}`);
            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error('❌ AI returned empty content');
            return null;
        }

        console.log(`   📥 AI responded (${content.length} chars)`);

        // ---- Robust JSON parsing ----
        let evaluation = parseAIResponse(content);

        if (!evaluation) {
            console.error('❌ Failed to parse AI response:', content.substring(0, 200));
            return null;
        }

        // ---- Validate and sanitize scores ----
        evaluation = sanitizeEvaluation(evaluation, reqsList);

        console.log(`   ✅ AI Scores — Quality: ${evaluation.codeQuality}, Satisfaction: ${evaluation.reqSatisfaction}, Innovation: ${evaluation.innovation}, Total: ${evaluation.totalScore}`);

        return evaluation;

    } catch (err) {
        console.error('❌ AI call error:', err.name, err.message);
        return null;
    }
}
/**
 * Parse AI response with multiple fallback strategies
 */
function parseAIResponse(content) {
    // Strategy 1: Direct parse
    try {
        return JSON.parse(content);
    } catch (e) { /* continue */ }

    // Strategy 2: Extract JSON from markdown code block
    const jsonBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
        try {
            return JSON.parse(jsonBlockMatch[1]);
        } catch (e) { /* continue */ }
    }

    // Strategy 3: Find the first {to last }
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            return JSON.parse(content.substring(firstBrace, lastBrace + 1));
        } catch (e) { /* continue */ }
    }

    // Strategy 4: Try to fix common JSON issues
    try {
        const cleaned = content
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/[\x00-\x1F\x7F]/g, ' ');
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end > start) {
            return JSON.parse(cleaned.substring(start, end + 1));
        }
    } catch (e) { /* all strategies failed */ }

    return null;
}

/**
 * Validate and sanitize AI evaluation scores
 */
function sanitizeEvaluation(eval_, reqsList) {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, Math.round(Number(v) || 0)));

    const codeQuality = clamp(eval_.codeQuality, 0, 100);
    const reqSatisfaction = clamp(eval_.reqSatisfaction, 0, 100);
    const innovation = clamp(eval_.innovation, 0, 100);

    // Recalculate total score using weighted formula
    const totalScore = clamp(
        (codeQuality * 0.25) + (reqSatisfaction * 0.50) + (innovation * 0.25),
        0, 100
    );

    // Sanitize detailed report
    let detailedReport = [];
    if (Array.isArray(eval_.detailedReport)) {
        detailedReport = eval_.detailedReport.map((r, i) => ({
            req: r.req || `R${i + 1}: ${reqsList[i] || 'Requirement'}`,
            status: ['Elite', 'Met', 'Partial', 'Not Met'].includes(r.status) ? (r.status === 'Elite' ? 'Met' : r.status) : 'Not Met',
            score: clamp(r.score, 0, 100),
            explanation: String(r.explanation || 'No explanation provided'),
            filesFound: Array.isArray(r.filesFound) ? r.filesFound : [],
            mistakes: Array.isArray(r.mistakes) ? r.mistakes.map(String) : [],
        }));
    }

    // Ensure we have an entry for each requirement
    while (detailedReport.length < reqsList.length) {
        const i = detailedReport.length;
        detailedReport.push({
            req: `R${i + 1}: ${reqsList[i] || 'Requirement'}`,
            status: 'Not Met',
            score: 0,
            explanation: 'Not evaluated — AI did not provide analysis for this requirement.',
            filesFound: [],
            mistakes: ['Requirement was not analyzed'],
        });
    }

    // Count requirements met (score >= 60)
    const requirementsMet = detailedReport.filter(r => r.score >= 60).length;

    return {
        codeQuality,
        reqSatisfaction,
        innovation,
        totalScore,
        requirementsMet,
        feedback: String(eval_.feedback || 'Evaluation completed.'),
        detailedReport,
        plagiarismRisk: String(eval_.plagiarismRisk || 'Low'),
        // identityVerified defaults to TRUE — only mark false if AI explicitly provides evidence
        // GitHub usernames rarely match real names, so we don't use strict matching
        identityVerified: eval_.identityVerified === false ? false : true,
    };
}

/**
 * Keyword-based fallback evaluation when AI is unavailable
 */
function keywordBasedEvaluation(githubData, reqsList, useCaseTitle, execOutput = '', aiSkipReason = null) {
    const code = ((githubData.fullContext || '') + ' ' + execOutput).toLowerCase();
    const stats = githubData.stats || {};

    // If no code at all
    if (code.length < 100) {
        return {
            codeQuality: 0,
            reqSatisfaction: 0,
            innovation: 0,
            totalScore: 0,
            requirementsMet: 0,
            feedback: '❌ Repository appears empty or contains no analyzable code. The AI evaluation was unavailable and keyword analysis found no code content.',
            detailedReport: reqsList.map((r, i) => ({
                req: `R${i + 1}: ${typeof r === 'string' ? r : 'Requirement'}`,
                status: 'Not Met',
                score: 0,
                explanation: 'No code found in repository.',
                filesFound: [],
                mistakes: ['No implementation found'],
            })),
        };
    }

    // Analyze code quality indicators
    let qualityScore = 20; // Base score for having code
    if (code.includes('import ') || code.includes('from ') || code.includes('require(')) qualityScore += 10;
    if (code.includes('try') && code.includes('catch')) qualityScore += 10;
    if (code.includes('class ') || code.includes('def ') || code.includes('function ')) qualityScore += 10;
    if (code.includes('async') || code.includes('await')) qualityScore += 5;
    if (code.includes('test') || code.includes('spec')) qualityScore += 5;
    if (stats.filesAnalyzed > 5) qualityScore += 5;
    if (stats.filesAnalyzed > 15) qualityScore += 5;
    if (stats.codeFilesFound > 10) qualityScore += 5;
    qualityScore = Math.min(qualityScore, 75); // Cap at 75 for keyword-based

    // Per-requirement keyword analysis
    let globalRelevance = 0;
    const titleKeywords = useCaseTitle.toLowerCase().split(/[\s,\-&\/]+/).filter(w => w.length > 3);
    for (const tw of titleKeywords) {
        if (code.includes(tw)) globalRelevance += 1;
    }

    const detailedReport = reqsList.map((req, i) => {
        const reqText = (typeof req === 'string' ? req : '').toLowerCase();
        const keywords = reqText.split(/[\s,\-&\/]+/).filter(w => w.length > 3);

        let found = 0;
        let totalKeywords = Math.max(keywords.length, 1);
        const matchedKeywords = [];

        for (const kw of keywords) {
            if (code.includes(kw)) {
                found++;
                matchedKeywords.push(kw);
            }
        }

        // Also check for common implementation patterns
        const techKeywords = extractTechKeywords(reqText);
        let techFound = 0;
        for (const tk of techKeywords) {
            if (code.includes(tk)) techFound++;
        }

        const keywordRatio = found / totalKeywords;
        const techRatio = techKeywords.length > 0 ? techFound / techKeywords.length : 0;

        let score = Math.round((keywordRatio * 0.6 + techRatio * 0.4) * 60); // Max 60 for keyword-based

        // RELEVANCE PENALTY: If use case keywords aren't found, slash the score
        if (globalRelevance === 0 && titleKeywords.length > 0) {
            score = Math.min(score, 5);
        } else if (score > 0) {
            score = Math.max(score, 15);
        }

        let status = 'Not Met';
        if (score >= 50) status = 'Partial';
        if (score >= 70) status = 'Met';

        return {
            req: `R${i + 1}: ${typeof req === 'string' ? req : 'Requirement'}`,
            status,
            score,
            explanation: globalRelevance === 0 && titleKeywords.length > 0
                ? `❌ RELEVANCE CRITICAL FAILURE: Code does not appear related to ${useCaseTitle}.`
                : `⚠️ Keyword analysis: Found ${found}/${totalKeywords} keywords. ${techFound} tech patterns.`,
            filesFound: [],
            mistakes: globalRelevance === 0 ? ['Topic Mismatch Detected'] : ['AI evaluation recommended'],
        };
    });

    const reqSatisfaction = Math.round(detailedReport.reduce((sum, r) => sum + r.score, 0) / detailedReport.length);
    const requirementsMet = detailedReport.filter(r => r.score >= 60).length;
    const innovation = globalRelevance === 0 ? 0 : Math.min(Math.round(qualityScore * 0.5), 40);

    const totalScore = globalRelevance === 0 && titleKeywords.length > 0
        ? Math.min(Math.round((qualityScore * 0.1) + (reqSatisfaction * 0.9)), 10)
        : Math.round((qualityScore * 0.25) + (reqSatisfaction * 0.50) + (innovation * 0.25));

    return {
        codeQuality: globalRelevance === 0 ? Math.min(qualityScore, 20) : qualityScore,
        reqSatisfaction,
        innovation,
        totalScore,
        requirementsMet,
        identityVerified: true,
        plagiarismRisk: 'Low',
        feedback: globalRelevance === 0 && titleKeywords.length > 0
            ? `❌ TOPIC MISMATCH: The code in this repository does not seem to relate to the assigned use case (${useCaseTitle}). AI evaluation was skipped due to lack of relevance.`
            : `⚠️ KEYWORD-BASED EVALUATION (AI Unavailable${aiSkipReason ? ': ' + aiSkipReason : ''}). Found ${stats.codeFilesFound || 0} code files. Detected ${requirementsMet}/${reqsList.length} requirements.${execOutput ? ' Code execution output was captured.' : ' No runtime execution performed.'}`,
        detailedReport,
    };
}

/**
 * Extract technology-specific keywords from requirement text
 */
function extractTechKeywords(reqText) {
    const techMap = {
        'machine learning': ['sklearn', 'tensorflow', 'torch', 'keras', 'model', 'train', 'predict', 'fit'],
        'deep learning': ['neural', 'cnn', 'rnn', 'lstm', 'conv2d', 'dense', 'layers', 'epochs'],
        'nlp': ['nlp', 'tokenize', 'embeddings', 'bert', 'transformer', 'sentiment', 'ner', 'spacy'],
        'api': ['api', 'endpoint', 'route', 'rest', 'fastapi', 'flask', 'express', 'fetch', 'axios'],
        'database': ['database', 'sql', 'mongodb', 'mysql', 'postgres', 'query', 'table', 'schema'],
        'dashboard': ['dashboard', 'chart', 'graph', 'visualization', 'plotly', 'matplotlib', 'recharts'],
        'chatbot': ['chatbot', 'chat', 'conversation', 'message', 'response', 'prompt', 'llm'],
        'authentication': ['auth', 'login', 'token', 'jwt', 'password', 'session', 'bcrypt'],
        'encryption': ['encrypt', 'decrypt', 'hash', 'cipher', 'ssl', 'tls', 'crypto'],
        'prediction': ['predict', 'forecast', 'regression', 'classification', 'probability'],
        'anomaly': ['anomaly', 'outlier', 'detection', 'threshold', 'abnormal', 'deviation'],
        'monitoring': ['monitor', 'alert', 'notification', 'realtime', 'stream', 'websocket'],
        'image': ['image', 'opencv', 'pillow', 'cv2', 'detection', 'recognition', 'segmentation'],
        'cloud': ['cloud', 'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'deploy'],
    };

    const keywords = [];
    for (const [category, terms] of Object.entries(techMap)) {
        if (reqText.includes(category) || terms.some(t => reqText.includes(t))) {
            keywords.push(...terms);
        }
    }

    // Always add some generic code quality keywords
    keywords.push('import', 'function', 'class', 'return', 'async');

    return [...new Set(keywords)];
}

/**
 * Save evaluation results to the database
 */
async function saveEvaluation(submissionId, evaluation, reqsList, fileTree, forgeLogs = []) {
    await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
    await pool.execute(
        `INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback, detailed_report, file_tree, plagiarism_risk, identity_verified, forge_logs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            submissionId,
            evaluation.codeQuality || 0,
            evaluation.reqSatisfaction || 0,
            evaluation.innovation || 0,
            evaluation.totalScore || 0,
            evaluation.requirementsMet || 0,
            reqsList.length || 0,
            evaluation.feedback || '',
            JSON.stringify(evaluation.detailedReport || []),
            JSON.stringify(fileTree || []),
            evaluation.plagiarismRisk || 'Low',
            evaluation.identityVerified ? 1 : 0,
            JSON.stringify(forgeLogs)
        ]
    );
}

// GET /api/evaluations/status/:jobId
router.get('/status/:jobId', authMiddleware, adminOnly, (req, res) => {
    const job = evaluationQueue.getStatus(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    // Sanitize job object to ensure it's JSON serializable
    const sanitized = {
        id: job.id,
        status: job.status,
        result: job.result ? {
            codeQuality: job.result.codeQuality || 0,
            reqSatisfaction: job.result.reqSatisfaction || 0,
            innovation: job.result.innovation || 0,
            totalScore: job.result.totalScore || 0,
            requirementsMet: job.result.requirementsMet || 0,
            feedback: job.result.feedback || '',
            detailedReport: Array.isArray(job.result.detailedReport) ? job.result.detailedReport : [],
            plagiarismRisk: job.result.plagiarismRisk || 'Low',
            identityVerified: Boolean(job.result.identityVerified),
            forgeLogs: Array.isArray(job.result.forgeLogs) ? job.result.forgeLogs : []
        } : null,
        error: job.error || null,
        timestamp: job.timestamp
    };
    
    res.json(sanitized);
});

// POST /api/evaluations/re-evaluate/:submissionId
// Re-run AI evaluation for a submission without re-cloning (fast re-eval)
router.post('/re-evaluate/:submissionId', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { submissionId } = req.params;
        
        // Fetch submission
        const [subRows] = await pool.execute(
            'SELECT * FROM submissions WHERE id = ?',
            [submissionId]
        );
        
        if (!subRows || subRows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        const submission = subRows[0];
        
        // Fetch team to get use case
        const [teamRows] = await pool.execute(
            'SELECT * FROM teams WHERE id = ?',
            [submission.team_id]
        );
        
        if (!teamRows || teamRows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }
        
        const team = teamRows[0];
        
        // Fetch use case
        const [useCaseRows] = await pool.execute(
            'SELECT * FROM use_cases WHERE id = ?',
            [team.use_case_id]
        );
        
        const useCase = useCaseRows?.[0] || { title: 'Unknown', objective: '', domainChallenge: '' };
        const requirements = typeof useCase.requirements === 'string' 
            ? JSON.parse(useCase.requirements) 
            : (useCase.requirements || []);
        
        // Queue evaluation with skipForge=true
        const jobId = evaluationQueue.add({
            submissionId: submission.id,
            useCaseTitle: useCase.title || 'Unknown',
            useCaseObjective: useCase.objective || '',
            domainChallenge: useCase.domainChallenge || '',
            requirementText: 'ALL REQUIREMENTS',
            githubUrl: submission.github_url,
            phase: submission.phase,
            allRequirements: requirements,
            skipForge: true  // Skip forge — use GitHub scan only
        });
        
        res.json({ 
            message: 'Re-evaluation queued (AI-only, no forge)',
            jobId: jobId,
            status: 'pending'
        });
    } catch (err) {
        console.error('Error queuing re-evaluation:', err);
        res.status(500).json({ error: 'Failed to queue re-evaluation: ' + err.message });
    }
});

// POST /api/evaluations/save-comment/:submissionId
// Save admin comment on a submission
router.post('/save-comment/:submissionId', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { comment } = req.body;
        
        const [result] = await pool.execute(
            'UPDATE submissions SET admin_comment = ? WHERE id = ?',
            [comment || null, submissionId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        res.json({ message: 'Comment saved', submissionId });
    } catch (err) {
        console.error('Error saving comment:', err);
        res.status(500).json({ error: 'Failed to save comment: ' + err.message });
    }
});

export default router;
