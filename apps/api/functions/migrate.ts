import { query } from './utils/db';

async function runMigration() {
    console.log('Running migration...');
    try {
        // 1. Fix Customers Table
        await query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;');
        await query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;');
        console.log('Customers table updated.');

        // 2. Ensure Default Warehouse
        const whRes = await query('SELECT id FROM warehouses LIMIT 1');
        if (whRes.rows.length === 0) {
            await query("INSERT INTO warehouses (name, location) VALUES ('Ana Depo', 'Merkez');");
            console.log('Default warehouse created.');
        } else {
            console.log('Warehouse(s) already exist.');
        }

    } catch (e) {
        console.error('Migration failed:', e);
    }
}

runMigration();
