import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { signToken, comparePassword, hashPassword, verifyToken } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

export const handler: Handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    const path = event.path.replace('/api/auth', '').replace('/app/functions/auth', '');

    // POST /login
    if (path === '/login' && event.httpMethod === 'POST') {
        try {
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

            const roleName = roleResult.rows[0]?.name || 'user';

            const token = signToken({ id: user.id, email: user.email, role: roleName });

            // Build User DTO
            const userDto = {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: roleName,
            };

            return apiResponse(200, { token, user: userDto });
        } catch (error) {
            return apiError(500, 'Internal Server Error', error);
        }
    }

    // GET /me
    if (path === '/me' && event.httpMethod === 'GET') {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader) return apiError(401, 'Checking Me: Missing token');

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) return apiError(401, 'Invalid token');

        try {
            const result = await query('SELECT id, email, full_name, is_active FROM users WHERE id = $1', [decoded.id]);
            const user = result.rows[0];
            if (!user) return apiError(404, 'User not found');

            // Fetch role
            const roleResult = await query(`
       SELECT r.name FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1
     `, [user.id]);
            const roleName = roleResult.rows[0]?.name || 'user';

            return apiResponse(200, { ...user, role: roleName });
        } catch (error) {
            return apiError(500, 'Internal Server Error', error);
        }
    }

    // Debug/Dev only: Register (for standard setup)
    if (path === '/register' && event.httpMethod === 'POST') {
        try {
            if (!event.body) return apiError(400, 'Missing body');
            const { email, password, full_name } = JSON.parse(event.body);

            const hashedPassword = await hashPassword(password);

            const result = await query(
                'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email',
                [email, hashedPassword, full_name]
            );

            return apiResponse(201, result.rows[0]);
        } catch (error) {
            return apiError(500, 'Register failed', error);
        }
    }

    return apiError(404, `Not Found: ${path} in Auth`);
};
