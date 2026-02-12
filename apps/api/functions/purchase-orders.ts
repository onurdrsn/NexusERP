import { HandlerResponse } from './utils/apiResponse';
import { HandlerEvent, HandlerContext } from './utils/router';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import { logAudit, getIp } from './utils/auditLogger';

const poHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    const pathParts = event.path.split('/');
    const id = pathParts.length > 4 ? pathParts[4] : null;
    const action = pathParts.length > 5 ? pathParts[5] : null;

    try {
        if (event.httpMethod === 'GET' && !id) {
            const result = await query(`
                SELECT po.id, s.name as supplier_name, po.status, po.created_at,
                       (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) as item_count,
                       (SELECT SUM(quantity * price) FROM purchase_order_items WHERE purchase_order_id = po.id) as total_amount
                FROM purchase_orders po
                JOIN suppliers s ON po.supplier_id = s.id
                ORDER BY po.created_at DESC
            `);
            return apiResponse(200, result.rows);
        }

        if (event.httpMethod === 'POST' && !id) {
            const { supplier_id, items } = JSON.parse(event.body || '{}');

            if (!supplier_id || !items || items.length === 0) {
                return apiError(400, 'Supplier and items are required');
            }

            const client = await import('./utils/db').then(m => m.getClient());
            try {
                await client.query('BEGIN');

                const poRes = await client.query(
                    "INSERT INTO purchase_orders (supplier_id, status) VALUES ($1, 'DRAFT') RETURNING id",
                    [supplier_id]
                );
                const poId = poRes.rows[0].id;

                for (const item of items) {
                    await client.query(
                        'INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                        [poId, item.product_id, item.quantity, item.price]
                    );
                }

                await logAudit(user!.id, 'PURCHASE_ORDER_CREATED', { id: poId, supplier_id }, getIp(event), client);

                await client.query('COMMIT');
                return apiResponse(201, { id: poId, status: 'DRAFT' });
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }

        // POST /api/purchase-orders/:id/receive (Receive & Stock IN)
        if (event.httpMethod === 'POST' && id && action === 'receive') {
            const client = await import('./utils/db').then(m => m.getClient());
            try {
                await client.query('BEGIN');

                // Check status
                const poRes = await client.query('SELECT status FROM purchase_orders WHERE id = $1', [id]);
                if (poRes.rows.length === 0) throw new Error('PO not found');
                if (poRes.rows[0].status === 'COMPLETED') throw new Error('PO already received');

                // Get items
                const itemsRes = await client.query('SELECT product_id, quantity FROM purchase_order_items WHERE purchase_order_id = $1', [id]);

                // Add Stock Movements
                for (const item of itemsRes.rows) {
                    // Defaulting to warehouse 1 (UUID needed in real app, strictly handled)
                    // Assuming we have a default warehouse or logic to select one. 
                    // For MVP Refactor, we'll fetch the first warehouse ID.
                    const whRes = await client.query('SELECT id FROM warehouses LIMIT 1');
                    const warehouseId = whRes.rows[0]?.id;

                    if (!warehouseId) throw new Error('No warehouse found');

                    await client.query(
                        `INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_type, reference_id, created_by)
                     VALUES ($1, $2, $3, 'IN', 'PURCHASE_ORDER', $4, $5)`,
                        [item.product_id, warehouseId, item.quantity, id, user.id]
                    );
                }

                // Update PO Status
                await client.query("UPDATE purchase_orders SET status = 'COMPLETED' WHERE id = $1", [id]);

                await logAudit(user!.id, 'PURCHASE_ORDER_RECEIVED', { id }, getIp(event), client);

                await client.query('COMMIT');
                return apiResponse(200, { status: 'COMPLETED' });
            } catch (e: any) {
                await client.query('ROLLBACK');
                return apiError(400, e.message || 'Failed to receive PO');
            } finally {
                client.release();
            }
        }

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        return apiError(500, 'Failed to manage purchase orders', error);
    }
};

export const purchaseOrdersHandler = requireAuth(poHandler);
