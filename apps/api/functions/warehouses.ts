import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

const warehousesHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    try {
        if (event.httpMethod === 'GET') {
            const result = await query('SELECT * FROM warehouses ORDER BY name');
            return apiResponse(200, result.rows);
        }

        if (event.httpMethod === 'POST') {
            const { name, location } = JSON.parse(event.body || '{}');

            if (!name) return apiError(400, 'Name is required');

            const result = await query(`
        INSERT INTO warehouses (name, location)
        VALUES ($1, $2)
        RETURNING *
      `, [name, location]);

            return apiResponse(201, result.rows[0]);
        }

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        return apiError(500, 'Failed to manage warehouses', error);
    }
};

export const handler = requireAuth(warehousesHandler);
