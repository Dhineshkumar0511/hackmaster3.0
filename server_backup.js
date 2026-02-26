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

import { evaluationQueue } from './server/utils/queue.js';

console.log('🔑 GitHub Token Status:', process.env.GITHUB_TOKEN ? 'LOADED' : 'MISSING');
console.log('🧠 AI Key Status:', process.env.CEREBRAS_API_KEY ? 'LOADED' : 'MISSING');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'hackmaster_secret_2026';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ FATAL ERROR: DATABASE_URL is missing!');
    console.error('Please add DATABASE_URL to your .env file or Render environment variables.');
    process.exit(1);
}

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
      batch VARCHAR(10) DEFAULT '2027',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await pool.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_number INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      use_case_id INT,
      members TEXT,
      mentor TEXT,
      batch VARCHAR(10) DEFAULT '2027',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_team_batch (team_number, batch)
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
      detailed_report LONGTEXT,
      file_tree LONGTEXT,
      evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
  `);

    // Ensure file_tree column exists (migration)
    try {
        await pool.execute('ALTER TABLE evaluation_results ADD COLUMN file_tree LONGTEXT');
    } catch (e) {
        // Column probably already exists, which is fine
    }

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
      req1 INT DEFAULT 0,
      req2 INT DEFAULT 0,
      req3 INT DEFAULT 0,
      req4 INT DEFAULT 0,
      req5 INT DEFAULT 0,
      req6 INT DEFAULT 0,
      req7 INT DEFAULT 0,
      req8 INT DEFAULT 0,
      req9 INT DEFAULT 0,
      req10 INT DEFAULT 0,
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

    await pool.execute(`
    CREATE TABLE IF NOT EXISTS team_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'todo',
      assigned_to VARCHAR(255),
      priority VARCHAR(20) DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

    // Ensure unlocked_requirements setting exists
    const [settingsRows] = await pool.execute("SELECT COUNT(*) AS cnt FROM settings WHERE `key` = 'unlocked_requirements'");
    if (settingsRows[0].cnt === 0) {
        await pool.execute("INSERT INTO settings (`key`, value) VALUES ('unlocked_requirements', '5')");
    }

    // Migration: Add batch column if not exists
    try {
        await pool.execute("ALTER TABLE users ADD COLUMN batch VARCHAR(10) DEFAULT '2027'");
        console.log('✅ Added batch column to users');
    } catch (e) {
        // Column already exists
    }
    try {
        await pool.execute("ALTER TABLE teams ADD COLUMN batch VARCHAR(10) DEFAULT '2027'");
        console.log('✅ Added batch column to teams');
    } catch (e) {
        // Column already exists
    }
    try {
        // Drop old unique constraint and add new one
        await pool.execute("ALTER TABLE teams DROP INDEX team_number");
        await pool.execute("ALTER TABLE teams ADD UNIQUE KEY unique_team_batch (team_number, batch)");
        console.log('✅ Updated teams unique constraint for batch');
    } catch (e) {
        // Already migrated
    }
    try {
        await pool.execute("ALTER TABLE evaluation_results ADD COLUMN detailed_report LONGTEXT");
        console.log('✅ Added detailed_report column to evaluation_results');
    } catch (e) {
        // Already migrated
    }
    try {
        await pool.execute("ALTER TABLE evaluation_results ADD COLUMN file_tree LONGTEXT");
        console.log('✅ Added file_tree column to evaluation_results');
    } catch (e) {
        // Already migrated
    }

    // Requirements columns migration
    for (let i = 1; i <= 10; i++) {
        try {
            await pool.execute(`ALTER TABLE mentor_marks ADD COLUMN req${i} INT DEFAULT 0`);
            console.log(`✅ Added req${i} column to mentor_marks`);
        } catch (e) {
            // Already exists or other migration skip
        }
    }

    // Seed if empty
    const [userCountRows] = await pool.execute('SELECT COUNT(*) AS cnt FROM users');
    if (userCountRows[0].cnt === 0) {
        console.log('🌱 Seeding initial data...');
        await seedData();
    } else {
        // Check if 2nd year teams exist, seed if missing
        const [batch2028Rows] = await pool.execute("SELECT COUNT(*) AS cnt FROM users WHERE batch = '2028'");
        if (batch2028Rows[0].cnt === 0) {
            console.log('🌱 Seeding 2nd year (Batch 2028) teams...');
            await seed2ndYearTeams();
        }
    }

    try {
        const [columns] = await pool.execute("SHOW COLUMNS FROM mentor_marks LIKE 'req1'");
        if (columns.length === 0) {
            await pool.execute("ALTER TABLE mentor_marks ADD COLUMN req1 INT DEFAULT 0, ADD COLUMN req2 INT DEFAULT 0, ADD COLUMN req3 INT DEFAULT 0, ADD COLUMN req4 INT DEFAULT 0, ADD COLUMN req5 INT DEFAULT 0, ADD COLUMN req6 INT DEFAULT 0, ADD COLUMN req7 INT DEFAULT 0, ADD COLUMN req8 INT DEFAULT 0, ADD COLUMN req9 INT DEFAULT 0, ADD COLUMN req10 INT DEFAULT 0");
            console.log('✅ Added requirement columns to mentor_marks');
        }
    } catch (e) {
        console.warn('Could not alter mentor_marks:', e.message);
    }

    console.log('✅ Database initialized');
}

