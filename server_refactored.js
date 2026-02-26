
/**
 * REFACTORED HACKMASTER 3.0 SERVER
 */
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import pool from './server/db.js';

// Import Routes
import authRoutes from './server/routes/auth.js';
import teamRoutes from './server/routes/teams.js';
import submissionRoutes from './server/routes/submissions.js';
import mentorMarkRoutes from './server/routes/mentorMarks.js';
// ... other routes will be added or kept in main for now if they are small

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_PATH = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/mentor-marks', mentorMarkRoutes);

// Shared Legacy Routes (to be moved later)
// Include evaluation, analytics, tasks here or in their own files

// SPA Fallback
if (existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH));
    app.get('*', (req, res) => res.sendFile(join(DIST_PATH, 'index.html')));
}

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
