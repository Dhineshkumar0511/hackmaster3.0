
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/mentor-marks
router.get('/', authMiddleware, async (req, res) => {
    try {
        const batch = req.query.batch;
        let query = 'SELECT mm.* FROM mentor_marks mm JOIN teams t ON mm.team_id = t.id';
        const params = [];

        if (req.user.role === 'team') {
            query += ' WHERE t.id = ?';
            params.push(req.user.teamId || (await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, req.user.batch]))[0][0]?.id);
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

// POST /api/mentor-marks
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const data = req.body;
    const teamId = data.teamId;
    delete data.teamId;

    const keys = Object.keys(data);
    const values = Object.values(data);

    // Simple update logic
    const updateStr = keys.map(k => `${k} = ?`).join(', ');
    await pool.execute(`INSERT INTO mentor_marks (team_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updateStr}`, [teamId, ...values, ...values]);

    res.json({ message: 'Marks updated' });
});

export default router;
