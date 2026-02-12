import { HandlerResponse } from './utils/apiResponse';
import { HandlerEvent, HandlerContext } from './utils/router';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError } from './utils/apiResponse';
import { logAudit } from './utils/auditLogger';
import { dispatchByMethod } from './utils/methodHandler';

const sqlCoreHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    return await dispatchByMethod(event, context, user!, {
        POST: async () => {
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
        },
    });
};

export const sqlHandler = requireAuth(sqlCoreHandler);
