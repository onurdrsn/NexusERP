import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError } from './utils/apiResponse';
import { Router } from './utils/router';

const router = new Router();

router.get('/', async (event) => {
    try {
        // Basic select, in real app needs pagination
        const result = await query(`
            SELECT a.id, u.email as user_email, a.action, a.metadata as details, a.created_at 
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT 100
        `);
        return apiResponse(200, result.rows || []);
    } catch (error) {
        // If table doesn't exist, return empty array to prevent UI crash
        if ((error as any).code === '42P01') { // PostgreSQL undefined_table
            return apiResponse(200, []);
        }
        return apiError(500, 'Failed to fetch audit logs', error);
    }
});

export const handler = requireAuth(router.handle.bind(router));
