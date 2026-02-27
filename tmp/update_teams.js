
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const pool = mysql.createPool({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true },
});

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

async function updateAndExport() {
    try {
        console.log('🌱 Updating Batch 2028 Teams (94 total)...');

        // Get IDs of teams to be deleted
        const [rows] = await pool.execute("SELECT id FROM teams WHERE batch = '2028'");
        const teamIds = rows.map(r => r.id);

        if (teamIds.length > 0) {
            const idList = teamIds.join(',');
            // Delete from dependent tables
            await pool.execute(`DELETE FROM evaluation_results WHERE submission_id IN (SELECT id FROM submissions WHERE team_id IN (${idList}))`);
            await pool.execute(`DELETE FROM submissions WHERE team_id IN (${idList})`);
            await pool.execute(`DELETE FROM mentor_marks WHERE team_id IN (${idList})`);
            await pool.execute(`DELETE FROM team_tasks WHERE team_id IN (${idList})`);
            await pool.execute(`DELETE FROM support_requests WHERE team_id IN (${idList})`);
            await pool.execute(`DELETE FROM certificates WHERE team_id IN (${idList})`);
        }

        // Clear existing 2028 teams/users
        await pool.execute("DELETE FROM users WHERE role = 'team' AND batch = '2028'");
        await pool.execute("DELETE FROM teams WHERE batch = '2028'");

        let csvContent = "Team Number,Team Name,Username,Password\n";

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

            csvContent += `${teamNum},"${name}",${username},${plainPass}\n`;
        }

        fs.writeFileSync('./batch_2028_teams.csv', csvContent);
        console.log('✅ Teams updated and batch_2028_teams.csv generated.');
    } catch (err) {
        console.error('❌ Error updating teams:', err);
    } finally {
        process.exit(0);
    }
}

updateAndExport();
