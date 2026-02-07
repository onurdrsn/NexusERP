import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

const suppliersHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    try {
        if (event.httpMethod === 'GET') {
            const result = await query('SELECT * FROM suppliers ORDER BY name');
            return apiResponse(200, result.rows);
        }

        if (event.httpMethod === 'POST') {
            const { name, email, phone } = JSON.parse(event.body || '{}');

            if (!name) return apiError(400, 'Name is required');

            const result = await query(`
        INSERT INTO suppliers (name, email, phone)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [name, email, phone]);

            return apiResponse(201, result.rows[0]);
        }

        // PUT and DELETE can be added as needed

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        return apiError(500, 'Failed to manage suppliers', error);
    }
};

export const handler = requireAuth(suppliersHandler);
