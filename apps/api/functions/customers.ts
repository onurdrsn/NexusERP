import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError } from './utils/apiResponse';
import { logAudit, getIp } from './utils/auditLogger';
import { dispatchByMethod } from './utils/methodHandler';

const handler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    const getPathParts = () => event.path.split('/').filter(Boolean);

    return await dispatchByMethod(event, context, user!, {
        GET: async () => {
            try {
                const res = await query('SELECT * FROM customers WHERE is_deleted = false ORDER BY name');
                return apiResponse(200, res.rows);
            } catch (error) {
                return apiError(500, 'Failed to fetch customers', error);
            }
        },
        POST: async () => {
            const pathParts = getPathParts();
            const isDeleteAction = pathParts[pathParts.length - 1] === 'delete';

            try {
                if (isDeleteAction) {
                    const id = pathParts[pathParts.length - 2];
                    if (!id) return apiError(400, 'Customer ID is required');

                    await query('UPDATE customers SET is_deleted = true WHERE id = $1', [id]);
                    await logAudit(user!.id, 'CUSTOMER_DELETED', { targetId: id }, getIp(event));
                    return apiResponse(200, { message: 'Customer deleted' });
                }

                const { name, email, phone, address } = JSON.parse(event.body || '{}');
                const res = await query(
                    'INSERT INTO customers (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
                    [name, email, phone, address]
                );
                const customer = res.rows[0];
                await logAudit(user!.id, 'CUSTOMER_CREATED', customer, getIp(event));
                return apiResponse(201, customer);
            } catch (error) {
                return apiError(500, 'Failed to manage customers', error);
            }
        },
        PUT: async () => {
            const pathParts = getPathParts();
            const id = pathParts[pathParts.length - 1];
            if (!id) return apiError(400, 'Customer ID is required');

            try {
                const { name, email, phone, address } = JSON.parse(event.body || '{}');
                const res = await query(
                    'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4 WHERE id = $5 RETURNING *',
                    [name, email, phone, address, id]
                );
                if (res.rows.length === 0) return apiError(404, 'Customer not found');

                await logAudit(user!.id, 'CUSTOMER_UPDATED', res.rows[0], getIp(event));
                return apiResponse(200, res.rows[0]);
            } catch (error) {
                return apiError(500, 'Failed to manage customers', error);
            }
        },
    });
};

export const customersHandler = requireAuth(handler);
