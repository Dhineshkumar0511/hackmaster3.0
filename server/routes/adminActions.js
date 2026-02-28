
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { forgeAudit, cleanupForge } from '../utils/forge.js';

const router = express.Router();

// Trigger Forge Technical Audit
router.post('/forge/verify', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, githubUrl } = req.body;

    try {
        const audit = await forgeAudit(githubUrl, submissionId);

        if (audit.success) {
            // Log audit to feedback or store it?
            // Let's just return to the UI for now.
            res.json(audit);
        } else {
            res.status(500).json({ error: audit.error, message: audit.message });
        }
    } catch (err) {
        console.error('Forge Audit Error:', err);
        res.status(500).json({ error: 'Forge failure: ' + err.message });
    }
});

// Admin Manual Override Score
router.post('/override', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, score, feedback, forgeLogs } = req.body;

    try {
        // First try to update existing record
        const [existingEval] = await pool.execute(
            'SELECT id FROM evaluation_results WHERE submission_id = ?',
            [submissionId]
        );

        if (existingEval.length > 0) {
            // Update existing evaluation result
            await pool.execute(
                `UPDATE evaluation_results 
                 SET total_score = ?, 
                     feedback = CONCAT(?, '\n\n(Note: This score was MANUALLY VERIFIED by Admin)'),
                     forge_logs = ?
                 WHERE submission_id = ?`,
                [score, feedback, JSON.stringify(forgeLogs || []), submissionId]
            );
        } else {
            // Create new evaluation result if it doesn't exist
            const [[submission]] = await pool.execute(
                'SELECT team_id FROM submissions WHERE id = ?',
                [submissionId]
            );
            
            await pool.execute(
                `INSERT INTO evaluation_results (submission_id, team_id, total_score, feedback, forge_logs)
                 VALUES (?, ?, ?, CONCAT(?, '\n\n(Note: This score was MANUALLY VERIFIED by Admin)'), ?)`,
                [submissionId, submission?.team_id || null, score, feedback, JSON.stringify(forgeLogs || [])]
            );
        }

        // Clean up forge directory
        await cleanupForge(submissionId);

        res.json({ success: true, message: 'Score updated and human-verified' });
    } catch (err) {
        console.error('Score Override Error:', err);
        res.status(500).json({ error: 'Failed to update score: ' + err.message });
    }
});

export default router;
