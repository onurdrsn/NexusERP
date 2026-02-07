import { query, getClient } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import { Router } from './utils/router';
import { hashPassword } from './utils/auth';
import { logAudit } from './utils/auditLogger';

const router = new Router();

router.get('/', async (event, context, params, user) => {
    try {
        const result = await query(`
            SELECT u.id, u.email, u.full_name, u.is_active, u.created_at,
                   COALESCE(r.name, 'user') as role
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            ORDER BY u.created_at DESC
        `);
        return apiResponse(200, result.rows || []);
    } catch (error) {
        return apiError(500, 'Failed to fetch users', error);
    }
});

router.post('/', async (event, context, params, user) => {
    const client = await getClient();
    try {
        const { email, password, full_name, role } = JSON.parse(event.body || '{}');

        if (!email || !password || !full_name) {
            return apiError(400, 'Missing required fields');
        }

        const hashedPassword = await hashPassword(password);

        await client.query('BEGIN');

        // 1. Insert User
        const userResult = await client.query(`
            INSERT INTO users (email, password_hash, full_name, is_active)
            VALUES ($1, $2, $3, true)
            RETURNING id, email, full_name, is_active, created_at
        `, [email, hashedPassword, full_name]);

        const newUser = userResult.rows[0];

        // 2. Get or Create Role ID
        const targetRole = role || 'user';
        let roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [targetRole]);

        console.log("roleRes", roleRes);
        if (roleRes.rows.length === 0) {
            roleRes = await client.query('INSERT INTO roles (name) VALUES ($1) RETURNING id', [targetRole]);
        }

        const roleId = roleRes.rows[0].id;

        // 3. Link User to Role
        await client.query(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
        `, [newUser.id, roleId]);

        // Audit Log
        await logAudit(user!.id, 'USER_CREATED', { targetId: newUser.id, email: newUser.email, role: targetRole }, client);

        await client.query('COMMIT');

        return apiResponse(201, { ...newUser, role: targetRole });
    } catch (error) {
        await client.query('ROLLBACK');
        return apiError(500, 'Failed to create user', error);
    } finally {
        client.release();
    }
});

// Update user by ID
router.put('/:id', async (event, context, params, user) => {
    const client = await getClient();
    try {
        const { id } = params;
        const { full_name, role, is_active } = JSON.parse(event.body || '{}');

        await client.query('BEGIN');

        // 1. Update User
        const userResult = await client.query(`
            UPDATE users 
            SET full_name = COALESCE($2, full_name), 
                is_active = COALESCE($3, is_active)
            WHERE id = $1
            RETURNING id, email, full_name, is_active
        `, [id, full_name, is_active]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return apiError(404, 'User not found');
        }

        const updatedUser = userResult.rows[0];

        // 2. Update Role if provided
        if (role) {
            // Get or Create Role ID
            let roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [role]);
            if (roleRes.rows.length === 0) {
                roleRes = await client.query('INSERT INTO roles (name) VALUES ($1) RETURNING id', [role]);
            }
            const roleId = roleRes.rows[0].id;

            // Delete old roles and insert new one (simplification)
            await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [id, roleId]);
        }

        // Audit Log
        await logAudit(user!.id, 'USER_UPDATED', { targetId: id, changes: { full_name, role, is_active } }, client);

        await client.query('COMMIT');

        // Fetch the role name if we didn't update it now (for the response)
        const finalRoleResult = await client.query(`
            SELECT r.name FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
            LIMIT 1
        `, [id]);

        return apiResponse(200, {
            ...updatedUser,
            role: finalRoleResult.rows[0]?.name || 'user'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return apiError(500, 'Failed to update user', error);
    } finally {
        client.release();
    }
});

// Admin: Reset password for a user
router.post('/:id/reset-password', async (event, context, params) => {
    try {
        const { id } = params;
        const { temp_password } = JSON.parse(event.body || '{}');

        if (!temp_password) return apiError(400, 'Temp password is required');

        const hashedPassword = await hashPassword(temp_password);

        await query(`
            UPDATE users 
            SET password_hash = $2, requires_password_change = true 
            WHERE id = $1
        `, [id, hashedPassword]);

        // Audit Log
        const authUser = (event as any).user;
        await logAudit(authUser?.id || id, 'USER_PASSWORD_RESET', { targetId: id, entity: 'USER' });

        return apiResponse(200, { message: 'Password reset successfully' });
    } catch (error) {
        return apiError(500, 'Failed to reset password', error);
    }
});

export const handler = requireAuth(router.handle.bind(router));
