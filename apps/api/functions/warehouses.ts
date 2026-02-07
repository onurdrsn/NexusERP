import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import { logAudit, getIp } from './utils/auditLogger';

const warehousesHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    try {
        if (event.httpMethod === 'GET') {
            const result = await query('SELECT * FROM warehouses WHERE is_deleted = false ORDER BY name');
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

            const warehouse = result.rows[0];
            await logAudit(user!.id, 'WAREHOUSE_CREATED', warehouse, getIp(event));
            return apiResponse(201, warehouse);
        }

        if (event.httpMethod === 'DELETE') {
            const id = event.path.split('/').pop();
            await query('UPDATE warehouses SET is_deleted = true WHERE id = $1', [id]);
            await logAudit(user!.id, 'WAREHOUSE_DELETED', { targetId: id }, getIp(event));
            return apiResponse(200, { message: 'Warehouse deleted' });
        }

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        return apiError(500, 'Failed to manage warehouses', error);
    }
};

export const handler = requireAuth(warehousesHandler);
