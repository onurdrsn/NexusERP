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
                const result = await query('SELECT * FROM warehouses WHERE is_deleted = false ORDER BY name');
                return apiResponse(200, result.rows);
            } catch (error) {
                return apiError(500, 'Failed to fetch warehouses', error);
            }
        },
        POST: async () => {
            const pathParts = getPathParts();
            const isDeleteAction = pathParts[pathParts.length - 1] === 'delete';

            try {
                if (isDeleteAction) {
                    const id = pathParts[pathParts.length - 2];
                    if (!id) return apiError(400, 'Warehouse ID is required');

                    await query('UPDATE warehouses SET is_deleted = true WHERE id = $1', [id]);
                    await logAudit(user!.id, 'WAREHOUSE_DELETED', { targetId: id }, getIp(event));
                    return apiResponse(200, { message: 'Warehouse deleted' });
                }

                const { name, location } = JSON.parse(event.body || '{}');
                if (!name) return apiError(400, 'Name is required');

                const result = await query(
                    `
                INSERT INTO warehouses (name, location)
                VALUES ($1, $2)
                RETURNING *
            `,
                    [name, location]
                );

                const warehouse = result.rows[0];
                await logAudit(user!.id, 'WAREHOUSE_CREATED', warehouse, getIp(event));
                return apiResponse(201, warehouse);
            } catch (error) {
                return apiError(500, 'Failed to manage warehouses', error);
            }
        },
    });
};

export const warehousesHandler = requireAuth(handler);
