import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import { Router } from './utils/router';
import { validateOrder, calculateOrderTotal, validateOrderStateTransition, OrderStatus } from '@nexus/core';

const router = new Router();

// GET /api/orders
router.get('/', async (event, context, params, user) => {
    try {
        const result = await query(`
        SELECT o.*, c.name as customer_name 
        FROM orders o
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
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
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
                `INSERT INTO orders (customer_id, status, total_amount, created_by)
           VALUES ($1, $2, $3, $4) RETURNING id`,
                [orderData.customer_id, 'draft', totalAmount, user!.id]
            );
            const orderId = orderRes.rows[0].id;

            for (const item of orderData.items) {
                await client.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
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
});

// PUT /api/orders/:id
router.put('/:id', async (event, context, params, user) => {
    try {
        if (!event.body) return apiError(400, 'Missing body');
        const { status } = JSON.parse(event.body);
        const id = params.id;

        // Fetch current status
        const currentOrderRes = await query('SELECT status FROM orders WHERE id = $1', [id]);
        if (currentOrderRes.rows.length === 0) return apiError(404, 'Order not found');
        const currentStatus = currentOrderRes.rows[0].status as OrderStatus;

        // Core Logic Transition Check
        if (!validateOrderStateTransition(currentStatus, status)) {
            return apiError(400, `Invalid status transition from ${currentStatus} to ${status}`);
        }

        await query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
        return apiResponse(200, { message: `Order status updated to ${status}` });

    } catch (error) {
        return apiError(500, 'Failed to update order', error);
    }
});

export const handler = requireAuth(router.handle.bind(router));
