
import pool from './server/db.js';

async function fix() {
    try {
        console.log('Adding batch column to submissions table...');
        await pool.execute('ALTER TABLE submissions ADD COLUMN batch VARCHAR(10) AFTER team_name');
        console.log('Done');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fix();
