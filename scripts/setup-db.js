import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

const setup = async () => {
    try {
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema.sql...');
        await pool.query(schemaSql);
        console.log('Schema applied successfully.');

        // Create default admin user if not exists?
        // Let's create a default role at least.
        console.log('Seeding initial data...');
        await pool.query(`
      INSERT INTO roles (name) VALUES ('admin'), ('manager'), ('user') 
      ON CONFLICT (name) DO NOTHING;
    `);

        console.log('Database setup complete.');
    } catch (error) {
        console.error('Setup failed:', error);
    } finally {
        await pool.end();
    }
};

setup();
