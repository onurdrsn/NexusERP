const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from root
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    console.log('Running migration (JS)...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fix Customers Table
        await client.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;');
        await client.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;');
        await client.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
        console.log('Customers table updated.');

        // 2. Fix Sales Orders Table
        await client.query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2);');
        await client.query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);');
        await client.query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
        console.log('Sales orders table updated.');

        // 3. Fix Audit Logs Table
        await client.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;');
        console.log('Audit logs table updated.');

        // 4. Fix Suppliers, Warehouses and Products
        await client.query('ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
        await client.query('ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
        await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
        console.log('Suppliers, Warehouses and Products updated.');

        // 5. Ensure Default Warehouse
        const whRes = await client.query('SELECT id FROM warehouses LIMIT 1');
        if (whRes.rows.length === 0) {
            await client.query("INSERT INTO warehouses (name, location) VALUES ('Ana Depo', 'Merkez');");
            console.log('Default warehouse created.');
        } else {
            console.log('Warehouse(s) already exist.');
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