async function seedData() {
    // Admin: admin / hackmaster2026
    const adminHash = bcrypt.hashSync('hackmaster2026', 10);
    await pool.execute(
        'INSERT INTO users (username, password, role, team_name, batch) VALUES (?, ?, ?, ?, ?)',
        ['admin', adminHash, 'admin', 'Administrator', 'all']
    );

    // ── 3rd YEAR TEAMS (Batch 2027) ──
    const teamNames3rdYear = [
        'Neural Nexus', 'Code Crusaders', 'Data Dynamos', 'AI Architects',
        'Byte Builders', 'Pixel Pioneers', 'Logic Legends', 'Quantum Quants',
        'Cloud Crafters', 'Stack Smashers', 'Deep Thinkers', 'Algo Aces',
        'Cyber Spartans', 'Tech Titans', 'Binary Brains', 'Code Monks',
        'Syntax Squad', 'Debug Dragons', 'Hash Heroes', 'Kernel Knights',
        'Lambda Lords', 'Matrix Minds', 'Node Ninjas', 'Parse Pros',
        'Query Queens', 'Rust Rangers', 'Script Sages', 'Vector Vikings'
    ];

    console.log('');
    console.log('   🔑 3RD YEAR (Batch 2027) CREDENTIALS:');
    console.log('   ─────────────────────────────────────');

    for (let i = 0; i < 28; i++) {
        const teamNum = i + 1;
        const teamName = teamNames3rdYear[i];
        const username = `team${teamNum}`;
        const password = `team${teamNum}@hack`;
        const passwordHash = bcrypt.hashSync(password, 10);

        console.log(`   Team ${String(teamNum).padStart(2, ' ')}: ${username} / ${password}`);

        await pool.execute(
            'INSERT INTO users (username, password, role, team_number, team_name, batch) VALUES (?, ?, ?, ?, ?, ?)',
            [username, passwordHash, 'team', teamNum, teamName, '2027']
        );

        await pool.execute(
            'INSERT INTO teams (team_number, name, members, mentor, batch) VALUES (?, ?, ?, ?, ?)',
            [teamNum, teamName, '[]', '{}', '2027']
        );
    }

    // ── 2nd YEAR TEAMS (Batch 2028) ──
    const teamNames2ndYear = [
        'Alpha Coders', 'Beta Builders', 'Gamma Geeks', 'Delta Devs',
        'Epsilon Elites', 'Zeta Zeros', 'Eta Engineers', 'Theta Thinkers',
        'Iota Innovators', 'Kappa Koders', 'Lambda Learners', 'Mu Masters',
        'Nu Navigators', 'Xi Xperts', 'Omicron Ops', 'Pi Programmers',
        'Rho Riders', 'Sigma Squad', 'Tau Techies', 'Upsilon Units',
        'Phi Fusion', 'Chi Champions', 'Psi Pioneers', 'Omega Ops',
        'Nova Network', 'Zenith Zone', 'Apex AI', 'Prism Pros'
    ];

    console.log('');
    console.log('   🔑 2ND YEAR (Batch 2028) CREDENTIALS:');
    console.log('   ─────────────────────────────────────');

    for (let i = 0; i < 28; i++) {
        const teamNum = i + 1;
        const teamName = teamNames2ndYear[i];
        const username = `2y_team${teamNum}`;
        const password = `2y_team${teamNum}@hack`;
        const passwordHash = bcrypt.hashSync(password, 10);

        console.log(`   Team ${String(teamNum).padStart(2, ' ')}: ${username} / ${password}`);

        await pool.execute(
            'INSERT INTO users (username, password, role, team_number, team_name, batch) VALUES (?, ?, ?, ?, ?, ?)',
            [username, passwordHash, 'team', teamNum, teamName, '2028']
        );

        await pool.execute(
            'INSERT INTO teams (team_number, name, members, mentor, batch) VALUES (?, ?, ?, ?, ?)',
            [teamNum, teamName, '[]', '{}', '2028']
        );
    }

    console.log('  ✅ Admin + 28 (3rd Year) + 28 (2nd Year) = 57 users created');
}

