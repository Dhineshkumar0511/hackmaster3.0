
import pool from './server/db.js';
import fs from 'fs';

async function check() {
    try {
        const [columns] = await pool.execute('DESCRIBE mentor_marks');
        let output = 'Mentor Marks columns:\n';
        columns.forEach(c => {
            output += `${c.Field} | ${c.Type} | ${c.Null} | ${c.Key} | ${c.Default}\n`;
        });
        fs.writeFileSync('mentor_marks_info.txt', output);
        console.log('Done');
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('mentor_marks_info.txt', 'Error: ' + err.stack);
        process.exit(1);
    }
}

check();
