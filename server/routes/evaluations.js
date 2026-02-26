
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { evaluationQueue } from '../utils/queue.js';
import { fetchGithubRepoContent } from '../utils/github.js';

const router = express.Router();

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
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/evaluate', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, useCaseTitle, requirementText, githubUrl, phase, allRequirements } = req.body;
    const jobId = evaluationQueue.add({ submissionId, useCaseTitle, requirementText, githubUrl, phase, allRequirements });

    res.json({ message: 'Evaluation started in background', jobId });

    // Background Worker
    (async () => {
        const job = evaluationQueue.getStatus(jobId);
        job.status = 'processing';
        try {
            const githubData = await fetchGithubRepoContent(githubUrl);
            const reqsList = Array.isArray(allRequirements) ? allRequirements : [requirementText];
            const reqsFormatted = reqsList.map((r, i) => `R${i + 1}: ${typeof r === 'string' ? r : 'Requirement'}`).join('\n');
            const apiKey = process.env.CEREBRAS_API_KEY;

            let evaluation;
            if (apiKey) {
                const prompt = `You are a STRICT technical auditor. 
USE CASE: ${useCaseTitle}
PHASE: ${phase}
REQUIREMENTS:
${reqsFormatted}

CODE:
${githubData.fullContext}

Respond ONLY with JSON:
{
  "codeQuality": <0-100>,
  "reqSatisfaction": <0-100>,
  "innovation": <0-100>,
  "totalScore": <0-100>,
  "requirementsMet": <count>,
  "feedback": "3-5 sentences",
  "detailedReport": [{"req": "text", "status": "Met|Partial|Not Met", "score": 0-100, "explanation": "..."}]
}`;

                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b',
                        messages: [{ role: 'user', content: prompt }],
                        response_format: { type: 'json_object' }
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    evaluation = JSON.parse(data.choices[0].message.content);
                }
            }

            if (!evaluation) {
                evaluation = {
                    codeQuality: 40, reqSatisfaction: 30, innovation: 0, totalScore: 35,
                    requirementsMet: 0, feedback: 'AI evaluation failed or skipped.', detailedReport: []
                };
            }

            await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
            await pool.execute(
                `INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback, detailed_report, file_tree)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [submissionId, evaluation.codeQuality, evaluation.reqSatisfaction, evaluation.innovation, evaluation.totalScore, evaluation.requirementsMet, reqsList.length, evaluation.feedback, JSON.stringify(evaluation.detailedReport), JSON.stringify(githubData.fileTree)]
            );

            job.status = 'completed';
            job.result = evaluation;
        } catch (err) {
            console.error('Job failed:', err);
            job.status = 'failed';
            job.error = err.message;
        }
    })();
});

router.get('/status/:jobId', authMiddleware, adminOnly, (req, res) => {
    const job = evaluationQueue.getStatus(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

export default router;
