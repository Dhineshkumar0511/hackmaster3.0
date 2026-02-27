
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

    const teamNames2028 = [
        "Team DC", "Team D2", "Team Tony", "Team Rocket", "Team V3 Gen-Vals",
        "Narcosk", "Team Tech", "Team Kratos", "Team Vortex", "Team BT",
        "Team Elite", "Team Dual", "Team Elevate", "House Stark", "Team Duo",
        "Team GBU", "Team KKXMW", "Dream Weavers", "Walt white", "Peace",
        "Team Nova", "Team Combo", "Team spartan", "Team Cocktail", "Teen Titans",
        "Benat", "Team 404", "Team HIPRO", "Team Harrington", "Etta-Squad", "Team Techie",
        "Tech Pulse", "Code Crew", "Pixel Team", "Logic Lab", "Data Squad",
        "Byte Team", "Code Wave", "Tech Spark", "Pixel Minds", "Code Hive",
        "Logic Crew", "Data Minds", "Tech Orbit", "Code Nest", "Pixel Crew",
        "Byte Minds", "Tech Flow", "Code Circle", "Logic Squad", "Data Crew",
        "Tech Core", "Code Pulse", "Pixel Squad", "The Axiom", "Dino",
        "Velvet Vectors", "TechVira", "Codex", "Dynamind", "NextGen Navigators",
        "Generator Genius", "Techtitans",
        "NOVA", "MIND MATRIX", "SPARK AI", "BINARY BRAINS", "ALGORHYTHMS",
        "PARABOL", "SQUAD", "TECH SPARK", "Elite", "CEREVEX",
        "PowerHouse1", "PowerHouse2", "Tech Sparrow", "Code Titans", "Stack Slayers",
        "Dev Dynamos", "Techtrons", "BrainForge", "GodLike", "The Byte Busters",
        "DevElan", "The Outliers", "SynapX", "Thunder", "Shadow",
        "The_inno8ters", "Quantum Warriors", "Cyber Knights", "Data Strikers", "Cloud Ninjas",
        "Cyber Storm"
    ];

    const [[{ b28cnt }]] = await pool.execute('SELECT COUNT(*) as cnt FROM teams WHERE batch = "2028"');
    if (b28cnt === 0) {
        console.log('🌱 Seeding Batch 2028 Teams (94 total)...');
        for (let i = 0; i < teamNames2028.length; i++) {
            const teamNum = i + 1;
            const name = teamNames2028[i];
            const username = `t28-${String(teamNum).padStart(3, '0')}`;
            const plainPass = `team28@${String(teamNum).padStart(3, '0')}`;
            const hashedPass = bcrypt.hashSync(plainPass, 10);

            await pool.execute(
                "INSERT INTO users (username, password, role, team_number, team_name, batch) VALUES (?, ?, 'team', ?, ?, '2028')",
                [username, hashedPass, teamNum, name]
            );
            await pool.execute(
                "INSERT INTO teams (team_number, name, batch) VALUES (?, ?, '2028')",
                [teamNum, name]
            );
        }
    }

    console.log('✅ Initial Seeding Verified');
}
