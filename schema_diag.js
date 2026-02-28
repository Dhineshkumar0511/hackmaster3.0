import pool from './server/db.js';

async function checkMultipleSchemas() {
    try {
        const [rows] = await pool.execute('SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = "teams"');
        console.log('--- TEAMS TABLES ACROSS SCHEMAS ---');
        console.log(JSON.stringify(rows));

        for (const row of rows) {
            console.log(`Checking columns in ${row.TABLE_SCHEMA}.${row.TABLE_NAME}...`);
            const [cols] = await pool.execute(`DESCRIBE ${row.TABLE_SCHEMA}.${row.TABLE_NAME}`);
            console.log('Columns:', cols.map(c => c.Field).join(', '));
        }

        const [db] = await pool.execute('SELECT DATABASE() as db');
        console.log('CURRENT SESSION DB:', db[0].db);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMultipleSchemas();
