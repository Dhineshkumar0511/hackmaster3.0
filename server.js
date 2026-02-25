// ==========================================
// HackMaster 3.0 — Backend Server
// Express + SQLite + JWT Authentication
// ==========================================

import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'hackmaster3.0_smvec_2026_secret_key';
const DB_PATH = join(__dirname, 'hackmaster.db');

app.use(cors());
app.use(express.json());

// Serve built frontend (production)
const DIST_PATH = join(__dirname, 'dist');
if (existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH));
    console.log('📦 Serving static files from dist/');
}

// ==========================================
// DATABASE SETUP
// ==========================================
let db;

async function initDb() {
    const SQL = await initSqlJs();

    // Load existing DB or create new one
    if (existsSync(DB_PATH)) {
        const fileBuffer = readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('📂 Loaded existing database');
    } else {
        db = new SQL.Database();
        console.log('🆕 Created new database');
    }

    // Create tables
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('team', 'admin')),
      team_number INTEGER,
      team_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_number INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      use_case_id INTEGER,
      members TEXT DEFAULT '[]',
      mentor TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      team_number INTEGER NOT NULL,
      team_name TEXT,
      use_case_id INTEGER,
      github_url TEXT NOT NULL,
      requirement_number INTEGER NOT NULL,
      description TEXT,
      phase TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS evaluation_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER UNIQUE NOT NULL,
      code_quality INTEGER DEFAULT 0,
      req_satisfaction INTEGER DEFAULT 0,
      innovation INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      requirements_met INTEGER DEFAULT 0,
      total_requirements INTEGER DEFAULT 10,
      feedback TEXT,
      evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS mentor_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER UNIQUE NOT NULL,
      phase1 INTEGER DEFAULT 0,
      phase2 INTEGER DEFAULT 0,
      phase3 INTEGER DEFAULT 0,
      innovation INTEGER DEFAULT 0,
      presentation INTEGER DEFAULT 0,
      teamwork INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

    // Settings table for global hackathon config
    db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

    // Ensure unlocked_requirements setting exists (default: 5)
    const settingsCheck = db.exec("SELECT COUNT(*) FROM settings WHERE key = 'unlocked_requirements'");
    if (settingsCheck[0].values[0][0] === 0) {
        db.run("INSERT INTO settings (key, value) VALUES ('unlocked_requirements', '5')");
    }

    // Seed default admin and teams if empty
    const userCount = db.exec('SELECT COUNT(*) FROM users')[0].values[0][0];
    if (userCount === 0) {
        console.log('🌱 Seeding initial data...');
        await seedData();
    }

    saveDb();
    console.log('✅ Database initialized');
}

async function seedData() {
    // Create admin user (password: hackmaster2026)
    const adminHash = bcrypt.hashSync('hackmaster2026', 10);
    db.run(
        'INSERT INTO users (username, password, role, team_name) VALUES (?, ?, ?, ?)',
        ['admin', adminHash, 'admin', 'Administrator']
    );

    // Create 28 teams with default passwords
    const teamNames = [
        'Neural Nexus', 'Code Crusaders', 'Data Dynamos', 'AI Architects',
        'Byte Builders', 'Pixel Pioneers', 'Logic Legends', 'Quantum Quants',
        'Cloud Crafters', 'Stack Smashers', 'Deep Thinkers', 'Algo Aces',
        'Cyber Spartans', 'Tech Titans', 'Binary Brains', 'Code Monks',
        'Syntax Squad', 'Debug Dragons', 'Hash Heroes', 'Kernel Knights',
        'Lambda Lords', 'Matrix Minds', 'Node Ninjas', 'Parse Pros',
        'Query Queens', 'Rust Rangers', 'Script Sages', 'Vector Vikings'
    ];

    for (let i = 0; i < 28; i++) {
        const teamNum = i + 1;
        const teamName = teamNames[i];
        const username = `team${teamNum}`;
        // Default password: team{number}@hack (e.g., team1@hack, team2@hack)
        const passwordHash = bcrypt.hashSync(`team${teamNum}@hack`, 10);

        db.run(
            'INSERT INTO users (username, password, role, team_number, team_name) VALUES (?, ?, ?, ?, ?)',
            [username, passwordHash, 'team', teamNum, teamName]
        );

        db.run(
            'INSERT INTO teams (team_number, name) VALUES (?, ?)',
            [teamNum, teamName]
        );
    }

    console.log('  ✅ Admin user created');
    console.log('  ✅ 28 teams created with default passwords');
}

function saveDb() {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
}

// Auto-save every 30 seconds
setInterval(() => saveDb(), 30000);

// ==========================================
// SETTINGS HELPER
// ==========================================
function getSetting(key) {
    const result = db.exec(`SELECT value FROM settings WHERE key = ?`, [key]);
    return result.length > 0 ? result[0].values[0][0] : null;
}

