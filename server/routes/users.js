
import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Helper: Remove all orphaned teams (teams with no corresponding users)
export async function cleanOrphanedTeams(batchFilter) {
    let orphanQuery = `
        SELECT t.id FROM teams t
        LEFT JOIN users u ON u.team_number = t.team_number AND u.batch = t.batch AND u.role = 'team'
        WHERE u.id IS NULL
    `;
    const params = [];
    if (batchFilter && batchFilter !== 'all') {
        orphanQuery += ' AND t.batch = ?';
        params.push(batchFilter);
    }
    const [orphans] = await pool.execute(orphanQuery, params);
    if (orphans.length === 0) return 0;

    const ids = orphans.map(t => t.id);
    const ph = ids.map(() => '?').join(',');
    // Delete in FK-safe order
    await pool.execute(`DELETE FROM evaluation_results WHERE team_id IN (${ph})`, ids);
    await pool.execute(`DELETE FROM submissions WHERE team_id IN (${ph})`, ids);
    await pool.execute(`DELETE FROM mentor_marks WHERE team_id IN (${ph})`, ids);
    await pool.execute(`DELETE FROM team_tasks WHERE team_id IN (${ph})`, ids);
    await pool.execute(`DELETE FROM support_requests WHERE team_id IN (${ph})`, ids);
    await pool.execute(`DELETE FROM certificates WHERE team_id IN (${ph})`, ids);
    await pool.execute(`DELETE FROM teams WHERE id IN (${ph})`, ids);
    return ids.length;
}

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
        // Get the user's team info before deleting
        const [userRows] = await pool.execute('SELECT team_number, batch, role FROM users WHERE id = ?', [req.params.id]);
        const user = userRows[0];

        await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);

        // If user had a team, check if any other users remain in that team
        if (user && user.role === 'team' && user.team_number) {
            const [remaining] = await pool.execute(
                'SELECT id FROM users WHERE team_number = ? AND batch = ? AND role = "team"',
                [user.team_number, user.batch]
            );

            // No users left in this team — cascade delete all team data
            if (remaining.length === 0) {
                const [teamRows] = await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [user.team_number, user.batch]);
                if (teamRows.length > 0) {
                    const teamId = teamRows[0].id;
                    // Delete in FK-safe order
                    await pool.execute('DELETE FROM evaluation_results WHERE team_id = ?', [teamId]);
                    await pool.execute('DELETE FROM submissions WHERE team_id = ?', [teamId]);
                    await pool.execute('DELETE FROM mentor_marks WHERE team_id = ?', [teamId]);
                    await pool.execute('DELETE FROM team_tasks WHERE team_id = ?', [teamId]);
                    await pool.execute('DELETE FROM support_requests WHERE team_id = ?', [teamId]);
                    await pool.execute('DELETE FROM certificates WHERE team_id = ?', [teamId]);
                    await pool.execute('DELETE FROM teams WHERE id = ?', [teamId]);
                }
            }
        }

        // Also clean any other orphaned teams
        await cleanOrphanedTeams();

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
            // Delete all non-admin users
            await pool.execute('DELETE FROM users WHERE role != "admin"');

            // Cascade delete ALL team data (all batches)
            await pool.execute('DELETE FROM evaluation_results WHERE team_id IN (SELECT id FROM teams)');
            await pool.execute('DELETE FROM submissions WHERE team_id IN (SELECT id FROM teams)');
            await pool.execute('DELETE FROM mentor_marks WHERE team_id IN (SELECT id FROM teams)');
            await pool.execute('DELETE FROM team_tasks WHERE team_id IN (SELECT id FROM teams)');
            await pool.execute('DELETE FROM support_requests WHERE team_id IN (SELECT id FROM teams)');
            await pool.execute('DELETE FROM certificates WHERE team_id IN (SELECT id FROM teams)');
            await pool.execute('DELETE FROM teams');

            // Clean any remaining orphans
            await cleanOrphanedTeams();

            return res.json({ message: 'All student identities purged' });
        }

        // Protect admins from bulk deletion
        await pool.execute('DELETE FROM users WHERE batch = ? AND role != "admin"', [batch]);

        // Cascade delete team data for this batch
        const [batchTeams] = await pool.execute('SELECT id FROM teams WHERE batch = ?', [batch]);
        if (batchTeams.length > 0) {
            const teamIds = batchTeams.map(t => t.id);
            const placeholders = teamIds.map(() => '?').join(',');
            await pool.execute(`DELETE FROM evaluation_results WHERE team_id IN (${placeholders})`, teamIds);
            await pool.execute(`DELETE FROM submissions WHERE team_id IN (${placeholders})`, teamIds);
            await pool.execute(`DELETE FROM mentor_marks WHERE team_id IN (${placeholders})`, teamIds);
            await pool.execute(`DELETE FROM team_tasks WHERE team_id IN (${placeholders})`, teamIds);
            await pool.execute(`DELETE FROM support_requests WHERE team_id IN (${placeholders})`, teamIds);
            await pool.execute(`DELETE FROM certificates WHERE team_id IN (${placeholders})`, teamIds);
            await pool.execute(`DELETE FROM teams WHERE batch = ?`, [batch]);
        }

        // Also clean any orphaned teams across all batches
        await cleanOrphanedTeams();

        res.json({ message: `Users from batch ${batch} deleted` });
    } catch (err) {
        console.error('Batch delete error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/users/cleanup - Remove orphaned teams with no users
router.post('/cleanup', authMiddleware, adminOnly, async (req, res) => {
    try {
        const cleaned = await cleanOrphanedTeams();
        res.json({ message: `Cleaned ${cleaned} orphaned team(s) and all related data` });
    } catch (err) {
        console.error('Cleanup error:', err);
        res.status(500).json({ error: 'Cleanup failed' });
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
