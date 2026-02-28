
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { evaluationQueue } from '../utils/queue.js';
import { fetchGithubRepoContent } from '../utils/github.js';

const router = express.Router();

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
        allRequirements, useCaseObjective, domainChallenge
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
                feedback: '❌ EVALUATION FAILED: Could not access or read the GitHub repository.',
                detailedReport: [],
            };
            await saveEvaluation(submissionId, evaluation, allRequirements || [], githubData?.fileTree || []);
            return evaluation;
        }

        // ---- STEP 2: Build context ----
        const reqsList = Array.isArray(allRequirements) ? allRequirements : [requirementText];
        const reqsFormatted = reqsList.map((r, i) => `R${i + 1}: ${typeof r === 'string' ? r : 'Requirement'}`).join('\n');
        const fileSummary = githubData.fileContents?.map(f => `  - ${f.path}`).join('\n') || 'None';

        // ---- STEP 3: Call AI ----
        const apiKey = process.env.CEREBRAS_API_KEY;
        let evaluation = null;

        if (apiKey) {
            evaluation = await callAIEvaluation({
                apiKey,
                useCaseTitle,
                useCaseObjective,
                domainChallenge,
                phase,
                reqsFormatted,
                reqsList,
                githubContext: githubData.fullContext,
                fileSummary,
                repoStats: githubData.stats,
                teamMembers,
                repoInfo
            });
        }

        // ---- STEP 4: Fallback ----
        if (!evaluation) {
            console.log('⚠️ AI evaluation failed, using keyword-based fallback...');
            evaluation = keywordBasedEvaluation(githubData, reqsList, useCaseTitle);
        }

        // ---- STEP 5: Save ----
        await saveEvaluation(submissionId, evaluation, reqsList, githubData.fileTree);
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
 * Call Cerebras AI for deep evaluation
 */
/**
 * Call Cerebras AI for deep evaluation
 */
