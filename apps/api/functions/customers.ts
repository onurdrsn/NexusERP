import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import { logAudit, getIp } from './utils/auditLogger';

const customersHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    try {
        if (event.httpMethod === 'GET') {
            const res = await query('SELECT * FROM customers WHERE is_deleted = false ORDER BY name');
            return apiResponse(200, res.rows);
        }

        if (event.httpMethod === 'POST') {
            const { name, email, phone, address } = JSON.parse(event.body || '{}');
            const res = await query(
                'INSERT INTO customers (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, email, phone, address]
            );
            const customer = res.rows[0];
            await logAudit(user!.id, 'CUSTOMER_CREATED', customer, getIp(event));
            return apiResponse(201, customer);
        }

        if (event.httpMethod === 'PUT') {
            const id = event.path.split('/').pop();
            const { name, email, phone, address } = JSON.parse(event.body || '{}');
            const res = await query(
                'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4 WHERE id = $5 RETURNING *',
                [name, email, phone, address, id]
            );
            if (res.rows.length === 0) return apiError(404, 'Customer not found');
            await logAudit(user!.id, 'CUSTOMER_UPDATED', res.rows[0], getIp(event));
            return apiResponse(200, res.rows[0]);
        }

        if (event.httpMethod === 'DELETE') {
            const id = event.path.split('/').pop();
            await query('UPDATE customers SET is_deleted = true WHERE id = $1', [id]);
            await logAudit(user!.id, 'CUSTOMER_DELETED', { targetId: id }, getIp(event));
            return apiResponse(200, { message: 'Customer deleted' });
        }

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        return apiError(500, 'Failed to fetch customers', error);
    }
};

export const customersHandler = requireAuth(customersHandler);
