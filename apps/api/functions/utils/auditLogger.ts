import { query } from './db';

/**
 * Logs an action to the audit_logs table.
 * @param userId - The ID of the user performing the action.
 * @param action - A string identifier for the action (e.g., 'USER_CREATED').
 * @param details - JSON-serializable details about the action.
 * @param client - Optional database client for use within transactions.
 */
export const logAudit = async (
    userId: string,
    action: string,
    details: any,
    client: any = null
) => {
    const q = client ? client.query.bind(client) : query;
    try {
        // Extract entity and entity_id from details if possible, otherwise default
        const entity = details.entity || 'SYSTEM';
        const entity_id = details.targetId || null;

        await q(
            `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, action, entity, entity_id, JSON.stringify(details)]
        );
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};
