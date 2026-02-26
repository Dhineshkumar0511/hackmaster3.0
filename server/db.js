
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ FATAL ERROR: DATABASE_URL is missing!');
    process.exit(1);
}

export const pool = mysql.createPool({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export default pool;
