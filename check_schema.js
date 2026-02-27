
import pool from './server/db.js';

async function check() {
    try {
        const [columns] = await pool.execute('DESCRIBE submissions');
        console.log('Submissions columns:');
        console.table(columns);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
