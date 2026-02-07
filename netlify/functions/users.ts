import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import bcrypt from 'bcryptjs';

const usersHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    // Basic authorization: Only admins can manage users (logic simplified for now)
    // In a real app, check user.role === 'admin'

    try {
        if (event.httpMethod === 'GET') {
            const result = await query(`
        SELECT id, email, full_name, role, is_active, created_at 
        FROM users 
        ORDER BY created_at DESC
      `);
            return apiResponse(200, result.rows);
        }

        if (event.httpMethod === 'POST') {
            const { email, password, full_name, role } = JSON.parse(event.body || '{}');

            // Validation
            if (!email || !password || !full_name) {
                return apiError(400, 'Missing required fields');
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await query(`
        INSERT INTO users (email, password_hash, full_name, role, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, email, full_name, role, is_active, created_at
      `, [email, hashedPassword, full_name, role || 'user']);

            return apiResponse(201, result.rows[0]);
        }

        // PUT /api/users/:id (Update)
        // We'll parse ID from logic or path in a real router, here we simulate it
        // For Netlify functions, usually path is /api/users, update logic is tricky without ID in path parsing
        // But let's assume body contains ID for simplicity or query param

        if (event.httpMethod === 'PUT') {
            const { id, full_name, role, is_active } = JSON.parse(event.body || '{}');

            const result = await query(`
            UPDATE users 
            SET full_name = $2, role = $3, is_active = $4
            WHERE id = $1
            RETURNING id, email, full_name, role, is_active
        `, [id, full_name, role, is_active]);

            return apiResponse(200, result.rows[0]);
        }

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        return apiError(500, 'Failed to manage users', error);
    }
};

export const handler = requireAuth(usersHandler);