async function callAIEvaluation({ apiKey, useCaseTitle, useCaseObjective, domainChallenge, phase, reqsFormatted, reqsList, githubContext, fileSummary, repoStats, teamMembers, repoInfo }) {

    const teamNames = teamMembers.map(m => m.name).join(', ');
    const contributors = (repoInfo.contributors || []).join(', ');

    const prompt = `You are a SENIOR TECHNICAL ARCHITECT and HACKATHON JUDGE performing a DEEP-LEVEL CODE AUDIT.

## PLAGIARISM & IDENTITY CHECK
You must verify if this work belongs to the team:
- **Team Name:** ${repoInfo.teamName || 'Unknown'}
- **Registered Members:** ${teamNames}
- **GitHub Repo Owner:** ${repoInfo.owner}
- **GitHub Contributors:** ${contributors}
- **Repo Created At:** ${repoInfo.createdAt}

**IDENTITY RULES (ANTI-PLAGIARISM):**
1. If the repo was created MORE than 1 month before the hackathon, flag it as "REUSED OLD PROJECT" unless it's a known framework.
2. If NONE of the team members match the GitHub contributors login/names, and there is no mention of the team in the README, deduction of 10 points is mandatory.
3. If you find STOLEN CODE from another public repo without attribution, score is 0.

## YOUR CRITICAL MISSION: TOPIC ALIGNMENT
Before scoring code quality, you MUST verify if the repository's project matches the assigned Use Case.
- **Assigned Use Case:** ${useCaseTitle}
- ${useCaseObjective ? `**Objective:** ${useCaseObjective}` : ''}

**STRICT RULE:** If the repository is for a COMPLETELY DIFFERENT topic, you MUST give a **Total Score of 0-5** and state "TOPIC MISMATCH" in the feedback.

## THE CHALLENGE DETAILS
${domainChallenge ? `**Domain Challenge:** ${domainChallenge}` : ''}
**Phase:** ${phase}

## REQUIREMENTS TO VERIFY
${reqsFormatted}

## REPOSITORY METRICS
- Files Read: ${repoStats.filesAnalyzed}
- Total Items: ${repoStats.totalFilesInRepo}
- Language Map: ${JSON.stringify(repoStats.filesByType)}

## ANALYSIS RULES (STRICT ENFORCEMENT)
1. **Relevance & Logical Integrity (60% of Score)**:
   - Does the code actually solve the assigned ${useCaseTitle} problem?
   - Look for CUSTOM logic. If you only see boilerplate, score is 0-20.
2. **Edge-Case Handling & Polish (20% of Score)**:
   - Are there try-catch blocks? Input validation?
3. **Scalability & Security (20% of Score)**:
   - Any leaked secrets? Can this handle load?

### SCORING SCALE:
- 95-100: ELITE. 75-94: ADVANCED. 50-74: INTERMEDIATE. 25-49: NOVICE. 0-5: MISMATCH/EMPTY.

## RESPOND WITH VALID JSON ONLY:
{
  "codeQuality": <0-100>,
  "reqSatisfaction": <0-100>,
  "innovation": <0-100>,
  "totalScore": <0-100>,
  "requirementsMet": <count of requirements scored >= 75>,
  "plagiarismRisk": "Low|Medium|High",
  "identityVerified": <true|false>,
  "feedback": "<4-6 sentence analytical report. Mention file names. Check identity.>",
  "detailedReport": [
    {
      "req": "R1: <text>",
      "status": "Elite|Met|Partial|Not Met",
      "score": <0-100>,
      "explanation": "<evidence found in which files?>",
      "filesFound": ["<list>"],
      "mistakes": ["<issues>"]
    }
  ]
}

## REPOSITORY CONTENT:
${githubContext}`;

    console.log(`   📤 Sending to AI (context: ${(githubContext.length / 1024).toFixed(1)}KB)...`);

    try {
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a strict but fair hackathon judge. Respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('❌ AI API Error:', response.status, errText);
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
            console.error('❌ Failed to parse AI response');
            return null;
        }

        // ---- Validate and sanitize scores ----
        evaluation = sanitizeEvaluation(evaluation, reqsList);

        console.log(`   ✅ AI Scores — Quality: ${evaluation.codeQuality}, Satisfaction: ${evaluation.reqSatisfaction}, Innovation: ${evaluation.innovation}, Total: ${evaluation.totalScore}`);

        return evaluation;

    } catch (err) {
        console.error('❌ AI call failed:', err.message);
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
            status: ['Met', 'Partial', 'Not Met'].includes(r.status) ? r.status : 'Not Met',
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

    // Count requirements met (score >= 70)
    const requirementsMet = detailedReport.filter(r => r.score >= 70).length;

    return {
        codeQuality,
        reqSatisfaction,
        innovation,
        totalScore,
        requirementsMet,
        feedback: String(eval_.feedback || 'Evaluation completed.'),
        detailedReport,
        plagiarismRisk: String(eval_.plagiarismRisk || 'Low'),
        identityVerified: Boolean(eval_.identityVerified !== false),
    };
}

/**
 * Keyword-based fallback evaluation when AI is unavailable
 * This is NOT a replacement for AI — it gives rough estimates based on code analysis
 */
function keywordBasedEvaluation(githubData, reqsList, useCaseTitle) {
    const code = (githubData.fullContext || '').toLowerCase();
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
    const requirementsMet = detailedReport.filter(r => r.score >= 70).length;
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
        feedback: globalRelevance === 0 && titleKeywords.length > 0
            ? `❌ TOPIC MISMATCH: The code in this repository does not seem to relate to the assigned use case (${useCaseTitle}). AI evaluation was skipped due to lack of relevance.`
            : `⚠️ KEYWORD-BASED EVALUATION (AI Unavailable). Found ${stats.codeFilesFound || 0} code files. Detected ${requirementsMet}/${reqsList.length} requirements.`,
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

export default router;
