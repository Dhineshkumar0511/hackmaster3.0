
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
});

router.put('/unlocked-requirements', authMiddleware, adminOnly, async (req, res) => {
    const { count } = req.body;
    await pool.execute("INSERT INTO settings (`key`, value) VALUES ('unlocked_requirements', ?) ON DUPLICATE KEY UPDATE value = ?", [String(count), String(count)]);
    res.json({ unlocked_requirements: count });
});

export default router;
