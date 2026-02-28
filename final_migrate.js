import pool from './server/db.js';

async function migrate() {
    try {
        console.log('⚡ Renaming `is_ghost` to `ghost_team` for TiDB stability...');
        try {
            await pool.execute('ALTER TABLE teams CHANGE is_ghost ghost_team BOOLEAN DEFAULT FALSE');
        } catch (e) {
            console.warn('⚠️ Rename failed (may already be renamed):', e.message);
        }

        // Add it if missing entirely
        const [cols] = await pool.execute('DESCRIBE teams');
        if (!cols.some(c => c.Field === 'ghost_team')) {
            await pool.execute('ALTER TABLE teams ADD COLUMN ghost_team BOOLEAN DEFAULT FALSE');
        }

        console.log('✅ Final columns:', cols.map(c => c.Field).join(', '));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
