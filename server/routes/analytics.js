
import express from 'express';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const batch = req.query.batch || '2027';

        const [avgRows] = await pool.execute(`
            SELECT AVG(code_quality) as avgQuality, AVG(req_satisfaction) as avgSatisfaction, AVG(innovation) as avgInnovation, AVG(total_score) as avgTotal
            FROM evaluation_results er JOIN submissions s ON er.submission_id = s.id JOIN teams t ON s.team_id = t.id WHERE t.batch = ?
        `, [batch]);

        const [distRows] = await pool.execute(`
            SELECT CASE WHEN total_score >= 80 THEN '80-100' WHEN total_score >= 60 THEN '60-79' WHEN total_score >= 40 THEN '40-59' ELSE '0-39' END as scoreRange, COUNT(*) as count
            FROM evaluation_results er JOIN submissions s ON er.submission_id = s.id JOIN teams t ON s.team_id = t.id WHERE t.batch = ? GROUP BY scoreRange
        `, [batch]);

        const [mistakeRows] = await pool.execute(`
            SELECT feedback FROM evaluation_results er JOIN submissions s ON er.submission_id = s.id JOIN teams t ON s.team_id = t.id WHERE t.batch = ?
        `, [batch]);

        const keywords = ['logic', 'error', 'style', 'security', 'api', 'database', 'performance', 'ui', 'ux', 'validation'];
        const commonKeywords = keywords.map(kw => ({
            name: kw.charAt(0).toUpperCase() + kw.slice(1),
            count: mistakeRows.filter(r => r.feedback?.toLowerCase().includes(kw)).length
        })).filter(k => k.count > 0).sort((a, b) => b.count - a.count);

        res.json({ averages: avgRows[0], distribution: distRows, commonMistakes: commonKeywords });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
