
import pool from './server/db.js';

async function update() {
    try {
        await pool.execute('ALTER TABLE evaluation_results ADD COLUMN is_overridden BOOLEAN DEFAULT FALSE');
        await pool.execute('ALTER TABLE evaluation_results ADD COLUMN manual_score INT DEFAULT NULL');
        console.log('✅ Added Override Columns');
    } catch (e) {
        console.log('⚠️ Columns may exist:', e.message);
    }
    process.exit(0);
}

update();
