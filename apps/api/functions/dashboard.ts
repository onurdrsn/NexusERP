import { Handler } from '@netlify/functions';
import { query } from './utils/db';
import { requireAuth } from './utils/auth';
import { apiResponse, apiError, handleOptions } from './utils/apiResponse';

const dashboardHandler: Parameters<typeof requireAuth>[0] = async (event, context, user) => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    try {
        // 1. Total Sales (Approved/Shipped/Completed)
        const salesRes = await query(`
      SELECT SUM(total_amount) as total 
      FROM invoices 
      WHERE status = 'PAID' OR status = 'ISSUED'
    `);
        // Fallback if no invoices used yet, simulate from orders
        // But let's check sales_orders directly for simplicity if invoices empty
        let totalSales = salesRes.rows[0].total || 0;

        if (totalSales == 0) {
            const orderSalesRes = await query(`
            SELECT SUM(quantity * unit_price) as total
            FROM sales_order_items soi
            JOIN sales_orders so ON soi.sales_order_id = so.id
            WHERE so.status IN ('APPROVED', 'SHIPPED', 'COMPLETED')
        `);
            totalSales = orderSalesRes.rows[0].total || 0;
        }

        // 2. Active Orders (Pending measures)
        const activeOrdersRes = await query(`
      SELECT COUNT(*) as count 
      FROM sales_orders 
      WHERE status IN ('DRAFT', 'APPROVED', 'PICKING', 'SHIPPED')
    `);
        const activeOrders = activeOrdersRes.rows[0].count;

        // 3. Low Stock Items
        const lowStockRes = await query(`
      SELECT COUNT(*) as count 
      FROM stock_current s
      JOIN products p ON s.product_id = p.id
      WHERE s.stock <= p.min_stock
    `);
        const lowStock = lowStockRes.rows[0].count;

        // 4. Recent Orders
        const recentOrdersRes = await query(`
        SELECT so.id, c.name as customer, so.status, so.created_at,
        (SELECT SUM(quantity * unit_price) FROM sales_order_items WHERE sales_order_id = so.id) as total
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id
        ORDER BY so.created_at DESC
        LIMIT 5
    `);

        // 5. Sales History (Last 7 Days)
        const historyRes = await query(`
      WITH dates AS (
          SELECT generate_series(
              CURRENT_DATE - INTERVAL '6 days',
              CURRENT_DATE,
              '1 day'::interval
          )::date AS date
      )
      SELECT 
          to_char(d.date, 'Mon DD') as name,
          COALESCE(SUM(inv.total_amount), 0) as sales
      FROM dates d
      LEFT JOIN sales_orders so ON d.date = date(so.created_at) AND so.status IN ('APPROVED', 'SHIPPED', 'COMPLETED')
      LEFT JOIN invoices inv ON so.id = inv.sales_order_id
      GROUP BY d.date
      ORDER BY d.date
    `);

        return apiResponse(200, {
            stats: {
                totalSales,
                activeOrders,
                lowStock
            },
            recentOrders: recentOrdersRes.rows,
            salesHistory: historyRes.rows
        });

    } catch (error) {
        return apiError(500, 'Failed to fetch dashboard data', error);
    }
};

export const handler = requireAuth(dashboardHandler);

