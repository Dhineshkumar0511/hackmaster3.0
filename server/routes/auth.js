
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hackmaster_secret_2026';

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = rows[0];
        if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({
            id: user.id, username: user.username, role: user.role,
            teamNumber: user.team_number, teamName: user.team_name, batch: user.batch
        }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ token, user: { id: user.id, username: user.username, role: user.role, teamNumber: user.team_number, teamName: user.team_name, batch: user.batch } });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/me', authMiddleware, (req, res) => res.json({ user: req.user }));

router.post('/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0 || !bcrypt.compareSync(currentPassword, rows[0].password)) return res.status(401).json({ error: 'Current password incorrect' });

        await pool.execute('UPDATE users SET password = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), req.user.id]);
        res.json({ message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
