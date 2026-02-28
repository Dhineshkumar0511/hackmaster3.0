
import pool from './server/db.js';

async function update() {
    try {
        await pool.execute('ALTER TABLE evaluation_results ADD COLUMN plagiarism_risk VARCHAR(50) DEFAULT "Low"');
        console.log('✅ Added plagiarism_risk');
    } catch (e) {
        console.log('⚠️ plagiarism_risk may exist:', e.message);
    }

    try {
        await pool.execute('ALTER TABLE evaluation_results ADD COLUMN identity_verified BOOLEAN DEFAULT TRUE');
        console.log('✅ Added identity_verified');
    } catch (e) {
        console.log('⚠️ identity_verified may exist:', e.message);
    }
    process.exit(0);
}

update();
