import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';
import { logAudit } from './utils/auditLogger';

const sqlHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();
    if (event.httpMethod !== 'POST') return apiError(405, 'Method Not Allowed');

    // Role check: Only Super Admin or Admin can use SQL Console
    const userRole = user!.role?.toLowerCase();
    if (userRole !== 'super admin' && userRole !== 'admin') {
        return apiError(403, `Forbidden: SQL access restricted to administrators. Your role: ${user?.role}`);
    }

    try {
        const { sql, params } = JSON.parse(event.body || '{}');

        if (!sql) return apiError(400, 'Missing SQL query');

        // Security Warning: This is extremely powerful. 
        // In a real production app, we would restrict this heavily or use a read-only user if possible.
        const result = await query(sql, params || []);

        // Audit Log the execution for security tracking
        await logAudit(user!.id, 'SQL_EXECUTION', { sql: sql.substring(0, 500) });

        // If multiple statements were executed, result is an array
        const results = Array.isArray(result) ? result : [result];

        return apiResponse(200, results.map(r => ({
            rows: r.rows,
            rowCount: r.rowCount,
            command: r.command
        })));
    } catch (error) {
        return apiError(500, 'SQL Execution Failed', (error as Error).message);
    }
};

export const handler = requireAuth(sqlHandler);
