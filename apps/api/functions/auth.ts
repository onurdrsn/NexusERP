import { query, getClient } from './utils/db';
import { signToken, comparePassword, hashPassword, verifyToken } from './utils/auth';
import { apiResponse, apiError, handleOptions, HandlerResponse } from './utils/apiResponse';
import { Router, HandlerEvent, HandlerContext } from './utils/router';

const router = new Router();

// POST /login
router.post('/login', async (event) => {
    if (!event.body) return apiError(400, 'Missing body');
    const { email, password } = JSON.parse(event.body);

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return apiError(401, 'Invalid credentials');

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) return apiError(401, 'Invalid credentials');

    // Fetch role
    const roleResult = await query(`
        SELECT r.name FROM roles r
        JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `, [user.id]);

    console.log(`[Auth] Role check for ${user.email}:`, roleResult.rows);
    const roleName = roleResult.rows[0]?.name || 'user';

    const token = signToken({ id: user.id, email: user.email, role: roleName });

    const userDto = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: roleName,
        requires_password_change: user.requires_password_change
    };

    return apiResponse(200, { token, user: userDto });
});

// POST /change-password (Authenticated User)
router.post('/change-password', async (event) => {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) return apiError(401, 'Missing token');

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) return apiError(401, 'Invalid token');

    const { new_password } = JSON.parse(event.body || '{}');
    if (!new_password) return apiError(400, 'New password is required');

    const hashedPassword = await hashPassword(new_password);

    try {
        await query(`
            UPDATE users 
            SET password_hash = $2, requires_password_change = false 
            WHERE id = $1
        `, [decoded.id, hashedPassword]);

        return apiResponse(200, { message: 'Password changed successfully' });
    } catch (error) {
        return apiError(500, 'Failed to change password', error);
    }
});

// GET /me
router.get('/me', async (event) => {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) return apiError(401, 'Checking Me: Missing token');

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) return apiError(401, 'Invalid token');

    const result = await query('SELECT id, email, full_name, is_active, requires_password_change FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user) return apiError(404, 'User not found');

    const roleResult = await query(`
       SELECT r.name FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1
     `, [user.id]);
    const roleName = roleResult.rows[0]?.name || 'user';

    return apiResponse(200, { ...user, role: roleName });
});

// POST /register
router.post('/register', async (event) => {
    if (!event.body) return apiError(400, 'Missing body');
    const { email, password, full_name } = JSON.parse(event.body);

    const hashedPassword = await hashPassword(password);
    const client = await getClient();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
            [email, hashedPassword, full_name]
        );
        const newUser = result.rows[0];

        // Assign default 'user' role
        let roleRes = await client.query('SELECT id FROM roles WHERE name = $1', ['user']);
        if (roleRes.rows.length === 0) {
            roleRes = await client.query('INSERT INTO roles (name) VALUES ($1) RETURNING id', ['user']);
        }
        const roleId = roleRes.rows[0].id;

        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [newUser.id, roleId]);

        await client.query('COMMIT');

        return apiResponse(201, { ...newUser, role: 'user' });
    } catch (e) {
        await client.query('ROLLBACK');
        return apiError(500, 'Failed to register', e);
    } finally {
        client.release();
    }
});

export const authHandler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
    return router.handle(event, context);
};