function setSetting(key, value) {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    saveDb();
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
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);
    if (result.length === 0 || result[0].values.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const row = result[0].values[0];
    const cols = result[0].columns;
    const user = {};
    cols.forEach((col, i) => user[col] = row[i]);

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
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authMiddleware, (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const result = db.exec('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (result.length === 0) return res.status(404).json({ error: 'User not found' });

    const storedHash = result[0].values[0][0];
    if (!bcrypt.compareSync(currentPassword, storedHash)) {
        return res.status(401).json({ error: 'Current password incorrect' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, req.user.id]);
    saveDb();

    res.json({ message: 'Password changed successfully' });
});

// ==========================================
// SETTINGS ROUTES
// ==========================================

// GET /api/settings — get all settings (unlocked requirements, etc.)
app.get('/api/settings', authMiddleware, (req, res) => {
    const unlockedReqs = parseInt(getSetting('unlocked_requirements') || '5', 10);
    res.json({ unlocked_requirements: unlockedReqs });
});

// PUT /api/settings/unlocked-requirements — admin sets how many requirements are visible
app.put('/api/settings/unlocked-requirements', authMiddleware, adminOnly, (req, res) => {
    const { count } = req.body;
    if (typeof count !== 'number' || count < 1 || count > 10) {
        return res.status(400).json({ error: 'Count must be between 1 and 10' });
    }
    setSetting('unlocked_requirements', count);
    res.json({ message: `Requirements unlocked: ${count}`, unlocked_requirements: count });
});

// ==========================================
// TEAM ROUTES
// ==========================================

// GET /api/teams — list all teams
app.get('/api/teams', authMiddleware, (req, res) => {
    const result = db.exec('SELECT * FROM teams ORDER BY team_number');
    if (result.length === 0) return res.json([]);

    const teams = result[0].values.map(row => {
        const team = {};
        result[0].columns.forEach((col, i) => team[col] = row[i]);
        team.members = JSON.parse(team.members || '[]');
        team.mentor = JSON.parse(team.mentor || '{}');
        return team;
    });

    res.json(teams);
});

// GET /api/teams/:id
app.get('/api/teams/:id', authMiddleware, (req, res) => {
    const result = db.exec('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (result.length === 0 || result[0].values.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
    }

    const team = {};
    result[0].columns.forEach((col, i) => team[col] = result[0].values[0][i]);
    team.members = JSON.parse(team.members || '[]');
    team.mentor = JSON.parse(team.mentor || '{}');

    res.json(team);
});

// PUT /api/teams/:id/details — update team members & mentor
app.put('/api/teams/:id/details', authMiddleware, (req, res) => {
    const { members, mentor } = req.body;

    db.run(
        'UPDATE teams SET members = ?, mentor = ? WHERE id = ?',
        [JSON.stringify(members), JSON.stringify(mentor), req.params.id]
    );
    saveDb();

    res.json({ message: 'Team details updated' });
});

// PUT /api/teams/:id/usecase — assign use case (admin only)
app.put('/api/teams/:id/usecase', authMiddleware, adminOnly, (req, res) => {
    const { useCaseId } = req.body;

    db.run(
        'UPDATE teams SET use_case_id = ? WHERE id = ?',
        [useCaseId, req.params.id]
    );
    saveDb();

    res.json({ message: 'Use case assigned' });
});

// ==========================================
// SUBMISSION ROUTES
// ==========================================

// GET /api/submissions
app.get('/api/submissions', authMiddleware, (req, res) => {
    let query = 'SELECT * FROM submissions';
    const params = [];

    // Team users only see their own submissions
    if (req.user.role === 'team') {
        query += ' WHERE team_number = ?';
        params.push(req.user.teamNumber);
    }

    query += ' ORDER BY timestamp DESC';

    const result = db.exec(query, params);
    if (result.length === 0) return res.json([]);

    const submissions = result[0].values.map(row => {
        const sub = {};
        result[0].columns.forEach((col, i) => sub[col] = row[i]);
        return sub;
    });

    res.json(submissions);
});

// POST /api/submissions
app.post('/api/submissions', authMiddleware, (req, res) => {
    const { githubUrl, requirementNumber, description, phase, useCaseId } = req.body;

    if (!githubUrl || !requirementNumber || !phase) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get team info
    const teamResult = db.exec(
        'SELECT id, team_number, name FROM teams WHERE team_number = ?',
        [req.user.teamNumber]
    );

    if (teamResult.length === 0 || teamResult[0].values.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
    }

    const teamRow = teamResult[0].values[0];
    const teamId = teamRow[0];
    const teamNumber = teamRow[1];
    const teamName = teamRow[2];

    db.run(
        `INSERT INTO submissions (team_id, team_number, team_name, use_case_id, github_url, requirement_number, description, phase)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [teamId, teamNumber, teamName, useCaseId || null, githubUrl, requirementNumber, description || '', phase]
    );
    saveDb();

    const lastId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    res.json({ message: 'Submission added', id: lastId });
});

// DELETE /api/submissions/:id (admin only)
app.delete('/api/submissions/:id', authMiddleware, adminOnly, (req, res) => {
    db.run('DELETE FROM evaluation_results WHERE submission_id = ?', [req.params.id]);
    db.run('DELETE FROM submissions WHERE id = ?', [req.params.id]);
    saveDb();

    res.json({ message: 'Submission deleted' });
});

// DELETE /api/submissions (admin only — delete all or by team)
app.delete('/api/submissions', authMiddleware, adminOnly, (req, res) => {
    const { teamId } = req.query;

    if (teamId) {
        const subIds = db.exec('SELECT id FROM submissions WHERE team_id = ?', [teamId]);
        if (subIds.length > 0) {
            subIds[0].values.forEach(row => {
                db.run('DELETE FROM evaluation_results WHERE submission_id = ?', [row[0]]);
            });
        }
        db.run('DELETE FROM submissions WHERE team_id = ?', [teamId]);
    } else {
        db.run('DELETE FROM evaluation_results');
        db.run('DELETE FROM submissions');
    }
    saveDb();

    res.json({ message: 'Submissions deleted' });
});

// ==========================================
// EVALUATION ROUTES
// ==========================================

// GET /api/evaluations
app.get('/api/evaluations', authMiddleware, (req, res) => {
    const result = db.exec('SELECT * FROM evaluation_results ORDER BY evaluated_at DESC');
    if (result.length === 0) return res.json([]);

    const evals = result[0].values.map(row => {
        const ev = {};
        result[0].columns.forEach((col, i) => ev[col] = row[i]);
        return ev;
    });

    res.json(evals);
});

// POST /api/evaluations
app.post('/api/evaluations', authMiddleware, adminOnly, (req, res) => {
    const { submissionId, codeQuality, reqSatisfaction, innovation, totalScore, requirementsMet, totalRequirements, feedback } = req.body;

    // Upsert: delete old result if exists, then insert new one
    db.run('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
    db.run(
        `INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [submissionId, codeQuality || 0, reqSatisfaction || 0, innovation || 0, totalScore || 0, requirementsMet || 0, totalRequirements || 10, feedback || '']
    );
    saveDb();

    res.json({ message: 'Evaluation saved' });
});

// POST /api/evaluate — Cerebras AI evaluation (server-side, key from .env)
app.post('/api/evaluate', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, useCaseTitle, requirementText, githubUrl, phase } = req.body;
    const apiKey = process.env.CEREBRAS_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'CEREBRAS_API_KEY not set in .env file' });
    }

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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-4-scout-17b-16e-instruct',
                messages: [
                    { role: 'system', content: 'Respond only with valid JSON.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 500,
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: `Cerebras API error: ${response.status} ${errorText}` });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            return res.status(500).json({ error: 'Invalid Cerebras response', raw: content });
        }

        const result = JSON.parse(jsonMatch[0]);

        // Auto-save to DB
        db.run('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
        db.run(
            `INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [submissionId, result.codeQuality || 0, result.reqSatisfaction || 0, result.innovation || 0, result.totalScore || 0, result.requirementsMet || 0, result.totalRequirements || 10, result.feedback || '']
        );
        saveDb();

        res.json({ message: 'Evaluation complete', result });
    } catch (error) {
        console.error('Cerebras evaluation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// MENTOR MARKS ROUTES
// ==========================================

// GET /api/mentor-marks
app.get('/api/mentor-marks', authMiddleware, (req, res) => {
    const result = db.exec('SELECT * FROM mentor_marks ORDER BY team_id');
    if (result.length === 0) return res.json([]);

    const marks = result[0].values.map(row => {
        const m = {};
        result[0].columns.forEach((col, i) => m[col] = row[i]);
        return m;
    });

    res.json(marks);
});

// POST /api/mentor-marks
app.post('/api/mentor-marks', authMiddleware, adminOnly, (req, res) => {
    const { teamId, phase1, phase2, phase3, innovation, presentation, teamwork } = req.body;

    // Upsert
    db.run('DELETE FROM mentor_marks WHERE team_id = ?', [teamId]);
    db.run(
        `INSERT INTO mentor_marks (team_id, phase1, phase2, phase3, innovation, presentation, teamwork)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [teamId, phase1 || 0, phase2 || 0, phase3 || 0, innovation || 0, presentation || 0, teamwork || 0]
    );
    saveDb();

    res.json({ message: 'Mentor marks saved' });
});

