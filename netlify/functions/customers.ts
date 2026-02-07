import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

const customersHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    try {
        if (event.httpMethod === 'GET') {
            const res = await query('SELECT id, name, email FROM customers ORDER BY name');
            return apiResponse(200, res.rows);
        }

        // Allow creating customer for testing if needed
        if (event.httpMethod === 'POST') {
            const { name, email, phone, address } = JSON.parse(event.body || '{}');
            const res = await query(
                'INSERT INTO customers (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, email, phone, address]
            );
            return apiResponse(201, res.rows[0]);
        }

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        return apiError(500, 'Failed to fetch customers', error);
    }
};

export const handler = requireAuth(customersHandler);
