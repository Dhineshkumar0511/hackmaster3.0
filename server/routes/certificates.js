
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/certificates - Admin: all for batch, Team: their own
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const batch = req.query.batch || '2027';
            const [rows] = await pool.execute(`
                SELECT c.*, t.team_number, t.name as team_name, t.batch, t.members
                FROM certificates c
                JOIN teams t ON c.team_id = t.id
                WHERE t.batch = ?
            `, [batch]);
            res.json(rows.map(r => ({ ...r, members: JSON.parse(r.members || '[]') })));
        } else {
            const [teamRows] = await pool.execute('SELECT id, team_number, name, members, batch FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, req.user.batch]);
            if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });

            const [rows] = await pool.execute('SELECT * FROM certificates WHERE team_id = ?', [teamRows[0].id]);
            res.json(rows.map(r => ({
                ...r,
                team_number: teamRows[0].team_number,
                team_name: teamRows[0].name,
                members: JSON.parse(teamRows[0].members || '[]'),
                batch: teamRows[0].batch
            })));
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/certificates - Admin Only
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const { teamId, type } = req.body;
    try {
        await pool.execute(
            'INSERT INTO certificates (team_id, type) VALUES (?, ?) ON DUPLICATE KEY UPDATE type = VALUES(type)',
            [teamId, type]
        );
        res.json({ message: 'Certificate issued' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to issue certificate' });
    }
});

// DELETE /api/certificates/:id - Admin Only
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await pool.execute('DELETE FROM certificates WHERE id = ?', [req.params.id]);
        res.json({ message: 'Certificate removed' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
