import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import { logAudit, getIp } from './utils/auditLogger';

const handler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    try {
        if (event.httpMethod === 'GET') {
            const result = await query('SELECT * FROM suppliers WHERE is_deleted = false ORDER BY name');
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

            const supplier = result.rows[0];
            await logAudit(user!.id, 'SUPPLIER_CREATED', supplier, getIp(event));
            return apiResponse(201, supplier);
        }

        if (event.httpMethod === 'DELETE') {
            const id = event.path.split('/').pop();
            await query('UPDATE suppliers SET is_deleted = true WHERE id = $1', [id]);
            await logAudit(user!.id, 'SUPPLIER_DELETED', { targetId: id }, getIp(event));
            return apiResponse(200, { message: 'Supplier deleted' });
        }

        // PUT and DELETE can be added as needed

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        return apiError(500, 'Failed to manage suppliers', error);
    }
};

export const suppliersHandler = requireAuth(handler);
