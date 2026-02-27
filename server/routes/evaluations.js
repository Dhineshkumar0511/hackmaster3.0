
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { evaluationQueue } from '../utils/queue.js';
import { fetchGithubRepoContent } from '../utils/github.js';

const router = express.Router();

// GET /api/evaluations
router.get('/', authMiddleware, async (req, res) => {
    try {
        const batch = req.query.batch;
        let query = 'SELECT er.* FROM evaluation_results er JOIN submissions s ON er.submission_id = s.id JOIN teams t ON s.team_id = t.id';
        const params = [];

        if (req.user.role === 'team') {
            query += ' WHERE s.team_number = ? AND t.batch = ?';
            params.push(req.user.teamNumber, req.user.batch);
        } else if (batch) {
            query += ' WHERE t.batch = ?';
            params.push(batch);
        }

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error in GET /api/evaluations:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/evaluations (manual save)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, ...result } = req.body;
    try {
        await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
        await pool.execute(
            `INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback, detailed_report, file_tree)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [submissionId, result.code_quality || 0, result.req_satisfaction || 0, result.innovation || 0, result.total_score || 0,
                result.requirements_met || 0, result.total_requirements || 0, result.feedback || '',
                JSON.stringify(result.detailed_report || []), JSON.stringify(result.file_tree || [])]
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
        console.log(`   GitHub: ${githubUrl}`);

        // ---- STEP 1: Deep GitHub Scan ----
        const githubData = await fetchGithubRepoContent(githubUrl);

        if (!githubData || !githubData.fullContext || githubData.fullContext.trim().length < 50) {
            console.error('❌ GitHub scan returned no usable code');

            const evaluation = {
                codeQuality: 0,
                reqSatisfaction: 0,
                innovation: 0,
                totalScore: 0,
                requirementsMet: 0,
                feedback: '❌ EVALUATION FAILED: Could not access or read the GitHub repository. Please check if repository is public and contains code files.',
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
                repoStats: githubData.stats
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
    const jobId = evaluationQueue.add(req.body);
    res.json({ message: 'Evaluation added to queue', jobId });
});

/**
 * Call Cerebras AI for deep evaluation
 */
async function callAIEvaluation({ apiKey, useCaseTitle, useCaseObjective, domainChallenge, phase, reqsFormatted, reqsList, githubContext, fileSummary, repoStats }) {

    const prompt = `You are an EXPERT HACKATHON TECHNICAL JUDGE performing a rigorous, file-by-file code audit.

## YOUR TASK
Evaluate this GitHub repository submission for a hackathon. You must act like a HUMAN reviewer who:
- Opens EACH code file and reads it carefully
- Checks if the code actually IMPLEMENTS each requirement (not just mentions keywords)
- Looks for real working logic, not boilerplate or placeholder code
- Differentiates between genuine implementation and AI-generated filler
- Is STRICT but FAIR — partial implementations get partial credit

## HACKATHON CONTEXT
**Use Case:** ${useCaseTitle}
${useCaseObjective ? `**Objective:** ${useCaseObjective}` : ''}
${domainChallenge ? `**Domain Challenge:** ${domainChallenge}` : ''}
**Evaluation Phase:** ${phase}

## REQUIREMENTS TO EVALUATE
${reqsFormatted}

## REPOSITORY STATISTICS
- Total files in repo: ${repoStats.totalFilesInRepo}
- Code files found: ${repoStats.codeFilesFound}
- Files analyzed: ${repoStats.filesAnalyzed}
- File types: ${JSON.stringify(repoStats.filesByType)}

## FILES ANALYZED
${fileSummary}

## SOURCE CODE
${githubContext}

## EVALUATION RULES (CRITICAL — FOLLOW EXACTLY)

### Scoring Guidelines:
- **90-100**: Requirement is FULLY implemented with working code, proper error handling, and good practices
- **70-89**: Requirement is MOSTLY implemented, core logic works but may have gaps
- **50-69**: Requirement is PARTIALLY implemented — some code exists but incomplete or has bugs
- **30-49**: Requirement is BARELY addressed — only boilerplate/skeleton code, no real logic
- **10-29**: Requirement is MENTIONED in comments/README but no actual implementation
- **0-9**: Requirement is completely MISSING from the codebase

### What to check per requirement:
1. Is there actual CODE that implements this? (not just comments or README mentions)
2. Does the logic make sense for the requirement? (e.g., if requirement says "anomaly detection", is there an actual ML model or algorithm?)
3. Are there proper data structures, APIs, or models being used?
4. Is it working code or just placeholder/mock?
5. For Phase 1: focus on architecture and setup. For Phase 2: core implementation. For Phase 3: completeness and polish.

### Code Quality Assessment:
- Code organization and structure
- Proper error handling
- Comments and documentation
- No hardcoded credentials or sensitive data
- Follows language best practices
- Actual functional code vs boilerplate

### Innovation Assessment:
- Creative solutions beyond basic requirements
- Use of advanced techniques or libraries
- User experience considerations
- Scalability and performance thinking

## RESPOND WITH ONLY THIS JSON (no markdown, no explanation outside JSON):
{
  "codeQuality": <0-100>,
  "reqSatisfaction": <0-100>,
  "innovation": <0-100>,
  "totalScore": <0-100>,
  "requirementsMet": <count of requirements scored >= 70>,
  "feedback": "<3-5 sentence summary: what's good, what's missing, what needs improvement. Be specific about FILE NAMES and LINE REFERENCES where possible>",
  "detailedReport": [
    {
      "req": "R1: <requirement text>",
      "status": "Met|Partial|Not Met",
      "score": <0-100>,
      "explanation": "<2-3 sentences explaining what code you found (mention specific files), what it does, and why you gave this score>",
      "filesFound": ["<list of files where you found relevant code>"],
      "mistakes": ["<specific issues or improvements needed>"]
    }
  ]
}

IMPORTANT:
- "totalScore" should be the weighted average: (codeQuality * 0.25) + (reqSatisfaction * 0.50) + (innovation * 0.25)
- "detailedReport" MUST have exactly ${reqsList.length} entries, one per requirement
- Be STRICT. Empty repos = 0. Placeholder code = 10-20. Don't inflate scores.
- Give credit where credit is due. If genuine work is done, score it fairly.`;

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
                        content: 'You are a strict but fair hackathon technical judge. You evaluate code repositories by reading actual source files. You always respond with valid JSON only, no markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 4096,
                temperature: 0.1, // Low temperature for consistent, factual evaluation
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

    // Strategy 3: Find the first { to last }
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
        if (score > 0) score = Math.max(score, 15); // Minimum 15 if any match found

        let status = 'Not Met';
        if (score >= 50) status = 'Partial';
        if (score >= 70) status = 'Met';

        return {
            req: `R${i + 1}: ${typeof req === 'string' ? req : 'Requirement'}`,
            status,
            score,
            explanation: `⚠️ Keyword-based analysis (AI unavailable). Found ${found}/${totalKeywords} keywords${matchedKeywords.length > 0 ? `: ${matchedKeywords.slice(0, 5).join(', ')}` : ''}. ${techFound}/${techKeywords.length} tech patterns detected. This is an approximate score — re-evaluate with AI for accurate results.`,
            filesFound: [],
            mistakes: score < 50 ? ['AI evaluation recommended for accurate assessment'] : [],
        };
    });

    const reqSatisfaction = Math.round(detailedReport.reduce((sum, r) => sum + r.score, 0) / detailedReport.length);
    const requirementsMet = detailedReport.filter(r => r.score >= 70).length;
    const innovation = Math.min(Math.round(qualityScore * 0.5), 40); // Conservative innovation score

    const totalScore = Math.round((qualityScore * 0.25) + (reqSatisfaction * 0.50) + (innovation * 0.25));

    return {
        codeQuality: qualityScore,
        reqSatisfaction,
        innovation,
        totalScore,
        requirementsMet,
        feedback: `⚠️ KEYWORD-BASED EVALUATION (AI was unavailable). Found ${stats.codeFilesFound || 0} code files, analyzed ${stats.filesAnalyzed || 0}. Detected ${requirementsMet}/${reqsList.length} requirements with keyword matches. NOTE: This is an approximate evaluation — please re-run with AI enabled for accurate human-like assessment.`,
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
async function saveEvaluation(submissionId, evaluation, reqsList, fileTree) {
    await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
    await pool.execute(
        `INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback, detailed_report, file_tree)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            JSON.stringify(fileTree || [])
        ]
    );
}

// GET /api/evaluations/status/:jobId
router.get('/status/:jobId', authMiddleware, adminOnly, (req, res) => {
    const job = evaluationQueue.getStatus(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

export default router;
