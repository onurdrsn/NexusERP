import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

const stockHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    const path = event.path.replace('/api/stock', '').replace('/app/functions/stock', '');

    // GET /api/stock -> List current stock (aggregated)
    if (event.httpMethod === 'GET' && (path === '' || path === '/')) {
        try {
            // Using the VIEW
            const result = await query(`
        SELECT s.*, p.name as product_name, p.sku, w.name as warehouse_name 
        FROM stock_current s
        JOIN products p ON s.product_id = p.id
        JOIN warehouses w ON s.warehouse_id = w.id
      `);
            return apiResponse(200, result.rows);
        } catch (error) {
            return apiError(500, 'Failed to fetch stock', error);
        }
    }

    // GET /api/stock/movements -> Audit trail
    if (event.httpMethod === 'GET' && path === '/movements') {
        try {
            const result = await query(`
         SELECT sm.*, p.name as product_name, w.name as warehouse_name, u.full_name as user_name
         FROM stock_movements sm
         LEFT JOIN products p ON sm.product_id = p.id
         LEFT JOIN warehouses w ON sm.warehouse_id = w.id
         LEFT JOIN users u ON sm.created_by = u.id
         ORDER BY sm.created_at DESC LIMIT 100
       `);
            return apiResponse(200, result.rows);
        } catch (error) {
            return apiError(500, 'Failed to fetch movements', error);
        }
    }

    // POST /api/stock/adjust -> Manual adjustment (IN/OUT/COUNT_DIFF/SCRAP)
    if (event.httpMethod === 'POST' && path === '/adjust') {
        try {
            if (!event.body) return apiError(400, 'Missing body');
            const { product_id, warehouse_id, quantity, type, reason } = JSON.parse(event.body);

            if (!['IN', 'OUT', 'COUNT_DIFF', 'SCRAP'].includes(type)) {
                return apiError(400, 'Invalid movement type for adjustment');
            }

            // Quantity validation: OUT/SCRAP should be negative? 
            // User prompt says "Stok asla direkt update edilmez".
            // Usually movements are additive. 
            // If type is OUT, quantity should be negative in the movement table? 
            // OR the VIEW handles it? 
            // "Stok Giriş, Çıkış". 
            // Let's assume quantity is absolute in input, but stored as positive/negative based on logic? 
            // Or stored as signed integer.
            // SQL View usually does SUM(quantity). So OUT must be negative.

            let finalQty = Number(quantity);
            if (['OUT', 'SCRAP'].includes(type)) {
                finalQty = -Math.abs(finalQty);
            } else {
                finalQty = Math.abs(finalQty);
            }

            const client = await import('./utils/db').then(m => m.getClient());
            try {
                await client.query(
                    `INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_type, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)`,
                    [product_id, warehouse_id, finalQty, type, 'MANUAL_ADJUSTMENT', user.id]
                );
                return apiResponse(201, { message: 'Stock adjusted' });
            } finally {
                client.release();
            }
        } catch (error) {
            return apiError(500, 'Failed to adjust stock', error);
        }
    }

    // POST /api/stock/transfer -> Transfer between warehouses
    if (event.httpMethod === 'POST' && path === '/transfer') {
        try {
            if (!event.body) return apiError(400, 'Missing body');
            const { product_id, from_warehouse_id, to_warehouse_id, quantity } = JSON.parse(event.body);

            const qty = Math.abs(Number(quantity));

            const client = await import('./utils/db').then(m => m.getClient());
            try {
                await client.query('BEGIN');

                // Validate Source Stock
                const stockRes = await client.query(
                    `SELECT SUM(quantity) as val FROM stock_movements WHERE product_id = $1 AND warehouse_id = $2`,
                    [product_id, from_warehouse_id]
                );
                const currentStock = Number(stockRes.rows[0].val || 0);
                const { validateStockForAllocation } = await import('@nexus/core');
                validateStockForAllocation(currentStock, qty, product_id);

                // 1. OUT from source
                await client.query(
                    `INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_type, created_by)
           VALUES ($1, $2, $3, 'TRANSFER_OUT', 'TRANSFER', $4)`,
                    [product_id, from_warehouse_id, -qty, user.id]
                );

                // 2. IN to dest
                await client.query(
                    `INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_type, created_by)
            VALUES ($1, $2, $3, 'TRANSFER_IN', 'TRANSFER', $4)`,
                    [product_id, to_warehouse_id, qty, user.id]
                );

                await client.query('COMMIT');
                return apiResponse(201, { message: 'Transfer successful' });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (error) {
            return apiError(500, 'Transfer failed', error);
        }
    }

    return apiError(404, `Not Found: ${path}`);
};

export const handler = requireAuth(stockHandler);
