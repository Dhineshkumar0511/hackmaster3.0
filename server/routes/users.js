
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

// Helper: delete all data for given team IDs
async function cascadeDeleteTeams(teamIds) {
    if (!teamIds.length) return;
    const placeholders = teamIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM evaluation_results WHERE team_id IN (${placeholders})`, teamIds);
    await pool.execute(`DELETE FROM submissions WHERE team_id IN (${placeholders})`, teamIds);
    await pool.execute(`DELETE FROM mentor_marks WHERE team_id IN (${placeholders})`, teamIds);
    await pool.execute(`DELETE FROM team_tasks WHERE team_id IN (${placeholders})`, teamIds);
    await pool.execute(`DELETE FROM support_requests WHERE team_id IN (${placeholders})`, teamIds);
    await pool.execute(`DELETE FROM teams WHERE id IN (${placeholders})`, teamIds);
}

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Find the user's team_number and batch first
        const [userRows] = await pool.execute('SELECT team_number, batch, role FROM users WHERE id = ?', [req.params.id]);
        await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);

        // If it was a team user, check if no other users share that team — then delete team data
        if (userRows.length && userRows[0].role === 'team' && userRows[0].team_number) {
            const { team_number, batch } = userRows[0];
            const [remaining] = await pool.execute(
                'SELECT id FROM users WHERE team_number = ? AND batch = ? AND role = "team"',
                [team_number, batch]
            );
            if (remaining.length === 0) {
                const [teamRows] = await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [team_number, batch]);
                const teamIds = teamRows.map(r => r.id);
                await cascadeDeleteTeams(teamIds);
            }
        }

        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/users/batch/:batch
router.delete('/batch/:batch', authMiddleware, adminOnly, async (req, res) => {
    try {
        const batch = req.params.batch;
        if (batch === 'all') {
            // Delete all team-related data first, then users
            const [allTeams] = await pool.execute('SELECT id FROM teams');
            const teamIds = allTeams.map(r => r.id);
            await cascadeDeleteTeams(teamIds);
            await pool.execute('DELETE FROM users WHERE role != "admin"');
            return res.json({ message: 'All student identities purged' });
        }
        // Delete all team data for this batch first
        const [batchTeams] = await pool.execute('SELECT id FROM teams WHERE batch = ?', [batch]);
        const teamIds = batchTeams.map(r => r.id);
        await cascadeDeleteTeams(teamIds);
        // Then delete users
        await pool.execute('DELETE FROM users WHERE batch = ? AND role != "admin"', [batch]);
        res.json({ message: `Users from batch ${batch} deleted` });
    } catch (err) {
        console.error('Batch delete error:', err);
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
