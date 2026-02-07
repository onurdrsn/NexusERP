import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

const testConnection = async () => {
    try {
        console.log('Testing database connection...');
        const res = await pool.query('SELECT NOW()');
        console.log('Connection successful:', res.rows[0]);
    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        await pool.end();
    }
};

testConnection();
