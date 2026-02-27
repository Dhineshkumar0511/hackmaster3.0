
import pool from './server/db.js';
import fs from 'fs';

async function check() {
    try {
        const [columns] = await pool.execute('DESCRIBE submissions');
        let output = 'Submissions columns:\n';
        columns.forEach(c => {
            output += `${c.Field} | ${c.Type} | ${c.Null} | ${c.Key} | ${c.Default}\n`;
        });
        fs.writeFileSync('schema_info.txt', output);
        console.log('Done');
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('schema_info.txt', 'Error: ' + err.stack);
        process.exit(1);
    }
}

check();
