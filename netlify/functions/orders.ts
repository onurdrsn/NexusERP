import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

const ordersHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    const path = event.path.replace('/api/orders', '').replace('/.netlify/functions/orders', '');
    const idMatch = path.match(/^\/([a-f0-9-]+)(\/.*)?$/);
    const id = idMatch ? idMatch[1] : null;
    const action = idMatch && idMatch[2] ? idMatch[2].replace('/', '') : null;

    // GET /api/orders -> List
    if (event.httpMethod === 'GET' && !id) {
        try {
            const result = await query(`
        SELECT so.*, c.name as customer_name, 
        (SELECT SUM(quantity * unit_price) FROM sales_order_items WHERE sales_order_id = so.id) as total_amount
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id
        ORDER BY created_at DESC
      `);
            return apiResponse(200, result.rows);
        } catch (error) {
            return apiError(500, 'Failed to fetch orders', error);
        }
    }

    // GET /api/orders/:id -> Detail
    if (event.httpMethod === 'GET' && id && !action) {
        try {
            const orderRes = await query(`
         SELECT so.*, c.name as customer_name 
         FROM sales_orders so
         JOIN customers c ON so.customer_id = c.id
         WHERE so.id = $1
       `, [id]);

            if (orderRes.rowCount === 0) return apiError(404, 'Order not found');

            const itemsRes = await query(`
         SELECT soi.*, p.name as product_name, p.sku 
         FROM sales_order_items soi
         JOIN products p ON soi.product_id = p.id
         WHERE soi.sales_order_id = $1
       `, [id]);

            return apiResponse(200, { ...orderRes.rows[0], items: itemsRes.rows });
        } catch (error) {
            return apiError(500, 'Failed to fetch order', error);
        }
    }

    // POST /api/orders -> Create Draft
    if (event.httpMethod === 'POST' && !id) {
        try {
            if (!event.body) return apiError(400, 'Missing body');
            const { customer_id, items } = JSON.parse(event.body); // items: [{ product_id, quantity, unit_price }]

            const client = await import('./utils/db').then(m => m.getClient());
            try {
                await client.query('BEGIN');

                const orderRes = await client.query(
                    `INSERT INTO sales_orders (customer_id, status) VALUES ($1, 'DRAFT') RETURNING id`,
                    [customer_id]
                );
                const orderId = orderRes.rows[0].id;

                for (const item of items) {
                    await client.query(
                        `INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price)
              VALUES ($1, $2, $3, $4)`,
                        [orderId, item.product_id, item.quantity, item.unit_price]
                    );
                }

                await client.query('COMMIT');
                return apiResponse(201, { id: orderId, message: 'Order created' });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (error) {
            return apiError(500, 'Failed to create order', error);
        }
    }

    // POST /api/orders/:id/approve -> Approve & Allocate Stock
    if (event.httpMethod === 'POST' && id && action === 'approve') {
        try {
            const { warehouse_id } = JSON.parse(event.body || '{}');
            if (!warehouse_id) return apiError(400, 'Warehouse ID required for approval');

            const client = await import('./utils/db').then(m => m.getClient());
            try {
                await client.query('BEGIN');

                // Check status
                const orderRes = await client.query('SELECT status FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
                if (orderRes.rows[0].status !== 'DRAFT') {
                    throw new Error('Order must be in DRAFT status to approve');
                }

                // Get items
                const itemsRes = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [id]);

                // Update Stock (Check if enough first?)
                // Simple check: current stock view
                // Ideally should lock stock rows but view is read-only.
                // We will insert negative movements.
                // Constraint check? Schema doesn't have constraint on quantity < 0.
                // If we want to prevent negative stock, we need a check trigger or logic.
                // For now, implementing logic check.

                for (const item of itemsRes.rows) {
                    const stockRes = await client.query(
                        `SELECT SUM(quantity) as val FROM stock_movements WHERE product_id = $1 AND warehouse_id = $2`,
                        [item.product_id, warehouse_id]
                    );
                    const currentStock = Number(stockRes.rows[0].val || 0);

                    if (currentStock < item.quantity) {
                        throw new Error(`Insufficient stock for product ${item.product_id}`);
                    }

                    // Deduct Stock
                    await client.query(
                        `INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_type, reference_id, created_by)
              VALUES ($1, $2, $3, 'OUT', 'SALES_ORDER', $4, $5)`,
                        [item.product_id, warehouse_id, -item.quantity, id, user.id]
                    );
                }

                // Update Status
                await client.query("UPDATE sales_orders SET status = 'APPROVED' WHERE id = $1", [id]);

                await client.query('COMMIT');
                return apiResponse(200, { message: 'Order approved and stock allocated' });
            } catch (err: any) {
                await client.query('ROLLBACK');
                return apiError(400, err.message || 'Approval failed');
            } finally {
                client.release();
            }
        } catch (error) {
            return apiError(500, 'Failed to approve order', error);
        }
    }

    return apiError(404, `Not Found: ${path}`);
};

export const handler = requireAuth(ordersHandler);
