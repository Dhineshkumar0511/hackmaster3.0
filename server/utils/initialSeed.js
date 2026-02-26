
import bcrypt from 'bcryptjs';
import pool from '../db.js';

export async function seedInitialData() {
    const [[{ cnt }]] = await pool.execute('SELECT COUNT(*) as cnt FROM users WHERE username = "admin"');

    if (cnt === 0) {
        console.log('🌱 Seeding Admin...');
        const adminPass = bcrypt.hashSync('hackmaster2026', 10);
        await pool.execute("INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')", [adminPass]);
    }

    const teamNames = [
        'Vitality Visionaries', 'Heartbeat Heroes', 'Neural Nexus', 'Bio Bridge',
        'Pulse Pioneers', 'Medi Mind', 'Care Coders', 'Health Hackers',
        'Life Line', 'Omni Health', 'Swift Surgeons', 'Data Doctors',
        'Genome Guiders', 'Aura AI', 'Nano Nurses', 'Zenith Health',
        'Cyber Care', 'Bio Blitz', 'Medi Metrics', 'Heal Hub',
        'Organ Ops', 'Pharma Phriends', 'Clinic Core', 'Radiant Rays',
        'Sensei Systems', 'Logic Labs', 'Aero Med', 'Echo Experts'
    ];

    const [[{ b27cnt }]] = await pool.execute('SELECT COUNT(*) as cnt FROM teams WHERE batch = "2027"');
    if (b27cnt === 0) {
        console.log('🌱 Seeding Batch 2027 Teams...');
        for (let i = 0; i < 28; i++) {
            const teamNum = i + 1;
            const name = teamNames[i];
            const pass = bcrypt.hashSync(`team${teamNum}@hack`, 10);
            await pool.execute("INSERT INTO users (username, password, role, team_number, team_name, batch) VALUES (?, ?, 'team', ?, ?, '2027')", [`team${teamNum}`, pass, teamNum, name]);
            await pool.execute("INSERT INTO teams (team_number, name, batch) VALUES (?, ?, '2027')", [teamNum, name]);
        }
    }

    const [[{ b28cnt }]] = await pool.execute('SELECT COUNT(*) as cnt FROM teams WHERE batch = "2028"');
    if (b28cnt === 0) {
        console.log('🌱 Seeding Batch 2028 Teams...');
        for (let i = 0; i < 28; i++) {
            const teamNum = i + 1;
            const name = `28-${teamNames[i]}`;
            const pass = bcrypt.hashSync(`team${teamNum}@28`, 10);
            await pool.execute("INSERT INTO users (username, password, role, team_number, team_name, batch) VALUES (?, ?, 'team', ?, ?, '2028')", [`t28-${teamNum}`, pass, teamNum, name]);
            await pool.execute("INSERT INTO teams (team_number, name, batch) VALUES (?, ?, '2028')", [teamNum, name]);
        }
    }

    console.log('✅ Initial Seeding Verified');
}
