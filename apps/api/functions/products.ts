import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import { Router } from './utils/router';
import { logAudit, getIp } from './utils/auditLogger';

const router = new Router();

// GET /api/products
router.get('/', async (event) => {
    try {
        const result = await query(`
            SELECT p.*, 
                   (SELECT price FROM product_prices WHERE product_id = p.id AND valid_to IS NULL LIMIT 1) as price,
                   COALESCE((SELECT SUM(stock) FROM stock_current WHERE product_id = p.id), 0) as stock
            FROM products p
            WHERE p.is_deleted = false
            ORDER BY p.created_at DESC
        `);
        return apiResponse(200, result.rows || []);
    } catch (error) {
        return apiError(500, 'Failed to fetch products', error);
    }
});

// GET /api/products/:id
router.get('/:id', async (event, context, params) => {
    try {
        const result = await query('SELECT * FROM products WHERE id = $1 AND is_deleted = false', [params.id]);
        if (result.rows.length === 0) return apiError(404, 'Product not found');
        return apiResponse(200, result.rows[0]);
    } catch (error) {
        return apiError(500, 'Failed to fetch product', error);
    }
});

// POST /api/products
router.post('/', async (event, context, params, user) => {
    try {
        if (!event.body) return apiError(400, 'Missing body');
        const { sku, name, category_id, unit, min_stock, price, initial_stock } = JSON.parse(event.body);

        const client = await import('./utils/db').then(m => m.getClient());
        try {
            await client.query('BEGIN');

            const prodRes = await client.query(
                `INSERT INTO products (sku, name, category_id, unit, min_stock) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [sku, name, category_id || null, unit, Number(min_stock) || 0]
            );
            const productId = prodRes.rows[0].id;

            await client.query(
                `INSERT INTO product_prices (product_id, price, valid_from, created_by)
           VALUES ($1, $2, NOW(), $3)`,
                [productId, Number(price) || 0, user!.id]
            );

            if (Number(initial_stock) > 0) {
                console.log(`[Products] Adding initial stock ${initial_stock} for product ${productId}`);
                // Get default warehouse for initial stock
                const whRes = await client.query('SELECT id FROM warehouses LIMIT 1');
                if (whRes.rows.length > 0) {
                    const warehouseId = whRes.rows[0].id;
                    console.log(`[Products] Using warehouse ${warehouseId}`);
                    await client.query(
                        `INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_type, created_by)
               VALUES ($1, $2, $3, 'IN', 'INITIAL_STOCK', $4)`,
                        [productId, warehouseId, Number(initial_stock), user!.id]
                    );
                } else {
                    console.warn('[Products] No warehouse found for initial stock');
                }
            }

            // Audit Log
            await logAudit(user!.id, 'PRODUCT_CREATED', { sku, name, price, initial_stock }, getIp(event), client);

            await client.query('COMMIT');
            return apiResponse(201, { id: productId, message: 'Product created' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        return apiError(500, 'Failed to create product', error);
    }
});

// PUT /api/products/:id
router.put('/:id', async (event, context, params, user) => {
    try {
        if (!event.body) return apiError(400, 'Missing body');
        const { name, unit, min_stock, price, is_active, initial_stock } = JSON.parse(event.body);
        const id = params.id;

        const client = await import('./utils/db').then(m => m.getClient());
        try {
            await client.query('BEGIN');

            await client.query(
                `UPDATE products SET name = COALESCE($1, name), unit = COALESCE($2, unit), 
           min_stock = COALESCE($3, min_stock), is_active = COALESCE($4, is_active)
           WHERE id = $5`,
                [name, unit, min_stock, is_active, id]
            );

            if (price !== undefined) {
                await client.query(
                    `UPDATE product_prices SET valid_to = NOW() WHERE product_id = $1 AND valid_to IS NULL`,
                    [id]
                );
                await client.query(
                    `INSERT INTO product_prices (product_id, price, valid_from, created_by)
                VALUES ($1, $2, NOW(), $3)`,
                    [id, price, user!.id]
                );
            }

            // Audit Log
            await logAudit(user!.id, 'PRODUCT_UPDATED', { targetId: id, name, price, is_active }, getIp(event), client);

            await client.query('COMMIT');
            return apiResponse(200, { message: 'Product updated' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    } catch (error) {
        return apiError(500, 'Failed to update product', error);
    }
});

// POST /api/products/:id/delete
router.post('/:id/delete', async (event, context, params) => {
    try {
        await query('UPDATE products SET is_deleted = true, is_active = false WHERE id = $1', [params.id]);

        // Audit Log
        await logAudit((event as any).user?.id || 'SYSTEM', 'PRODUCT_DELETED', { targetId: params.id }, getIp(event));

        return apiResponse(200, { message: 'Product deleted' });
    } catch (error) {
        return apiError(500, 'Failed to delete product', error);
    }
});

export const productsHandler = requireAuth(router.handle.bind(router));
