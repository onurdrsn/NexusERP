import { HandlerResponse } from './utils/apiResponse';
import { HandlerEvent, HandlerContext } from './utils/router';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

const rolesHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    try {
        if (event.httpMethod === 'GET') {
            // Fetch roles with their permissions
            const rolesRes = await query(`
        SELECT r.id, r.name, 
               COALESCE(json_agg(p.code) FILTER (WHERE p.code IS NOT NULL), '[]') as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        GROUP BY r.id
      `);

            const permissionsRes = await query('SELECT * FROM permissions ORDER BY code');

            return apiResponse(200, {
                roles: rolesRes.rows,
                allPermissions: permissionsRes.rows
            });
        }

        if (event.httpMethod === 'POST') {
            const { name, permissions } = JSON.parse(event.body || '{}');
            if (!name) return apiError(400, 'Role name is required');

            // Transaction to create role and assign permissions
            const client = await import('./utils/db').then(m => m.getClient());
            try {
                await client.query('BEGIN');

                const roleRes = await client.query(
                    'INSERT INTO roles (name) VALUES ($1) RETURNING id, name',
                    [name]
                );
                const roleId = roleRes.rows[0].id;

                if (permissions && permissions.length > 0) {
                    // Get permission IDs
                    const permIdsRes = await client.query(
                        'SELECT id FROM permissions WHERE code = ANY($1)',
                        [permissions]
                    );

                    for (const perm of permIdsRes.rows) {
                        await client.query(
                            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
                            [roleId, perm.id]
                        );
                    }
                }

                await client.query('COMMIT');
                return apiResponse(201, roleRes.rows[0]);
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        return apiError(500, 'Failed to manage roles', error);
    }
};

export const rolesHandler = requireAuth(rolesHandler);
