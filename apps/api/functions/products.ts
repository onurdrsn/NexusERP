import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

const productsHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    const path = event.path.replace('/api/products', '').replace('/app/functions/products', '');
    const id = path.replace('/', '');

    // GET /api/products
    if (event.httpMethod === 'GET' && !id) {
        try {
            const result = await query('SELECT * FROM products WHERE is_deleted = false ORDER BY created_at DESC');
            return apiResponse(200, result.rows);
        } catch (error) {
            return apiError(500, 'Failed to fetch products', error);
        }
    }

    // GET /api/products/:id
    if (event.httpMethod === 'GET' && id) {
        try {
            const result = await query('SELECT * FROM products WHERE id = $1 AND is_deleted = false', [id]);
            if (result.rows.length === 0) return apiError(404, 'Product not found');
            return apiResponse(200, result.rows[0]);
        } catch (error) {
            return apiError(500, 'Failed to fetch product', error);
        }
    }

    // POST /api/products
    if (event.httpMethod === 'POST' && !id) {
        // Permission check?
        // if (user.role !== 'admin' && user.role !== 'manager') return apiError(403, 'Forbidden');

        try {
            if (!event.body) return apiError(400, 'Missing body');
            const { sku, name, category_id, unit, min_stock, price } = JSON.parse(event.body);

            // Transaction start usually, but for single insert standard is ok.
            // But we need to insert price too! So better use transaction or just simple insert for now.
            // User requested "Product prices history".

            const client = await import('./utils/db').then(m => m.getClient());
            try {
                await client.query('BEGIN');

                const prodRes = await client.query(
                    `INSERT INTO products (sku, name, category_id, unit, min_stock) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [sku, name, category_id || null, unit, min_stock || 0]
                );
                const productId = prodRes.rows[0].id;

                await client.query(
                    `INSERT INTO product_prices (product_id, price, valid_from, created_by)
           VALUES ($1, $2, NOW(), $3)`,
                    [productId, price, user.id]
                );

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
    }

    // PUT /api/products/:id
    if (event.httpMethod === 'PUT' && id) {
        try {
            if (!event.body) return apiError(400, 'Missing body');
            const { name, unit, min_stock, price, is_active } = JSON.parse(event.body);

            const client = await import('./utils/db').then(m => m.getClient());
            try {
                await client.query('BEGIN');

                // Update product details
                await client.query(
                    `UPDATE products SET name = COALESCE($1, name), unit = COALESCE($2, unit), 
           min_stock = COALESCE($3, min_stock), is_active = COALESCE($4, is_active)
           WHERE id = $5`,
                    [name, unit, min_stock, is_active, id]
                );

                // Update price if provided and different?
                // Implementing simplified version: if price provided, add new history record.
                if (price !== undefined) {
                    // Close previous price?
                    // UPDATE product_prices SET valid_to = NOW() WHERE product_id = $1 AND valid_to IS NULL
                    await client.query(
                        `UPDATE product_prices SET valid_to = NOW() WHERE product_id = $1 AND valid_to IS NULL`,
                        [id]
                    );
                    await client.query(
                        `INSERT INTO product_prices (product_id, price, valid_from, created_by)
                VALUES ($1, $2, NOW(), $3)`,
                        [id, price, user.id]
                    );
                }

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
    }

    // DELETE /api/products/:id (Soft Delete)
    if (event.httpMethod === 'DELETE' && id) {
        try {
            await query('UPDATE products SET is_deleted = true, is_active = false WHERE id = $1', [id]);
            return apiResponse(200, { message: 'Product deleted' });
        } catch (error) {
            return apiError(500, 'Failed to delete product', error);
        }
    }

    return apiError(404, 'Method not allowed or path not found');
};

export const handler = requireAuth(productsHandler);