// Incremental seed for 2nd year teams (existing DB migration)
async function seed2ndYearTeams() {
    const teamNames2ndYear = [
        'Alpha Coders', 'Beta Builders', 'Gamma Geeks', 'Delta Devs',
        'Epsilon Elites', 'Zeta Zeros', 'Eta Engineers', 'Theta Thinkers',
        'Iota Innovators', 'Kappa Koders', 'Lambda Learners', 'Mu Masters',
        'Nu Navigators', 'Xi Xperts', 'Omicron Ops', 'Pi Programmers',
        'Rho Riders', 'Sigma Squad', 'Tau Techies', 'Upsilon Units',
        'Phi Fusion', 'Chi Champions', 'Psi Pioneers', 'Omega Ops',
        'Nova Network', 'Zenith Zone', 'Apex AI', 'Prism Pros'
    ];

    for (let i = 0; i < 28; i++) {
        const teamNum = i + 1;
        const teamName = teamNames2ndYear[i];
        const username = `2y_team${teamNum}`;
        const password = `2y_team${teamNum}@hack`;
        const passwordHash = bcrypt.hashSync(password, 10);

        console.log(`   2nd Year Team ${String(teamNum).padStart(2, ' ')}: ${username} / ${password}`);

        await pool.execute(
            'INSERT INTO users (username, password, role, team_number, team_name, batch) VALUES (?, ?, ?, ?, ?, ?)',
            [username, passwordHash, 'team', teamNum, teamName, '2028']
        );

        await pool.execute(
            'INSERT INTO teams (team_number, name, members, mentor, batch) VALUES (?, ?, ?, ?, ?)',
            [teamNum, teamName, '[]', '{}', '2028']
        );
    }

    // Update existing 3rd year teams' batch to '2027' if not set
    await pool.execute("UPDATE users SET batch = '2027' WHERE batch IS NULL AND role = 'team'");
    await pool.execute("UPDATE teams SET batch = '2027' WHERE batch IS NULL");

    console.log('  ✅ 28 (2nd Year Batch 2028) teams created');
}
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

/**
 * Fetches code content from a GitHub URL using the GitHub API.
 * DEEP recursive scan — fetches ALL files from ALL subdirectories.
 * Returns a concatenated string of the most relevant code files + full file tree.
 */
