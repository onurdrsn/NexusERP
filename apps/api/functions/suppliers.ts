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
                const result = await query('SELECT * FROM suppliers WHERE is_deleted = false ORDER BY name');
                return apiResponse(200, result.rows);
            } catch (error) {
                return apiError(500, 'Failed to fetch suppliers', error);
            }
        },
        POST: async () => {
            const pathParts = getPathParts();
            const isDeleteAction = pathParts[pathParts.length - 1] === 'delete';

            try {
                if (isDeleteAction) {
                    const id = pathParts[pathParts.length - 2];
                    if (!id) return apiError(400, 'Supplier ID is required');

                    await query('UPDATE suppliers SET is_deleted = true WHERE id = $1', [id]);
                    await logAudit(user!.id, 'SUPPLIER_DELETED', { targetId: id }, getIp(event));
                    return apiResponse(200, { message: 'Supplier deleted' });
                }

                const { name, email, phone } = JSON.parse(event.body || '{}');
                if (!name) return apiError(400, 'Name is required');

                const result = await query(
                    `
                INSERT INTO suppliers (name, email, phone)
                VALUES ($1, $2, $3)
                RETURNING *
            `,
                    [name, email, phone]
                );

                const supplier = result.rows[0];
                await logAudit(user!.id, 'SUPPLIER_CREATED', supplier, getIp(event));
                return apiResponse(201, supplier);
            } catch (error) {
                return apiError(500, 'Failed to manage suppliers', error);
            }
        },
    });
};

export const suppliersHandler = requireAuth(handler);
