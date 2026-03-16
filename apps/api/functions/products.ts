import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import { Router } from './utils/router';
import { logAudit, getIp } from './utils/auditLogger';
import { t } from 'i18next';

const router = new Router();

// GET /api/products
router.get('/', async (event, context) => {
    try {
        const cache = (context.env?.CACHE as any) || null;
        const cacheKey = 'products:list';

        // Check cache
        if (cache) {
            const cached = await cache.get(cacheKey);
            if (cached) {
                console.log('[Products] Cache HIT for list');
                return apiResponse(200, JSON.parse(cached));
            }
        }

        const result = await query(`
            SELECT p.id, p.sku, p.name, p.category_id, p.unit, p.min_stock, p.is_active, p.created_at,
                   COALESCE(pp.price, 0) as price,
                   COALESCE((SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE product_id = p.id), 0) as stock
            FROM products p
            LEFT JOIN product_prices pp ON p.id = pp.product_id AND pp.valid_to IS NULL
            WHERE p.is_deleted = false
            ORDER BY p.created_at DESC
            LIMIT 500
        `);

        // Cache for 5 minutes
        if (cache) {
            await cache.put(cacheKey, JSON.stringify(result.rows || []), { expirationTtl: 300 });
            console.log('[Products] Cache SET for list');
        }

        return apiResponse(200, result.rows || []);
    } catch (error) {
        return apiError(500, t('products.failedToFetchProducts'), error);
    }
});

// GET /api/products/:id
router.get('/:id', async (event, context, params) => {
    try {
        const cache = (context.env?.CACHE as any) || null;
        const cacheKey = `products:${params.id}`;

        // Check cache
        if (cache) {
            const cached = await cache.get(cacheKey);
            if (cached) {
                console.log(`[Products] Cache HIT for ${params.id}`);
                return apiResponse(200, JSON.parse(cached));
            }
        }

        const result = await query('SELECT * FROM products WHERE id = $1 AND is_deleted = false', [params.id]);
        if (result.rows.length === 0) return apiError(404, t('products.productNotFound'));

        // Cache for 1 hour
        if (cache && result.rows.length > 0) {
            await cache.put(cacheKey, JSON.stringify(result.rows[0]), { expirationTtl: 3600 });
            console.log(`[Products] Cache SET for ${params.id}`);
        }

        return apiResponse(200, result.rows[0]);
    } catch (error) {
        return apiError(500, t('products.failedToFetchProduct'), error);
    }
});

// POST /api/products
router.post('/', async (event, context, params, user) => {
    try {
        if (!event.body) return apiError(400, t('products.missingBody'));
        const { sku, name, category_id, unit, min_stock, price, initial_stock } = JSON.parse(event.body);
        const cache = (context.env?.CACHE as any) || null;

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

            // Invalidate cache
            if (cache) {
                await cache.delete('products:list');
                console.log('[Products] Cache invalidated (list)');
            }

            await client.query('COMMIT');
            return apiResponse(201, { id: productId, message: 'Product created' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        return apiError(500, t('products.failedToCreateProduct'), error);
    }
});

// PUT /api/products/:id
router.put('/:id', async (event, context, params, user) => {
    try {
        if (!event.body) return apiError(400, t('products.missingBody'));
        const { name, unit, min_stock, price, is_active, initial_stock } = JSON.parse(event.body);
        const id = params.id;
        const cache = (context.env?.CACHE as any) || null;

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

            // Invalidate cache
            if (cache) {
                await cache.delete('products:list');
                await cache.delete(`products:${id}`);
                console.log(`[Products] Cache invalidated (list + ${id})`);
            }

            await client.query('COMMIT');
            return apiResponse(200, { message: t('products.productUpdated') });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    } catch (error) {
        return apiError(500, t('products.failedToUpdateProduct'), error);
    }
});

// POST /api/products/:id/delete
router.post('/:id/delete', async (event, context, params) => {
    try {
        const id = params.id;
        const cache = (context.env?.CACHE as any) || null;

        await query('UPDATE products SET is_deleted = true, is_active = false WHERE id = $1', [id]);

        // Audit Log
        await logAudit((event as any).user?.id || 'SYSTEM', 'PRODUCT_DELETED', { targetId: id }, getIp(event));

        // Invalidate cache
        if (cache) {
            await cache.delete('products:list');
            await cache.delete(`products:${id}`);
            console.log(`[Products] Cache invalidated (list + ${id})`);
        }

        return apiResponse(200, { message: t('products.productDeleted') });
    } catch (error) {
        return apiError(500, t('products.failedToDeleteProduct'), error);
    }
});

export const productsHandler = requireAuth(router.handle.bind(router));
