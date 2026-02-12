import { query } from './utils/db';
import { apiResponse, apiError, HandlerResponse } from './utils/apiResponse';
import { HandlerEvent, HandlerContext } from './utils/router';

export const dbCheckHandler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
    try {
        const res = await query('SELECT NOW()');
        const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        return apiResponse(200, {
            time: res.rows[0],
            tables: tables.rows.map(r => r.table_name)
        });
    } catch (error) {
        return apiError(500, 'DB Check Failed', error);
    }
};
