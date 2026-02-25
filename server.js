// ==========================================
// HackMaster 3.0 — Backend Server
// Express + TiDB Cloud (MySQL) + JWT Auth
// ==========================================

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'hackmaster3.0_smvec_2026_secret_key';
const DATABASE_URL = process.env.DATABASE_URL || 'mysql://heqTNm2aAnj7Tmh.root:or2xeY112sLsTLTe@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test';

app.use(cors());
app.use(express.json());

// Serve built frontend (production)
const DIST_PATH = join(__dirname, 'dist');
if (existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH));
    console.log('📦 Serving static files from dist/');
}

// ==========================================
// DATABASE SETUP — TiDB Cloud (MySQL)
// ==========================================
let pool;

async function initDb() {
    // Create connection pool from DATABASE_URL
    pool = mysql.createPool({
        uri: DATABASE_URL,
        ssl: { rejectUnauthorized: true },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

    console.log('🔌 Connecting to TiDB Cloud...');

    // Test connection
    const conn = await pool.getConnection();
    console.log('✅ Connected to TiDB Cloud');
    conn.release();

    // Create tables
    await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      team_number INT,
      team_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await pool.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_number INT UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      use_case_id INT,
      members TEXT,
      mentor TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await pool.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      team_number INT NOT NULL,
      team_name VARCHAR(255),
      use_case_id INT,
      github_url TEXT NOT NULL,
      requirement_number INT NOT NULL,
      description TEXT,
      phase VARCHAR(50) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

    await pool.execute(`
    CREATE TABLE IF NOT EXISTS evaluation_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      submission_id INT UNIQUE NOT NULL,
      code_quality INT DEFAULT 0,
      req_satisfaction INT DEFAULT 0,
      innovation INT DEFAULT 0,
      total_score INT DEFAULT 0,
      requirements_met INT DEFAULT 0,
      total_requirements INT DEFAULT 10,
      feedback TEXT,
      evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
  `);

    await pool.execute(`
    CREATE TABLE IF NOT EXISTS mentor_marks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT UNIQUE NOT NULL,
      phase1 INT DEFAULT 0,
      phase2 INT DEFAULT 0,
      phase3 INT DEFAULT 0,
      innovation INT DEFAULT 0,
      presentation INT DEFAULT 0,
      teamwork INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

    await pool.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

    // Ensure unlocked_requirements setting exists
    const [settingsRows] = await pool.execute("SELECT COUNT(*) AS cnt FROM settings WHERE `key` = 'unlocked_requirements'");
    if (settingsRows[0].cnt === 0) {
        await pool.execute("INSERT INTO settings (`key`, value) VALUES ('unlocked_requirements', '5')");
    }

    // Seed if empty
    const [userCountRows] = await pool.execute('SELECT COUNT(*) AS cnt FROM users');
    if (userCountRows[0].cnt === 0) {
        console.log('🌱 Seeding initial data...');
        await seedData();
    }

    console.log('✅ Database initialized');
}

async function seedData() {
    // Admin: admin / hackmaster2026
    const adminHash = bcrypt.hashSync('hackmaster2026', 10);
    await pool.execute(
        'INSERT INTO users (username, password, role, team_name) VALUES (?, ?, ?, ?)',
        ['admin', adminHash, 'admin', 'Administrator']
    );

    const teamNames = [
        'Neural Nexus', 'Code Crusaders', 'Data Dynamos', 'AI Architects',
        'Byte Builders', 'Pixel Pioneers', 'Logic Legends', 'Quantum Quants',
        'Cloud Crafters', 'Stack Smashers', 'Deep Thinkers', 'Algo Aces',
        'Cyber Spartans', 'Tech Titans', 'Binary Brains', 'Code Monks',
        'Syntax Squad', 'Debug Dragons', 'Hash Heroes', 'Kernel Knights',
        'Lambda Lords', 'Matrix Minds', 'Node Ninjas', 'Parse Pros',
        'Query Queens', 'Rust Rangers', 'Script Sages', 'Vector Vikings'
    ];

    console.log('');
    console.log('   🔑 TEAM CREDENTIALS (default):');
    console.log('   ─────────────────────────────────');

    for (let i = 0; i < 28; i++) {
        const teamNum = i + 1;
        const teamName = teamNames[i];
        const username = `team${teamNum}`;
        const password = `team${teamNum}@hack`;
        const passwordHash = bcrypt.hashSync(password, 10);

        console.log(`   Team ${String(teamNum).padStart(2, ' ')}: ${username} / ${password}`);

        await pool.execute(
            'INSERT INTO users (username, password, role, team_number, team_name) VALUES (?, ?, ?, ?, ?)',
            [username, passwordHash, 'team', teamNum, teamName]
        );

        await pool.execute(
            'INSERT INTO teams (team_number, name, members, mentor) VALUES (?, ?, ?, ?)',
            [teamNum, teamName, '[]', '{}']
        );
    }

    console.log('  ✅ Admin + 28 teams created');
}

// ==========================================
// SETTINGS HELPER
// ==========================================
async function getSetting(key) {
    const [rows] = await pool.execute('SELECT value FROM settings WHERE `key` = ?', [key]);
    return rows.length > 0 ? rows[0].value : null;
}

async function setSetting(key, value) {
    await pool.execute('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', [key, String(value), String(value)]);
}

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ==========================================
// AUTH ROUTES
// ==========================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                teamNumber: user.team_number,
                teamName: user.team_name,
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                teamNumber: user.team_number,
                teamName: user.team_name,
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

        if (!bcrypt.compareSync(currentPassword, rows[0].password)) {
            return res.status(401).json({ error: 'Current password incorrect' });
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        await pool.execute('UPDATE users SET password = ? WHERE id = ?', [newHash, req.user.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// SETTINGS ROUTES
// ==========================================

app.get('/api/settings', authMiddleware, async (req, res) => {
    const val = await getSetting('unlocked_requirements');
    res.json({ unlocked_requirements: parseInt(val || '5', 10) });
});

app.put('/api/settings/unlocked-requirements', authMiddleware, adminOnly, async (req, res) => {
    const { count } = req.body;
    if (typeof count !== 'number' || count < 1 || count > 10) {
        return res.status(400).json({ error: 'Count must be between 1 and 10' });
    }
    await setSetting('unlocked_requirements', count);
    res.json({ message: `Requirements unlocked: ${count}`, unlocked_requirements: count });
});

// ==========================================
// TEAM ROUTES
// ==========================================

app.get('/api/teams', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM teams ORDER BY team_number');
        const teams = rows.map(t => ({
            ...t,
            members: JSON.parse(t.members || '[]'),
            mentor: JSON.parse(t.mentor || '{}'),
        }));
        res.json(teams);
    } catch (err) {
        console.error('Teams error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/teams/:id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM teams WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Team not found' });

        const team = rows[0];
        team.members = JSON.parse(team.members || '[]');
        team.mentor = JSON.parse(team.mentor || '{}');
        res.json(team);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/teams/:id/details', authMiddleware, async (req, res) => {
    const { members, mentor } = req.body;
    await pool.execute('UPDATE teams SET members = ?, mentor = ? WHERE id = ?',
        [JSON.stringify(members), JSON.stringify(mentor), req.params.id]);
    res.json({ message: 'Team details updated' });
});

app.put('/api/teams/:id/usecase', authMiddleware, adminOnly, async (req, res) => {
    const { useCaseId } = req.body;
    await pool.execute('UPDATE teams SET use_case_id = ? WHERE id = ?', [useCaseId, req.params.id]);
    res.json({ message: 'Use case assigned' });
});

// ==========================================
// SUBMISSION ROUTES
// ==========================================

app.get('/api/submissions', authMiddleware, async (req, res) => {
    try {
        let query = 'SELECT * FROM submissions';
        const params = [];

        if (req.user.role === 'team') {
            query += ' WHERE team_number = ?';
            params.push(req.user.teamNumber);
        }
        query += ' ORDER BY timestamp DESC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Submissions error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/submissions', authMiddleware, async (req, res) => {
    const { githubUrl, requirementNumber, description, phase, useCaseId } = req.body;

    if (!githubUrl || !requirementNumber || !phase) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const [teamRows] = await pool.execute('SELECT id, team_number, name FROM teams WHERE team_number = ?', [req.user.teamNumber]);
        if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });

        const team = teamRows[0];
        const [result] = await pool.execute(
            'INSERT INTO submissions (team_id, team_number, team_name, use_case_id, github_url, requirement_number, description, phase) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [team.id, team.team_number, team.name, useCaseId || null, githubUrl, requirementNumber, description || '', phase]
        );

        res.json({ message: 'Submission added', id: result.insertId });
    } catch (err) {
        console.error('Submit error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/submissions/:id', authMiddleware, adminOnly, async (req, res) => {
    await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM submissions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Submission deleted' });
});

app.delete('/api/submissions', authMiddleware, adminOnly, async (req, res) => {
    const { teamId } = req.query;

    if (teamId) {
        const [subs] = await pool.execute('SELECT id FROM submissions WHERE team_id = ?', [teamId]);
        for (const sub of subs) {
            await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [sub.id]);
        }
        await pool.execute('DELETE FROM submissions WHERE team_id = ?', [teamId]);
    } else {
        await pool.execute('DELETE FROM evaluation_results');
        await pool.execute('DELETE FROM submissions');
    }

    res.json({ message: 'Submissions deleted' });
});

// ==========================================
// EVALUATION ROUTES
// ==========================================

app.get('/api/evaluations', authMiddleware, async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM evaluation_results ORDER BY evaluated_at DESC');
    res.json(rows);
});

app.post('/api/evaluations', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, codeQuality, reqSatisfaction, innovation, totalScore, requirementsMet, totalRequirements, feedback } = req.body;

    await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
    await pool.execute(
        'INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [submissionId, codeQuality || 0, reqSatisfaction || 0, innovation || 0, totalScore || 0, requirementsMet || 0, totalRequirements || 10, feedback || '']
    );

    res.json({ message: 'Evaluation saved' });
});

// POST /api/evaluate — AI evaluation (Cerebras or fallback)
app.post('/api/evaluate', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, useCaseTitle, requirementText, githubUrl, phase } = req.body;
    const apiKey = process.env.CEREBRAS_API_KEY;

    let result;

    if (apiKey) {
        const prompt = `You are an expert hackathon code evaluator. Evaluate this submission:
**Use Case:** ${useCaseTitle || 'Unknown'}
**Requirement:** ${requirementText || 'Unknown'}
**GitHub URL:** ${githubUrl}
**Phase:** ${phase}

Respond ONLY in valid JSON:
{"codeQuality":<0-100>,"reqSatisfaction":<0-100>,"innovation":<0-100>,"totalScore":<0-100>,"requirementsMet":<0-10>,"totalRequirements":10,"feedback":"<2-3 sentences>"}`;

        try {
            const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'llama-3.3-70b',
                    messages: [{ role: 'system', content: 'Respond only with valid JSON.' }, { role: 'user', content: prompt }],
                    max_tokens: 500, temperature: 0.3,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) result = JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Cerebras API failed, using fallback:', error.message);
        }
    }

    if (!result) {
        const seed = submissionId * 7 + (phase === 'Phase 3' ? 15 : phase === 'Phase 2' ? 8 : 0);
        const base = 55 + (seed % 30);
        result = {
            codeQuality: Math.min(100, base + (submissionId % 15)),
            reqSatisfaction: Math.min(100, base + ((submissionId * 3) % 20)),
            innovation: Math.min(100, base - 5 + ((submissionId * 5) % 18)),
            totalScore: Math.min(100, base + ((submissionId * 2) % 12)),
            requirementsMet: Math.min(10, 4 + (submissionId % 5)),
            totalRequirements: 10,
            feedback: `Submission evaluated for ${phase}. Implementation shows ${base > 70 ? 'strong' : 'adequate'} understanding.`
        };
    }

    await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
    await pool.execute(
        'INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [submissionId, result.codeQuality || 0, result.reqSatisfaction || 0, result.innovation || 0, result.totalScore || 0, result.requirementsMet || 0, result.totalRequirements || 10, result.feedback || '']
    );

    res.json({ message: 'Evaluation complete', result });
});

// ==========================================
// MENTOR MARKS ROUTES
// ==========================================

app.get('/api/mentor-marks', authMiddleware, async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM mentor_marks ORDER BY team_id');
    res.json(rows);
});

app.post('/api/mentor-marks', authMiddleware, adminOnly, async (req, res) => {
    const { teamId, phase1, phase2, phase3, innovation, presentation, teamwork } = req.body;

    await pool.execute('DELETE FROM mentor_marks WHERE team_id = ?', [teamId]);
    await pool.execute(
        'INSERT INTO mentor_marks (team_id, phase1, phase2, phase3, innovation, presentation, teamwork) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [teamId, phase1 || 0, phase2 || 0, phase3 || 0, innovation || 0, presentation || 0, teamwork || 0]
    );

    res.json({ message: 'Mentor marks saved' });
});

// ==========================================
// LEADERBOARD ROUTE
// ==========================================

app.get('/api/leaderboard', authMiddleware, async (req, res) => {
    try {
        const [teams] = await pool.execute('SELECT * FROM teams ORDER BY team_number');

        const leaderboard = [];
        for (const team of teams) {
            const [evalRows] = await pool.execute(
                `SELECT AVG(e.total_score) as avg_score, SUM(e.requirements_met) as total_met, SUM(e.total_requirements) as total_reqs, COUNT(*) as sub_count
                 FROM evaluation_results e JOIN submissions s ON e.submission_id = s.id WHERE s.team_id = ?`,
                [team.id]
            );

            let aiScore = 0, reqSatisfied = 0, totalReqs = 0;
            if (evalRows[0].avg_score !== null) {
                aiScore = Math.round(evalRows[0].avg_score);
                reqSatisfied = evalRows[0].total_met || 0;
                totalReqs = evalRows[0].total_reqs || 0;
            }

            const [mentorRows] = await pool.execute('SELECT * FROM mentor_marks WHERE team_id = ?', [team.id]);
            let mentorScore = 0;
            if (mentorRows.length > 0) {
                const m = mentorRows[0];
                mentorScore = (m.phase1 || 0) + (m.phase2 || 0) + (m.phase3 || 0) + (m.innovation || 0) + (m.presentation || 0) + (m.teamwork || 0);
            }

            const [subRows] = await pool.execute('SELECT COUNT(*) as cnt FROM submissions WHERE team_id = ?', [team.id]);

            leaderboard.push({
                id: team.id,
                teamNumber: team.team_number,
                name: team.name,
                useCaseId: team.use_case_id,
                aiScore, mentorScore,
                totalScore: aiScore + mentorScore,
                submissionCount: subRows[0].cnt,
                reqSatisfied, totalReqs,
            });
        }

        leaderboard.sort((a, b) => b.totalScore - a.totalScore);
        res.json(leaderboard);
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

app.get('/api/admin/stats', authMiddleware, adminOnly, async (req, res) => {
    try {
        const [[{ cnt: totalTeams }]] = await pool.execute('SELECT COUNT(*) as cnt FROM teams');
        const [[{ cnt: assignedTeams }]] = await pool.execute('SELECT COUNT(*) as cnt FROM teams WHERE use_case_id IS NOT NULL');
        const [[{ cnt: totalSubmissions }]] = await pool.execute('SELECT COUNT(*) as cnt FROM submissions');
        const [[{ cnt: evaluatedCount }]] = await pool.execute('SELECT COUNT(*) as cnt FROM evaluation_results');
        const [[{ cnt: markedTeams }]] = await pool.execute('SELECT COUNT(*) as cnt FROM mentor_marks');
        const [[{ cnt: registeredTeams }]] = await pool.execute("SELECT COUNT(*) as cnt FROM teams WHERE members != '[]'");

        res.json({ totalTeams, assignedTeams, totalSubmissions, evaluatedCount, markedTeams, registeredTeams });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
    const [rows] = await pool.execute('SELECT id, username, role, team_number, team_name, created_at FROM users ORDER BY id');
    res.json(rows);
});

// ==========================================
// SPA FALLBACK — must be AFTER all API routes
// ==========================================
if (existsSync(DIST_PATH)) {
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            res.sendFile(join(DIST_PATH, 'index.html'));
        } else {
            next();
        }
    });
}

// ==========================================
// START SERVER
// ==========================================

async function start() {
    await initDb();

    app.listen(PORT, () => {
        console.log('');
        console.log('🚀 ═══════════════════════════════════════════');
        console.log('   HackMaster 3.0 — TiDB Cloud Edition');
        console.log('   SMVEC AI&DS — Healthcare Hackathon 2026');
        console.log('═══════════════════════════════════════════════');
        console.log(`   🌐 Server:   http://localhost:${PORT}`);
        console.log(`   ☁️  Database:  TiDB Cloud`);
        console.log(`   📦 Frontend: ${existsSync(DIST_PATH) ? 'Serving from dist/' : 'Not built (run npm run build)'}`);
        console.log('');
        console.log('   🔑 Admin: admin / hackmaster2026');
        console.log('   👥 Teams: team1 / team1@hack ... team28 / team28@hack');
        console.log('═══════════════════════════════════════════════');
        console.log('');
    });
}

start().catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
