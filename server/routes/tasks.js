
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();


router.get('/all', authMiddleware, adminOnly, async (req, res) => {
    try {
        const batch = req.query.batch || '2027';
        const [rows] = await pool.execute(`
            SELECT tt.*, t.team_number, t.name as team_name 
            FROM team_tasks tt 
            JOIN teams t ON tt.team_id = t.id 
            WHERE t.batch = ? 
            ORDER BY tt.created_at DESC
        `, [batch]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const teamId = req.user.role === 'admin' ? req.query.teamId : (await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, req.user.batch]))[0][0]?.id;
        if (!teamId) return res.status(404).json({ error: 'Team not found' });

        const [rows] = await pool.execute('SELECT * FROM team_tasks WHERE team_id = ? ORDER BY created_at DESC', [teamId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const { title, priority, assignedTo, teamId } = req.body;
    try {
        let assignedTeamId = teamId;

        if (req.user.role === 'admin') {
            if (!assignedTeamId) return res.status(400).json({ error: 'Admin must specify teamId' });
        } else {
            const [teamRows] = await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, req.user.batch]);
            if (teamRows.length === 0) return res.status(404).json({ error: 'Team record not found for your account' });
            assignedTeamId = teamRows[0].id;
        }

        const [result] = await pool.execute(
            'INSERT INTO team_tasks (team_id, title, priority, assigned_to, status) VALUES (?, ?, ?, ?, ?)',
            [assignedTeamId, title, priority || 'medium', assignedTo || '', 'todo']
        );
        res.json({ id: result.insertId, message: 'Task created successfully' });
    } catch (err) {
        console.error('Task Creation Error:', err);
        res.status(500).json({ error: 'Failed to create task in database' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    const { status, priority, title, assigned_to } = req.body;
    try {
        await pool.execute(
            'UPDATE team_tasks SET status = ?, priority = ?, title = ?, assigned_to = ? WHERE id = ?',
            [status, priority, title, assigned_to, req.params.id]
        );
        res.json({ message: 'Task updated' });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    await pool.execute('DELETE FROM team_tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
});

export default router;
