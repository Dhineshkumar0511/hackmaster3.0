
import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users
router.get('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, username, role, team_number, team_name, batch, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/users (Add Single)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const { username, password, role, teamNumber, teamName, batch } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO users (username, password, role, team_number, team_name, batch) VALUES (?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, role, teamNumber || null, teamName || null, batch || '2027']
        );

        // If it's a team, also ensure a team entry exists
        if (role === 'team' && teamNumber) {
            const [existingTeam] = await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [teamNumber, batch || '2027']);
            if (existingTeam.length === 0) {
                await pool.execute(
                    'INSERT INTO teams (team_number, name, batch) VALUES (?, ?, ?)',
                    [teamNumber, teamName || `Team ${teamNumber}`, batch || '2027']
                );
            }
        }

        res.json({ id: result.insertId, message: 'User added successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/users/bulk
router.post('/bulk', authMiddleware, adminOnly, async (req, res) => {
    const { users } = req.body; // Array of objects
    const results = { success: 0, fail: 0, errors: [] };

    for (const user of users) {
        try {
            const hashedPassword = bcrypt.hashSync(user.password || 'password123', 10);
            await pool.execute(
                'INSERT INTO users (username, password, role, team_number, team_name, batch) VALUES (?, ?, ?, ?, ?, ?)',
                [user.username, hashedPassword, user.role || 'team', user.teamNumber || null, user.teamName || null, user.batch || '2027']
            );

            if (user.role === 'team' && user.teamNumber) {
                const [existingTeam] = await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [user.teamNumber, user.batch || '2027']);
                if (existingTeam.length === 0) {
                    await pool.execute(
                        'INSERT INTO teams (team_number, name, batch) VALUES (?, ?, ?)',
                        [user.teamNumber, user.teamName || `Team ${user.teamNumber}`, user.batch || '2027']
                    );
                }
            }
            results.success++;
        } catch (err) {
            results.fail++;
            results.errors.push(`${user.username}: ${err.message}`);
        }
    }
    res.json(results);
});

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/users/batch/:batch
router.delete('/batch/:batch', authMiddleware, adminOnly, async (req, res) => {
    try {
        const batch = req.params.batch;
        if (batch === 'all') {
            await pool.execute('DELETE FROM users WHERE role != "admin"');
            return res.json({ message: 'All student identities purged' });
        }
        // Protect admins from bulk deletion
        await pool.execute('DELETE FROM users WHERE batch = ? AND role != "admin"', [batch]);
        res.json({ message: `Users from batch ${batch} deleted` });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/users/:id (Update)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    const { username, password, role, teamNumber, teamName, batch } = req.body;
    try {
        let query = 'UPDATE users SET username = ?, role = ?, team_number = ?, team_name = ?, batch = ?';
        const params = [username, role, teamNumber, teamName, batch];

        if (password) {
            query += ', password = ?';
            params.push(bcrypt.hashSync(password, 10));
        }

        query += ' WHERE id = ?';
        params.push(req.params.id);

        await pool.execute(query, params);
        res.json({ message: 'User updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
