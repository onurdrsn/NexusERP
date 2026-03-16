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
          SELECT 
            i.*,
            c.name as customer_name,
            c.email as customer_email,
            so.status as order_status
          FROM invoices i
          JOIN sales_orders so ON i.sales_order_id = so.id
          JOIN customers c ON so.customer_id = c.id
          ORDER BY i.issued_at DESC NULLS LAST, i.id DESC
        `);
        return apiResponse(200, res.rows);
      } catch (error) {
        return apiError(500, 'Failed to fetch invoices', error);
      }
    },

    POST: async () => {
      const pathParts = getPathParts();
      const actionType = pathParts[pathParts.length - 1];

      try {
        // POST /api/invoices/:id/issue - Mark invoice as issued
        if (actionType === 'issue') {
          const id = pathParts[pathParts.length - 2];
          if (!id) return apiError(400, 'Invoice ID is required');

          const res = await query(
            `UPDATE invoices SET status = 'ISSUED', issued_at = NOW() 
             WHERE id = $1 AND status = 'DRAFT' RETURNING *`,
            [id]
          );

          if (res.rows.length === 0) {
            return apiError(400, 'Invoice not found or already issued');
          }

          await logAudit(user!.id, 'INVOICE_ISSUED', { id, status: 'ISSUED' }, getIp(event));
          return apiResponse(200, res.rows[0]);
        }

        // POST /api/invoices/:id/pay - Mark invoice as paid
        if (actionType === 'pay') {
          const id = pathParts[pathParts.length - 2];
          if (!id) return apiError(400, 'Invoice ID is required');

          const res = await query(
            `UPDATE invoices SET status = 'PAID' 
             WHERE id = $1 AND status = 'ISSUED' RETURNING *`,
            [id]
          );

          if (res.rows.length === 0) {
            return apiError(400, 'Invoice not found or not in ISSUED status');
          }

          await logAudit(user!.id, 'INVOICE_PAID', { id, status: 'PAID' }, getIp(event));
          return apiResponse(200, res.rows[0]);
        }

        // POST /api/invoices - Create new invoice from sales order
        const { sales_order_id, tax_rate = 0.18 } = JSON.parse(event.body || '{}');

        if (!sales_order_id) {
          return apiError(400, 'sales_order_id is required');
        }

        // Calculate subtotal from sales order items
        const orderRes = await query(
          `SELECT SUM(quantity * unit_price) as subtotal 
           FROM sales_order_items 
           WHERE sales_order_id = $1`,
          [sales_order_id]
        );

        const subtotal = Number(orderRes.rows[0]?.subtotal || 0);
        const tax_amount = Number((subtotal * tax_rate).toFixed(2));
        const total_amount = Number((subtotal + tax_amount).toFixed(2));

        // Create invoice
        const res = await query(
          `INSERT INTO invoices (sales_order_id, total_amount, tax_amount, status)
           VALUES ($1, $2, $3, 'DRAFT') RETURNING *`,
          [sales_order_id, total_amount, tax_amount]
        );

        const invoice = res.rows[0];
        await logAudit(
          user!.id,
          'INVOICE_CREATED',
          { id: invoice.id, sales_order_id, total_amount, tax_amount },
          getIp(event)
        );

        return apiResponse(201, invoice);
      } catch (error) {
        return apiError(500, 'Failed to manage invoices', error);
      }
    },
  });
};

export const invoicesHandler = requireAuth(handler);
