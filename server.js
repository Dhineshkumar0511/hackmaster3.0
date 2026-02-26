
/**
 * 🚀 HACKMASTER 3.0 — REFACTORED CORE
 * Express + TiDB Cloud | SMVEC AI & DS Dept
 */
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import pool from './server/db.js';

// Initialization
import { initDb } from './server/utils/dbInit.js';
import { seedInitialData } from './server/utils/initialSeed.js';

// Route Imports
import authRoutes from './server/routes/auth.js';
import teamRoutes from './server/routes/teams.js';
import submissionRoutes from './server/routes/submissions.js';
import evaluationRoutes from './server/routes/evaluations.js';
import mentorMarkRoutes from './server/routes/mentorMarks.js';
import taskRoutes from './server/routes/tasks.js';
import analyticsRoutes from './server/routes/analytics.js';
import supportRoutes from './server/routes/support.js';
import settingsRoutes from './server/routes/settings.js';
import certificateRoutes from './server/routes/certificates.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_PATH = join(__dirname, 'dist');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// API Mounting
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/mentor-marks', mentorMarkRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/certificates', certificateRoutes);

// Global Stats & Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const batch = req.query.batch || '2027';
        const [teams] = await pool.execute('SELECT * FROM teams WHERE batch = ?', [batch]);
        const [allMentorMarks] = await pool.execute('SELECT * FROM mentor_marks');
        const [allEvals] = await pool.execute('SELECT e.total_score, s.team_id FROM evaluation_results e JOIN submissions s ON e.submission_id = s.id');

        const mentorMarksMap = {}; allMentorMarks.forEach(m => { mentorMarksMap[m.team_id] = m; });
        const evalsMap = {}; allEvals.forEach(ev => {
            if (!evalsMap[ev.team_id]) evalsMap[ev.team_id] = [];
            evalsMap[ev.team_id].push(ev.total_score);
        });

        const leaderboard = teams.map(team => {
            const teamEvals = evalsMap[team.id] || [];
            const aiScore = teamEvals.length ? Math.round(teamEvals.reduce((a, b) => a + b, 0) / teamEvals.length) : 0;
            const m = mentorMarksMap[team.id] || {};
            const phaseScore = (m.phase1 || 0) + (m.phase2 || 0) + (m.phase3 || 0) + (m.innovation || 0) + (m.presentation || 0) + (m.teamwork || 0);
            const normPhase = Math.round((phaseScore / 60) * 100);
            let reqTotal = 0; for (let i = 1; i <= 10; i++) reqTotal += (m[`req${i}`] || 0);
            return { id: team.id, teamNumber: team.team_number, name: team.name, aiScore, normPhase, reqScore: reqTotal, totalScore: Math.round((aiScore + normPhase + reqTotal) / 3) };
        }).sort((a, b) => b.totalScore - a.totalScore);

        res.json(leaderboard);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Admin Stats
app.get('/api/admin/stats', async (req, res) => {
    const [[{ cnt: totalSubmissions }]] = await pool.execute('SELECT COUNT(*) as cnt FROM submissions');
    const [[{ cnt: evaluatedCount }]] = await pool.execute('SELECT COUNT(*) as cnt FROM evaluation_results');
    res.json({ totalSubmissions, evaluatedCount });
});

// SPA Fallback
if (existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH));
    app.use((req, res) => res.sendFile(join(DIST_PATH, 'index.html')));
}

// Start Server
async function start() {
    await initDb();
    await seedInitialData();
    app.listen(PORT, () => console.log(`🚀 HackMaster running on http://localhost:${PORT}`));
}

start();