// ==========================================
// LEADERBOARD ROUTE
// ==========================================

// GET /api/leaderboard
app.get('/api/leaderboard', authMiddleware, (req, res) => {
    const teams = db.exec('SELECT * FROM teams ORDER BY team_number');
    if (teams.length === 0) return res.json([]);

    const leaderboard = teams[0].values.map(row => {
        const team = {};
        teams[0].columns.forEach((col, i) => team[col] = row[i]);

        // AI scores
        const evalResult = db.exec(
            `SELECT AVG(e.total_score) as avg_score, SUM(e.requirements_met) as total_met, SUM(e.total_requirements) as total_reqs, COUNT(*) as sub_count
       FROM evaluation_results e
       JOIN submissions s ON e.submission_id = s.id
       WHERE s.team_id = ?`,
            [team.id]
        );

        let aiScore = 0, reqSatisfied = 0, totalReqs = 0, subCount = 0;
        if (evalResult.length > 0 && evalResult[0].values[0][0] !== null) {
            aiScore = Math.round(evalResult[0].values[0][0]);
            reqSatisfied = evalResult[0].values[0][1] || 0;
            totalReqs = evalResult[0].values[0][2] || 0;
            subCount = evalResult[0].values[0][3] || 0;
        }

        // Mentor scores
        const mentorResult = db.exec('SELECT * FROM mentor_marks WHERE team_id = ?', [team.id]);
        let mentorScore = 0;
        if (mentorResult.length > 0 && mentorResult[0].values.length > 0) {
            const m = {};
            mentorResult[0].columns.forEach((col, i) => m[col] = mentorResult[0].values[0][i]);
            mentorScore = (m.phase1 || 0) + (m.phase2 || 0) + (m.phase3 || 0) + (m.innovation || 0) + (m.presentation || 0) + (m.teamwork || 0);
        }

        // Total submissions
        const subResult = db.exec('SELECT COUNT(*) FROM submissions WHERE team_id = ?', [team.id]);
        const totalSubs = subResult.length > 0 ? subResult[0].values[0][0] : 0;

        return {
            id: team.id,
            teamNumber: team.team_number,
            name: team.name,
            useCaseId: team.use_case_id,
            aiScore,
            mentorScore,
            totalScore: aiScore + mentorScore,
            submissionCount: totalSubs,
            reqSatisfied,
            totalReqs,
        };
    });

    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    res.json(leaderboard);
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// GET /api/admin/stats
app.get('/api/admin/stats', authMiddleware, adminOnly, (req, res) => {
    const totalTeams = db.exec('SELECT COUNT(*) FROM teams')[0].values[0][0];
    const assignedTeams = db.exec('SELECT COUNT(*) FROM teams WHERE use_case_id IS NOT NULL')[0].values[0][0];
    const totalSubmissions = db.exec('SELECT COUNT(*) FROM submissions')[0].values[0][0];
    const evaluatedCount = db.exec('SELECT COUNT(*) FROM evaluation_results')[0].values[0][0];
    const markedTeams = db.exec('SELECT COUNT(*) FROM mentor_marks')[0].values[0][0];
    const registeredTeams = db.exec("SELECT COUNT(*) FROM teams WHERE members != '[]'")[0].values[0][0];

    res.json({
        totalTeams,
        assignedTeams,
        totalSubmissions,
        evaluatedCount,
        markedTeams,
        registeredTeams,
    });
});

// GET /api/admin/users — list all users (admin)
app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
    const result = db.exec('SELECT id, username, role, team_number, team_name, created_at FROM users ORDER BY id');
    if (result.length === 0) return res.json([]);

    const users = result[0].values.map(row => {
        const u = {};
        result[0].columns.forEach((col, i) => u[col] = row[i]);
        return u;
    });

    res.json(users);
});

// ==========================================
// SPA FALLBACK — must be AFTER all API routes
// ==========================================
// For any non-API route, serve index.html (React Router handles client-side routing)
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
        console.log('   HackMaster 3.0 Backend Server');
        console.log('   SMVEC AI&DS — Healthcare Hackathon 2026');
        console.log('═══════════════════════════════════════════════');
        console.log(`   🌐 Server:  http://localhost:${PORT}`);
        console.log(`   📂 Database: ${DB_PATH}`);
        console.log(`   📦 Frontend: ${existsSync(DIST_PATH) ? 'Serving from dist/' : 'Not built (run npm run build)'}`);
        console.log('');
        console.log('   🔑 Login Credentials:');
        console.log('   ─────────────────────────────────');
        console.log('   Admin:   admin / hackmaster2026');
        console.log('   Team 1:  team1 / team1@hack');
        console.log('   Team 2:  team2 / team2@hack');
        console.log('   ...      teamN / teamN@hack');
        console.log('   Team 28: team28 / team28@hack');
        console.log('═══════════════════════════════════════════════');
        console.log('');
    });
}

start().catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
