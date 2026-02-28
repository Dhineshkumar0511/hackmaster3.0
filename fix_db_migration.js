import pool from './server/db.js';

async function fixSchema() {
    try {
        console.log('🔍 Checking for missing columns...');

        // Check teams table for is_ghost
        try {
            await pool.execute('SELECT is_ghost FROM teams LIMIT 1');
            console.log('✅ is_ghost column exists in teams table.');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚡ Adding is_ghost column to teams table...');
                await pool.execute('ALTER TABLE teams ADD COLUMN is_ghost BOOLEAN DEFAULT FALSE');
            } else {
                throw err;
            }
        }

        // Check evaluation_results for identity_verified
        try {
            await pool.execute('SELECT identity_verified FROM evaluation_results LIMIT 1');
            console.log('✅ identity_verified column exists in evaluation_results table.');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚡ Adding identity_verified column to evaluation_results table...');
                await pool.execute('ALTER TABLE evaluation_results ADD COLUMN identity_verified BOOLEAN DEFAULT TRUE');
            } else {
                throw err;
            }
        }

        // Check evaluation_results for plagiarism_risk
        try {
            await pool.execute('SELECT plagiarism_risk FROM evaluation_results LIMIT 1');
            console.log('✅ plagiarism_risk column exists in evaluation_results table.');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚡ Adding plagiarism_risk column to evaluation_results table...');
                await pool.execute("ALTER TABLE evaluation_results ADD COLUMN plagiarism_risk VARCHAR(50) DEFAULT 'Low'");
            } else {
                throw err;
            }
        }

        console.log('🚀 Schema synchronization complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to fix schema:', err);
        process.exit(1);
    }
}

fixSchema();
