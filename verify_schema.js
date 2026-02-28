import pool from './server/db.js';

async function verify() {
    try {
        const [rows] = await pool.execute('SHOW TABLES LIKE "teams"');
        if (rows.length > 0) {
            console.log('✅ teams table exists.');
            const [cols] = await pool.execute('DESCRIBE teams');
            const names = cols.map(c => c.Field);
            console.log('Columns:', names.join(', '));
            if (names.includes('is_ghost')) {
                console.log('✅ is_ghost EXISTS');
            } else {
                console.log('❌ is_ghost MISSING');
            }
        } else {
            console.log('❌ teams table is missing.');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error verifying schema:', err);
        process.exit(1);
    }
}

verify();
