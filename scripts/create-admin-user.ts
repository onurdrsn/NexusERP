import { query } from '../netlify/functions/utils/db';
import { hashPassword } from '../netlify/functions/utils/auth';

const createAdmin = async () => {
    const email = 'admin@example.com';
    const password = 'admin123';
    const fullName = 'System Admin';

    try {
        console.log(`Creating admin user: ${email}`);

        // Check if exists
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if ((existing.rowCount ?? 0) > 0) {
            console.log('User already exists.');
            return;
        }

        const hashedPassword = await hashPassword(password);

        const userRes = await query(
            'INSERT INTO users (email, password_hash, full_name, is_active) VALUES ($1, $2, $3, true) RETURNING id',
            [email, hashedPassword, fullName]
        );
        const userId = userRes.rows[0].id;

        // Get role
        const roleRes = await query("SELECT id FROM roles WHERE name = 'admin'");
        if (roleRes.rowCount === 0) {
            // Create role if missing?
            console.log('Admin role not found, creating...');
            await query("INSERT INTO roles (name) VALUES ('admin')");
        }

        const roleIdRes = await query("SELECT id FROM roles WHERE name = 'admin'");
        const roleId = roleIdRes.rows[0].id;

        await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);

        console.log(`Admin created successfully. ID: ${userId}`);
        console.log(`Login with: ${email} / ${password}`);
    } catch (error) {
        console.error('Failed to create admin:', error);
    }
};

// Need to handle top-level await or call function
createAdmin().then(() => process.exit(0));
