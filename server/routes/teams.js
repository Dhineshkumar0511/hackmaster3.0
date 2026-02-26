
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/teams
router.get('/', authMiddleware, async (req, res) => {
    try {
        const batch = req.query.batch;
        let query = 'SELECT * FROM teams';
        const params = [];

        if (batch) {
            query += ' WHERE batch = ?';
            params.push(batch);
        } else if (req.user.role === 'team') {
            query += ' WHERE batch = ?';
            params.push(req.user.batch);
        }
        query += ' ORDER BY team_number';

        const [rows] = await pool.execute(query, params);
        res.json(rows.map(t => ({ ...t, members: JSON.parse(t.members || '[]'), mentor: JSON.parse(t.mentor || '{}') })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/teams/:id/details
router.put('/:id/details', authMiddleware, async (req, res) => {
    const { members, mentor } = req.body;
    await pool.execute('UPDATE teams SET members = ?, mentor = ? WHERE id = ?', [JSON.stringify(members), JSON.stringify(mentor), req.params.id]);
    res.json({ message: 'Updated' });
});

// PUT /api/teams/:id/usecase
router.put('/:id/usecase', authMiddleware, adminOnly, async (req, res) => {
    await pool.execute('UPDATE teams SET use_case_id = ? WHERE id = ?', [req.body.useCaseId, req.params.id]);
    res.json({ message: 'Assigned' });
});

export default router;
