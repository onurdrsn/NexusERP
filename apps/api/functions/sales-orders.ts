import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError } from './utils/apiResponse';
import { Router } from './utils/router';
import { validateOrder, calculateOrderTotal, validateOrderStateTransition, OrderStatus } from '@nexus/core';
import { logAudit, getIp } from './utils/auditLogger';

const router = new Router();

// GET /api/orders
router.get('/', async (event, context, params, user) => {
    console.log('[GET /] Fetching orders...');
    try {
        const result = await query(`
        SELECT o.*, c.name as customer_name 
        FROM sales_orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.is_deleted = false
        ORDER BY o.created_at DESC
      `);
        return apiResponse(200, result.rows || []);
    } catch (error) {
        return apiError(500, 'Failed to fetch orders', error);
    }
});

// GET /api/orders/:id
router.get('/:id', async (event, context, params, user) => {
    try {
        const result = await query(`
        SELECT o.*, c.name as customer_name,
               json_agg(json_build_object(
                 'product_id', oi.product_id,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'product_name', p.name
               )) as items
        FROM sales_orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN sales_order_items oi ON o.id = oi.sales_order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.id = $1
        GROUP BY o.id, c.name
      `, [params.id]);

        if (result.rows.length === 0) return apiError(404, 'Order not found');
        return apiResponse(200, result.rows[0]);
    } catch (error) {
        return apiError(500, 'Failed to fetch order', error);
    }
});

// POST /api/orders
router.post('/', async (event, context, params, user) => {
    try {
        if (!event.body) return apiError(400, 'Missing body');
        const orderData = JSON.parse(event.body);

        // Core Logic Validation
        const validation = validateOrder(orderData);
        if (!validation.isValid) {
            return apiError(400, 'Invalid order data', validation.errors);
        }

        const totalAmount = calculateOrderTotal(orderData.items);

        const client = await import('./utils/db').then(m => m.getClient());
        try {
            await client.query('BEGIN');

            const orderRes = await client.query(
                `INSERT INTO sales_orders (customer_id, status, total_amount, created_by)
           VALUES ($1, $2, $3, $4) RETURNING id`,
                [orderData.customer_id, 'DRAFT', totalAmount, user!.id]
            );
            const orderId = orderRes.rows[0].id;

            for (const item of orderData.items) {
                await client.query(
                    `INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4)`,
                    [orderId, item.product_id, item.quantity, item.unit_price]
                );
            }

            await logAudit(user!.id, 'SALES_ORDER_CREATED', { id: orderId, totalAmount, customer_id: orderData.customer_id }, getIp(event), client);

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
});

// PUT /api/orders/:id
router.put('/:id', async (event, context, params, user) => {
    try {
        if (!event.body) return apiError(400, 'Missing body');
        const { status } = JSON.parse(event.body);
        const id = params.id;

        // Fetch current status
        const currentOrderRes = await query('SELECT status FROM sales_orders WHERE id = $1', [id]);
        if (currentOrderRes.rows.length === 0) return apiError(404, 'Order not found');
        const currentStatus = currentOrderRes.rows[0].status as OrderStatus;

        // Core Logic Transition Check
        if (!validateOrderStateTransition(currentStatus, status)) {
            return apiError(400, `Invalid status transition from ${currentStatus} to ${status}`);
        }

        await query('UPDATE sales_orders SET status = $1 WHERE id = $2', [status, id]);
        await logAudit(user!.id, 'SALES_ORDER_STATUS_UPDATED', { id, status, previousStatus: currentStatus }, getIp(event));
        return apiResponse(200, { message: `Order status updated to ${status}` });

    } catch (error) {
        return apiError(500, 'Failed to update order', error);
    }
});

// POST /api/orders/:id/approve
router.post('/:id/approve', async (event, context, params, user) => {
    const { id } = params;
    const client = await import('./utils/db').then(m => m.getClient());
    try {
        await client.query('BEGIN');

        // 1. Fetch order and items
        const orderRes = await client.query('SELECT status FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
        if (orderRes.rows.length === 0) return apiError(404, 'Order not found');
        const order = orderRes.rows[0];

        if (order.status !== 'DRAFT') {
            return apiError(400, `Cannot approve order in ${order.status} status`);
        }

        const itemsRes = await client.query('SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = $1', [id]);

        // 2. Deduct Stock
        for (const item of itemsRes.rows) {
            // Get first warehouse
            const whRes = await client.query('SELECT id FROM warehouses WHERE is_deleted = false LIMIT 1');
            const warehouseId = whRes.rows[0]?.id;
            if (!warehouseId) throw new Error('No active warehouse found for stock deduction');

            // Check current stock
            const stockRes = await client.query(
                'SELECT SUM(quantity) as balance FROM stock_movements WHERE product_id = $1 AND warehouse_id = $2',
                [item.product_id, warehouseId]
            );
            const currentStock = Number(stockRes.rows[0].balance || 0);

            if (currentStock < item.quantity) {
                const prodRes = await client.query('SELECT name FROM products WHERE id = $1', [item.product_id]);
                throw new Error(`Insufficient stock for ${prodRes.rows[0]?.name || 'product'}. Available: ${currentStock}, Required: ${item.quantity}`);
            }

            // Create movement
            await client.query(
                `INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_type, reference_id, created_by)
                 VALUES ($1, $2, $3, 'OUT', 'SALES_ORDER', $4, $5)`,
                [item.product_id, warehouseId, -item.quantity, id, user!.id]
            );
        }

        // 3. Update Status
        await client.query("UPDATE sales_orders SET status = 'APPROVED' WHERE id = $1", [id]);

        // 4. Audit Log
        await logAudit(user!.id, 'SALES_ORDER_APPROVED', { id }, getIp(event), client);

        await client.query('COMMIT');
        return apiResponse(200, { message: 'Order approved and stock deducted' });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Approval Error:', error);
        return apiError(400, error.message || 'Failed to approve order');
    } finally {
        client.release();
    }
});

export const ordersHandler = requireAuth(router.handle.bind(router));
