import { query } from './db';

export const getIp = (event: any): string => {
    return event.headers?.['client-ip'] ||
        event.headers?.['x-nf-client-connection-ip'] ||
        event.headers?.['x-forwarded-for']?.split(',')[0].trim() ||
        '0.0.0.0';
};

/**
 * Logs an action to the audit_logs table.
 * @param userId - The ID of the user performing the action.
 * @param action - A string identifier for the action (e.g., 'USER_CREATED').
 * @param details - JSON-serializable details about the action.
 * @param client - Optional database client for use within transactions.
 */
export const logAudit = async (
    userId: string | number,
    action: string,
    details: any,
    ip: string = '0.0.0.0',
    client: any = null
) => {
    const q = client ? client.query.bind(client) : query;
    try {
        const entity = details.entity || action.split('_')[0];
        const entity_id = (details.targetId || details.id || null)?.toString();

        await q(
            `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId?.toString(), action, entity, entity_id, JSON.stringify(details)]
        );
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
}
;
