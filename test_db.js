import mysql from 'mysql2/promise';
import 'dotenv/config';

async function testDb() {
    const pool = await mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const [subs] = await pool.query('SELECT id, team_id, github_url FROM submissions LIMIT 5');
    console.log('Submissions:', subs);

    const [results] = await pool.query('SELECT * FROM evaluation_results LIMIT 5');
    console.log('Results:', results);

    await pool.end();
}

testDb();