async function fetchGithubRepoContent(githubUrl) {
    console.log(`🚀 [fetchGithubRepoContent] Starting deep scan for: ${githubUrl}`);
    try {
        const parts = githubUrl.replace(/\/$/, '').split('/');
        const repo = parts.pop();
        const owner = parts.pop();

        if (!owner || !repo) {
            console.error('❌ [fetchGithubRepoContent] Invalid GitHub URL');
            return null;
        }

        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'HackMaster-3.0-Evaluator'
        };
        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const codeExtensions = ['.js', '.jsx', '.py', '.html', '.css', '.sql', '.txt', '.md', '.tsx', '.ts', '.json', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.rb', '.php', '.ipynb', '.sh'];
        const skipFiles = ['package-lock.json', 'yarn.lock', '.gitignore', '.eslintrc.json', 'tsconfig.json'];
        const skipDirs = ['node_modules', '.git', '__pycache__', '.next', 'dist', 'build', '.vscode', '.idea', 'venv', 'env', '.env', 'assets', 'static', 'uploads', 'media', 'vendor', 'dataset', 'images', 'img'];

        let allFiles = [];
        let fileTree = [];
        let totalCalls = 0;
        const MAX_CALL_LIMIT = 800; // Increased limit
        let queue = ['']; // BFS queue

        while (queue.length > 0 && totalCalls < MAX_CALL_LIMIT) {
            const dirPath = queue.shift();
            totalCalls++;

            const encodedPath = dirPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

            try {
                const response = await fetch(apiUrl, { headers });
                if (response.status === 403) {
                    const resetTime = response.headers.get('x-ratelimit-reset');
                    const waitMin = resetTime ? Math.ceil((resetTime * 1000 - Date.now()) / 60000) : 'some';
                    console.error(`🛑 Rate Limit hit. Wait ${waitMin}m.`);
                    break;
                }
                if (!response.ok) continue;

                const items = await response.json();
                if (!Array.isArray(items)) continue;

                for (const item of items) {
                    if (item.type === 'dir') {
                        const lowName = item.name.toLowerCase();
                        // Priority folders for code
                        const isHighPriority = ['src', 'app', 'website', 'python', 'code', 'script', 'lib', 'server', 'client', 'api'].some(p => lowName.includes(p));
                        const shouldSkip = skipDirs.includes(lowName) ||
                            (['data', 'dataset', 'test', 'train', 'valid', 'image', 'picture'].some(p => lowName.includes(p)) && !isHighPriority);

                        if (shouldSkip) {
                            fileTree.push(`📁 ${item.path}/ (SKIPPED)`);
                        } else {
                            fileTree.push(`📁 ${item.path}/`);
                            // Push to front of queue if high priority, else back
                            if (isHighPriority) queue.unshift(item.path);
                            else queue.push(item.path);
                        }
                    } else if (item.type === 'file') {
                        fileTree.push(`📄 ${item.path} (${(item.size / 1024).toFixed(1)} KB)`);
                        if (skipFiles.includes(item.name)) continue;
                        if (codeExtensions.some(ext => item.name.toLowerCase().endsWith(ext))) {
                            if (item.size < 400000) allFiles.push(item);
                        }
                    }
                }
            } catch (err) {
                console.error(`❌ Error scanning ${dirPath}:`, err.message);
            }
        }

        console.log(`🔍 [fetchGithubRepoContent] Finished scan. Folders scanned: ${totalCalls}, Files found: ${allFiles.length}`);

        // Sort and select top files
        const mainCodeFiles = allFiles.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            const pNames = ['app', 'main', 'index', 'server', 'model', 'view', 'controller'];
            const aP = pNames.some(p => aName.includes(p)) ? 0 : 1;
            const bP = pNames.some(p => bName.includes(p)) ? 0 : 1;
            if (aP !== bP) return aP - bP;
            return aName.localeCompare(bName);
        }).slice(0, 30);

        let codeContext = '';
        let fileCount = 0;
        for (const file of mainCodeFiles) {
            try {
                const res = await fetch(file.download_url);
                if (res.ok) {
                    const content = await res.text();
                    if (content.trim().length > 10) {
                        codeContext += `\n\n========== FILE: ${file.path} ==========\n${content.substring(0, 8000)}`;
                        fileCount++;
                    }
                }
            } catch (e) { }
        }

        const treeStr = `\n📂 REPOSITORY STRUCTURE (${fileTree.length} items):\n${fileTree.slice(0, 500).join('\n')}\n${fileTree.length > 500 ? '... [Tree Truncated]' : ''}`;
        const summary = `\n📊 STATS: ${fileTree.length} paths, ${allFiles.length} matched files, ${fileCount} files read.\n`;

        if (fileCount === 0 && fileTree.length === 0) {
            return { fullContext: `⚠️ ERROR: REPOSITORY INACCESSIBLE.`, fileTree: [], stats: { totalItems: 0, codeFiles: 0, analyzedFiles: 0 } };
        }

        if (fileCount === 0) {
            return {
                fullContext: `${treeStr}${summary}\n⚠️ NO SOURCE CODE DETECTED. The repository might contain only binary assets or datasets.`,
                fileTree: fileTree,
                stats: { totalItems: fileTree.length, codeFiles: 0, analyzedFiles: 0 }
            };
        }

        return {
            fullContext: `${treeStr}${summary}${codeContext}`,
            fileTree: fileTree,
            stats: { totalItems: fileTree.length, codeFiles: allFiles.length, analyzedFiles: fileCount }
        };

    } catch (error) {
        console.error('Final GitHub error:', error);
        return { fullContext: `⚠️ ERROR: ${error.message}`, fileTree: [], stats: { totalItems: 0, codeFiles: 0, analyzedFiles: 0 } };
    }
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
                batch: user.batch,
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
                batch: user.batch,
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
        const batch = req.query.batch;
        let query = 'SELECT * FROM teams';
        const params = [];

        if (batch) {
            query += ' WHERE batch = ?';
            params.push(batch);
        } else if (req.user.role === 'team' && req.user.batch) {
            query += ' WHERE batch = ?';
            params.push(req.user.batch);
        }
        query += ' ORDER BY team_number';

        const [rows] = await pool.execute(query, params);
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

