
import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get support requests (Admin: all, Team: their own)
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const batch = req.query.batch || '2027';
            const [rows] = await pool.execute(`
                SELECT sr.*, t.team_number, t.name as team_name, t.batch
                FROM support_requests sr
                JOIN teams t ON sr.team_id = t.id
                WHERE t.batch = ?
                ORDER BY sr.created_at DESC
            `, [batch]);
            res.json(rows);
        } else {
            const [teamRows] = await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, req.user.batch]);
            if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });

            const [rows] = await pool.execute('SELECT * FROM support_requests WHERE team_id = ? ORDER BY created_at DESC', [teamRows[0].id]);
            res.json(rows);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch support requests' });
    }
});

// Create a support request (Team only)
router.post('/', authMiddleware, async (req, res) => {
    const { category, message } = req.body;
    try {
        const [teamRows] = await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, req.user.batch]);
        if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });

        const [result] = await pool.execute(
            'INSERT INTO support_requests (team_id, category, message, status) VALUES (?, ?, ?, "pending")',
            [teamRows[0].id, category, message]
        );
        res.json({ id: result.insertId, message: 'Support request sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create support request' });
    }
});

// Update support request (Admin only - claim or resolve)
router.put('/:id', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { status, mentor_name } = req.body;
    try {
        const resolvedAt = status === 'resolved' ? new Date() : null;
        await pool.execute(
            'UPDATE support_requests SET status = ?, mentor_name = ?, resolved_at = ? WHERE id = ?',
            [status, mentor_name, resolvedAt, req.params.id]
        );
        res.json({ message: 'Request updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

export default router;
