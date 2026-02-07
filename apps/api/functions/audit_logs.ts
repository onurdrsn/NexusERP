import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

const auditLogsHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    try {
        if (event.httpMethod === 'GET') {
            // Basic select, in real app needs pagination
            const result = await query(`
        SELECT a.id, u.email as user_email, a.action, a.details, a.created_at 
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 100
      `);
            return apiResponse(200, result.rows);
        }

        return apiError(405, 'Method Not Allowed');
    } catch (error) {
        // If table doesn't exist, return empty array to prevent UI crash
        if ((error as any).code === '42P01') { // PostgreSQL undefined_table
            return apiResponse(200, []);
        }
        return apiError(500, 'Failed to fetch audit logs', error);
    }
};

export const handler = requireAuth(auditLogsHandler);
