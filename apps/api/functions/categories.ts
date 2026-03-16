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
        const res = await query(`
          SELECT c.*, parent.name as parent_name
          FROM product_categories c
          LEFT JOIN product_categories parent ON c.parent_id = parent.id
          ORDER BY c.parent_id NULLS FIRST, c.name
        `);
        return apiResponse(200, res.rows);
      } catch (error) {
        return apiError(500, 'Failed to fetch categories', error);
      }
    },

    POST: async () => {
      const pathParts = getPathParts();
      const isDeleteAction = pathParts[pathParts.length - 1] === 'delete';

      try {
        if (isDeleteAction) {
          const id = pathParts[pathParts.length - 2];
          if (!id) return apiError(400, 'Category ID is required');

          // Check if category has active products
          const check = await query(
            'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_deleted = false',
            [id]
          );

          if (Number(check.rows[0].count) > 0) {
            return apiError(400, 'Category has active products. Reassign them first.');
          }

          await query('DELETE FROM product_categories WHERE id = $1', [id]);
          await logAudit(user!.id, 'CATEGORY_DELETED', { targetId: id }, getIp(event));
          return apiResponse(200, { message: 'Category deleted' });
        }

        // Create new category
        const { name, parent_id } = JSON.parse(event.body || '{}');

        if (!name) {
          return apiError(400, 'Name is required');
        }

        const res = await query(
          'INSERT INTO product_categories (name, parent_id) VALUES ($1, $2) RETURNING *',
          [name, parent_id || null]
        );

        const category = res.rows[0];
        await logAudit(user!.id, 'CATEGORY_CREATED', category, getIp(event));
        return apiResponse(201, category);
      } catch (error) {
        return apiError(500, 'Failed to manage categories', error);
      }
    },

    PUT: async () => {
      const pathParts = getPathParts();
      const id = pathParts[pathParts.length - 1];

      if (!id) return apiError(400, 'Category ID is required');

      try {
        const { name, parent_id } = JSON.parse(event.body || '{}');

        if (!name) {
          return apiError(400, 'Name is required');
        }

        const res = await query(
          'UPDATE product_categories SET name = $1, parent_id = $2 WHERE id = $3 RETURNING *',
          [name, parent_id || null, id]
        );

        if (res.rows.length === 0) return apiError(404, 'Category not found');

        await logAudit(user!.id, 'CATEGORY_UPDATED', res.rows[0], getIp(event));
        return apiResponse(200, res.rows[0]);
      } catch (error) {
        return apiError(500, 'Failed to update category', error);
      }
    },
  });
};

export const categoriesHandler = requireAuth(handler);
