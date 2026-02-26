import mysql from 'mysql2/promise';
import 'dotenv/config';

async function testDb() {
    const pool = await mysql.createPool({
        uri: process.env.DATABASE_URL.replace('/test', '/'),
        ssl: { rejectUnauthorized: false }
    });

    const [dbs] = await pool.query('SHOW DATABASES');
    console.log('Databases:', dbs);

    await pool.end();
}

testDb();
