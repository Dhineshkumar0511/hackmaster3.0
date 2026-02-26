
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/submissions
router.get('/', authMiddleware, async (req, res) => {
    try {
        const batch = req.query.batch;
        let query = 'SELECT * FROM submissions';
        const params = [];

        if (req.user.role === 'team') {
            query += ' WHERE team_number = ? AND batch = ?';
            params.push(req.user.teamNumber, req.user.batch);
        } else if (batch) {
            query += ' WHERE batch = ?';
            params.push(batch);
        }
        query += ' ORDER BY timestamp DESC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/submissions
router.post('/', authMiddleware, async (req, res) => {
    const { phase, requirementNumber, githubUrl } = req.body;
    try {
        const [teamRows] = await pool.execute('SELECT id, name FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, req.user.batch]);
        if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });

        await pool.execute(
            'INSERT INTO submissions (team_id, team_number, team_name, batch, phase, requirement_number, github_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [teamRows[0].id, req.user.teamNumber, req.user.teamName, req.user.batch, phase, requirementNumber, githubUrl]
        );
        res.json({ message: 'Submitted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/submissions/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM submissions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
});

// DELETE /api/submissions (Batch or Team)
router.delete('/', authMiddleware, adminOnly, async (req, res) => {
    const { batch, teamId } = req.query;
    if (batch) {
        await pool.execute('DELETE er FROM evaluation_results er JOIN submissions s ON er.submission_id = s.id JOIN teams t ON s.team_id = t.id WHERE t.batch = ?', [batch]);
        await pool.execute('DELETE s FROM submissions s JOIN teams t ON s.team_id = t.id WHERE t.batch = ?', [batch]);
    } else if (teamId) {
        await pool.execute('DELETE FROM evaluation_results WHERE submission_id IN (SELECT id FROM submissions WHERE team_id = ?)', [teamId]);
        await pool.execute('DELETE FROM submissions WHERE team_id = ?', [teamId]);
    }
    res.json({ message: 'Deleted' });
});

export default router;