// Admin: Clear team registration (members + mentor)
app.delete('/api/teams/:id/registration', authMiddleware, adminOnly, async (req, res) => {
    try {
        console.log(`🧹 Clearing registration for team ID: ${req.params.id}`);
        await pool.execute("UPDATE teams SET members = '[]', mentor = '{}' WHERE id = ?", [req.params.id]);
        res.status(200).json({ success: true, message: 'Team registration cleared' });
    } catch (err) {
        console.error('Clear registration error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// TEAM TASKS ROUTES (Collaboration)
// ==========================================

app.get('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const teamId = req.user.role === 'admin' ? req.query.teamId : (await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, req.user.batch]))[0][0]?.id;

        if (!teamId) return res.status(404).json({ error: 'Team not found' });

        const [rows] = await pool.execute('SELECT * FROM team_tasks WHERE team_id = ? ORDER BY created_at DESC', [teamId]);
        res.json(rows);
    } catch (err) {
        console.error('Fetch tasks error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const { title, priority, assignedTo } = req.body;
        const [teamRows] = await pool.execute('SELECT id FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, req.user.batch]);
        if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });

        const [result] = await pool.execute(
            'INSERT INTO team_tasks (team_id, title, priority, assigned_to) VALUES (?, ?, ?, ?)',
            [teamRows[0].id, title, priority || 'medium', assignedTo || '']
        );
        res.json({ id: result.insertId, message: 'Task created' });
    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { status, priority, title } = req.body;
        await pool.execute('UPDATE team_tasks SET status = ?, priority = ?, title = ? WHERE id = ?', [status, priority, title, req.params.id]);
        res.json({ message: 'Task updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        await pool.execute('DELETE FROM team_tasks WHERE id = ?', [req.params.id]);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/submissions', authMiddleware, async (req, res) => {
    try {
        const batch = req.query.batch;
        let query = 'SELECT s.* FROM submissions s JOIN teams t ON s.team_id = t.id';
        const params = [];

        if (req.user.role === 'team') {
            query += ' WHERE s.team_number = ? AND t.batch = ?';
            params.push(req.user.teamNumber, req.user.batch);
        } else if (batch) {
            query += ' WHERE t.batch = ?';
            params.push(batch);
        }

        query += ' ORDER BY s.timestamp DESC';

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
        // IMPORTANT: Filter by BOTH team_number AND batch to avoid cross-batch mismatches
        // Both 2nd year and 3rd year have team_numbers 1-28, so batch is required
        const userBatch = req.user.batch || '2027';
        const [teamRows] = await pool.execute('SELECT id, team_number, name, batch FROM teams WHERE team_number = ? AND batch = ?', [req.user.teamNumber, userBatch]);
        if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found for your batch' });

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
    try {
        const { teamId, batch } = req.query;

        if (teamId) {
            console.log(`🗑️ Deleting all submissions for team ID: ${teamId}`);
            const [subs] = await pool.execute('SELECT id FROM submissions WHERE team_id = ?', [teamId]);
            for (const sub of subs) {
                await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [sub.id]);
            }
            await pool.execute('DELETE FROM submissions WHERE team_id = ?', [teamId]);
            return res.json({ success: true, message: `Submissions deleted for team ${teamId}` });
        } else if (batch && batch !== 'all') {
            console.log(`🗑️ Deleting all submissions for batch: ${batch}`);
            const [subs] = await pool.execute(`
                SELECT id FROM submissions 
                WHERE team_id IN (SELECT id FROM teams WHERE batch = ?)
            `, [batch]);
            for (const sub of subs) {
                await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [sub.id]);
            }
            await pool.execute(`
                DELETE FROM submissions 
                WHERE team_id IN (SELECT id FROM teams WHERE batch = ?)
            `, [batch]);
            return res.json({ success: true, message: `All submissions for batch ${batch} deleted` });
        } else {
            console.log('🗑️ Deleting ALL submissions across all batches');
            await pool.execute('DELETE FROM evaluation_results');
            await pool.execute('DELETE FROM submissions');
            return res.json({ success: true, message: 'All submissions cleared across all batches' });
        }
    } catch (err) {
        console.error('Delete submissions error:', err);
        res.status(500).json({ success: false, error: 'Server error while deleting submissions' });
    }
});

// ==========================================
// EVALUATION ROUTES
// ==========================================

app.get('/api/evaluations', authMiddleware, async (req, res) => {
    try {
        const batch = req.query.batch;
        let query = `
            SELECT er.* 
            FROM evaluation_results er 
            JOIN submissions s ON er.submission_id = s.id 
            JOIN teams t ON s.team_id = t.id
        `;
        const params = [];

        if (req.user.role === 'team') {
            query += ' WHERE s.team_number = ? AND t.batch = ?';
            params.push(req.user.teamNumber, req.user.batch);
        } else if (batch) {
            query += ' WHERE t.batch = ?';
            params.push(batch);
        }

        query += ' ORDER BY er.evaluated_at DESC';
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Fetch evaluations error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/evaluations', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, codeQuality, reqSatisfaction, innovation, totalScore, requirementsMet, totalRequirements, feedback, detailedReport } = req.body;

    await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
    await pool.execute(
        'INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback, detailed_report) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [submissionId, codeQuality || 0, reqSatisfaction || 0, innovation || 0, totalScore || 0, requirementsMet || 0, totalRequirements || 10, feedback || '', JSON.stringify(detailedReport)]
    );

    res.json({ message: 'Evaluation saved' });
});

// POST /api/evaluate — AI evaluation (Background Queue)
app.post('/api/evaluate', authMiddleware, adminOnly, async (req, res) => {
    const { submissionId, useCaseTitle, requirementText, githubUrl, phase, allRequirements } = req.body;

    console.log(`🚀 [Queue] Adding evaluation job for Submission #${submissionId}`);
    const jobId = evaluationQueue.add({
        submissionId, useCaseTitle, requirementText, githubUrl, phase, allRequirements
    });

    res.json({ message: 'Evaluation started in background', jobId });

    // Internal Worker (Simple Promise)
    (async () => {
        const job = evaluationQueue.getStatus(jobId);
        if (!job) return;

        job.status = 'processing';
        try {
            const githubData = await fetchGithubRepoContent(githubUrl);
            if (!githubData) throw new Error('Failed to access repository content.');

            const githubContent = githubData.fullContext;
            const fileTreeRaw = githubData.fileTree;
            const reqsList = Array.isArray(allRequirements) ? allRequirements : [requirementText];
            const reqsFormatted = reqsList.map((r, i) => `  R${i + 1}: ${typeof r === 'string' ? r : 'Requirement'}`).join('\n');
            const apiKey = process.env.CEREBRAS_API_KEY;

            let evaluation;
            if (apiKey) {
                const prompt = `You are a STRICT technical auditor reviewing a ${useCaseTitle} project. 
PHASE: ${phase}. REQUIREMENTS:\n${reqsFormatted}\n
CODE CONTEXT:\n${githubContent || 'Code not found.'}
Respond ONLY as JSON matching the standard HackMaster evaluation schema.`;

                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b',
                        messages: [{ role: 'user', content: prompt }],
                        response_format: { type: 'json_object' }
                    })
                });

                if (response.ok) {
                    const aiData = await response.json();
                    try {
                        evaluation = JSON.parse(aiData.choices[0].message.content);
                    } catch (e) {
                        console.error('AI fallback: JSON parse error', e);
                    }
                }
            }

            if (!evaluation) {
                evaluation = {
                    codeQuality: 40, reqSatisfaction: 30, innovation: 0,
                    totalScore: 35, requirementsMet: 0, totalRequirements: reqsList.length,
                    feedback: 'AI evaluation failed or skipped. Basic code metrics used.',
                    detailedReport: []
                };
            }

            // Save Result
            await pool.execute('DELETE FROM evaluation_results WHERE submission_id = ?', [submissionId]);
            await pool.execute(
                `INSERT INTO evaluation_results (submission_id, code_quality, req_satisfaction, innovation, total_score, requirements_met, total_requirements, feedback, detailed_report, file_tree)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [submissionId, evaluation.codeQuality || evaluation.code_quality, evaluation.reqSatisfaction || evaluation.req_satisfaction, evaluation.innovation, evaluation.totalScore || evaluation.total_score, evaluation.requirementsMet || evaluation.requirements_met, evaluation.totalRequirements || evaluation.total_requirements, evaluation.feedback, JSON.stringify(evaluation.detailedReport || evaluation.detailed_report), JSON.stringify(fileTreeRaw)]
            );

            job.status = 'completed';
            job.result = evaluation;
        } catch (err) {
            console.error(`❌ Job ${jobId} Failed:`, err);
            job.status = 'failed';
            job.error = err.message;
        }
    })();
});

app.get('/api/evaluate/status/:jobId', authMiddleware, adminOnly, (req, res) => {
    const job = evaluationQueue.getStatus(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

// GET /api/admin/analytics — Advanced insights for organizers
app.get('/api/admin/analytics', authMiddleware, adminOnly, async (req, res) => {
    try {
        const batch = req.query.batch || '2027';

        // 1. Average scores
        const [avgRows] = await pool.execute(`
            SELECT 
                AVG(code_quality) as avgQuality, 
                AVG(req_satisfaction) as avgSatisfaction, 
                AVG(innovation) as avgInnovation,
                AVG(total_score) as avgTotal
            FROM evaluation_results er
            JOIN submissions s ON er.submission_id = s.id
            JOIN teams t ON s.team_id = t.id
            WHERE t.batch = ?
        `, [batch]);

        // 2. Score distribution
        const [distRows] = await pool.execute(`
            SELECT 
                CASE 
                    WHEN total_score >= 80 THEN '80-100'
                    WHEN total_score >= 60 THEN '60-79'
                    WHEN total_score >= 40 THEN '40-59'
                    ELSE '0-39'
                END as scoreRange,
                COUNT(*) as count
            FROM evaluation_results er
            JOIN submissions s ON er.submission_id = s.id
            JOIN teams t ON s.team_id = t.id
            WHERE t.batch = ?
            GROUP BY scoreRange
        `, [batch]);

        // 3. Common Mistakes (Simple keyword extraction from feedback)
        const [mistakeRows] = await pool.execute(`
            SELECT feedback FROM evaluation_results er
            JOIN submissions s ON er.submission_id = s.id
            JOIN teams t ON s.team_id = t.id
            WHERE t.batch = ?
        `, [batch]);

        const feedbackText = mistakeRows.map(r => r.feedback).join(' ').toLowerCase();
        const commonKeywords = ['missing', 'error', 'incomplete', 'optimization', 'security', 'ui', 'api', 'database', 'auth']
            .map(kw => ({ keyword: kw, count: (feedbackText.match(new RegExp(kw, 'g')) || []).length }))
            .sort((a, b) => b.count - a.count)
            .filter(k => k.count > 0);

        res.json({
            averages: avgRows[0],
            distribution: distRows,
            commonMistakes: commonKeywords
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// MENTOR MARKS ROUTES
// ==========================================

app.get('/api/mentor-marks', authMiddleware, async (req, res) => {
    try {
        const batch = req.query.batch;
        let query = 'SELECT m.* FROM mentor_marks m JOIN teams t ON m.team_id = t.id';
        const params = [];

        if (req.user.role === 'team') {
            query += ' WHERE t.batch = ?';
            params.push(req.user.batch);
        } else if (batch) {
            query += ' WHERE t.batch = ?';
            params.push(batch);
        }

        query += ' ORDER BY m.team_id';
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Fetch mentor marks error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/mentor-marks', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { teamId, phase1, phase2, phase3, innovation, presentation, teamwork,
            req1, req2, req3, req4, req5, req6, req7, req8, req9, req10 } = req.body;
        await pool.execute(
            `INSERT INTO mentor_marks (
                team_id, phase1, phase2, phase3, innovation, presentation, teamwork,
                req1, req2, req3, req4, req5, req6, req7, req8, req9, req10
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                phase1=VALUES(phase1), phase2=VALUES(phase2), phase3=VALUES(phase3),
                innovation=VALUES(innovation), presentation=VALUES(presentation), teamwork=VALUES(teamwork),
                req1=VALUES(req1), req2=VALUES(req2), req3=VALUES(req3), req4=VALUES(req4), req5=VALUES(req5),
                req6=VALUES(req6), req7=VALUES(req7), req8=VALUES(req8), req9=VALUES(req9), req10=VALUES(req10),
                updated_at=CURRENT_TIMESTAMP`,
            [
                teamId, phase1 || 0, phase2 || 0, phase3 || 0, innovation || 0, presentation || 0, teamwork || 0,
                req1 || 0, req2 || 0, req3 || 0, req4 || 0, req5 || 0, req6 || 0, req7 || 0, req8 || 0, req9 || 0, req10 || 0
            ]
        );
        res.json({ message: 'Mentor marks saved' });
    } catch (err) {
        console.error('Save mentor marks error:', err);
        res.status(500).json({ error: 'Failed to save marks' });
    }
});

app.delete('/api/mentor-marks', authMiddleware, adminOnly, async (req, res) => {
    try {
        const batch = req.query.batch;
        console.log(`🗑️ Clear Mentor Marks: Received request for batch: ${batch}`);

        if (batch && batch !== 'all') {
            const [result] = await pool.execute(`
                DELETE FROM mentor_marks 
                WHERE team_id IN (SELECT id FROM teams WHERE batch = ?)
            `, [batch]);
            console.log(`✅ Cleared ${result.affectedRows} marks for batch ${batch}`);
            return res.status(200).json({ success: true, message: `Cleared mentor marks for batch ${batch}` });
        } else {
            await pool.execute('DELETE FROM mentor_marks');
            console.log('✅ Cleared ALL mentor marks across all batches');
            return res.status(200).json({ success: true, message: 'Cleared all mentor marks' });
        }
    } catch (err) {
        console.error('❌ Delete mentor marks error:', err);
        return res.status(500).json({ success: false, error: 'Server error while clearing marks' });
    }
});

// ==========================================
// LEADERBOARD ROUTE
// ==========================================

app.get('/api/leaderboard', authMiddleware, async (req, res) => {
    try {
        const batch = req.query.batch;
        let query = 'SELECT * FROM teams';
        const params = [];
        if (batch) {
            query += ' WHERE batch = ?';
            params.push(batch);
        }
        query += ' ORDER BY team_number';
        const [teams] = await pool.execute(query, params);

        // Fetch all mentor marks once
        const [allMentorMarks] = await pool.execute('SELECT * FROM mentor_marks');
        const mentorMarksMap = {};
        allMentorMarks.forEach(m => { mentorMarksMap[m.team_id] = m; });

        // Fetch all evaluations once
        const [allEvals] = await pool.execute(`
            SELECT e.submission_id, e.total_score, s.team_id 
            FROM evaluation_results e 
            JOIN submissions s ON e.submission_id = s.id
        `);
        const evalsMap = {};
        allEvals.forEach(ev => {
            if (!evalsMap[ev.team_id]) evalsMap[ev.team_id] = [];
            evalsMap[ev.team_id].push(ev.total_score);
        });

        const leaderboard = [];
        for (const team of teams) {
            const teamEvals = evalsMap[team.id] || [];
            const aiScore = teamEvals.length
                ? Math.round(teamEvals.reduce((sum, s) => sum + s, 0) / teamEvals.length)
                : 0;

            const m = mentorMarksMap[team.id] || {};
            const phaseScore = (m.phase1 || 0) + (m.phase2 || 0) + (m.phase3 || 0) + (m.innovation || 0) + (m.presentation || 0) + (m.teamwork || 0);
            const normPhase = Math.round((phaseScore / 60) * 100);

            let reqTotal = 0;
            for (let i = 1; i <= 10; i++) {
                reqTotal += (m[`req${i}`] || 0);
            }
            const normReq = reqTotal; // Normalized out of 100 (10 reqs * 10 marks)

            const totalScore = Math.round((aiScore + normPhase + normReq) / 3);

            leaderboard.push({
                id: team.id,
                teamNumber: team.team_number,
                name: team.name,
                batch: team.batch,
                aiScore,
                normPhase,
                reqScore: normReq,
                totalScore,
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
        console.log('   👥 3rd Year: team1 / team1@hack ... team28 / team28@hack');
        console.log('   👥 2nd Year: 2y_team1 / 2y_team1@hack ... 2y_team28 / 2y_team28@hack');
        console.log('═══════════════════════════════════════════════');
        console.log('');
    });
}

start().catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
