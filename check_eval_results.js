
import pool from './server/db.js';
import fs from 'fs';

async function check() {
    try {
        const [columns] = await pool.execute('DESCRIBE evaluation_results');
        let output = 'Evaluation Results columns:\n';
        columns.forEach(c => {
            output += `${c.Field} | ${c.Type} | ${c.Null} | ${c.Key} | ${c.Default}\n`;
        });
        fs.writeFileSync('eval_results_info.txt', output);
        console.log('Done');
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('eval_results_info.txt', 'Error: ' + err.stack);
        process.exit(1);
    }
}

check();
