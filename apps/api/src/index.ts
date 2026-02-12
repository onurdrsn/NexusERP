/**
 * Cloudflare Worker Entry Point
 * Converts incoming Fetch API requests to handler format
 */

import { authHandler } from '../functions/auth';
import { productsHandler } from '../functions/products';
import { stockHandler } from '../functions/stock';
import { ordersHandler } from '../functions/sales-orders';
import { customersHandler } from '../functions/customers';
import { suppliersHandler } from '../functions/suppliers';
import { usersHandler } from '../functions/users';
import { rolesHandler } from '../functions/roles';
import { warehousesHandler } from '../functions/warehouses';
import { purchaseOrdersHandler } from '../functions/purchase-orders';
import { auditLogsHandler } from '../functions/audit-logs';
import { dashboardHandler } from '../functions/dashboard';
import { pingHandler } from '../functions/ping';

interface HandlerEvent {
	httpMethod: string;
	path: string;
	headers: Record<string, string>;
	body?: string;
}

interface HandlerContext {
	env: Record<string, any>;
}

// Helper to convert Fetch Response
const createResponse = (data: any, status: number = 200, headers: Record<string, string> = {}) => {
	const defaultHeaders = {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
	};

	return new Response(JSON.stringify(data), {
		status,
		headers: { ...defaultHeaders, ...headers },
	});
};

// Main router
async function handleRequest(
	request: Request,
	env: Record<string, any>
) {
	const url = new URL(request.url);
	const pathname = url.pathname;
	const method = request.method;

	// Create handler context
	const handlerContext: HandlerContext = { env };

	// Handle CORS preflight
	if (method === 'OPTIONS') {
		return createResponse({}, 204);
	}

	try {
		// Prepare event
		const body = ['GET', 'HEAD'].includes(method) ? undefined : await request.text();
		const event: HandlerEvent = {
			httpMethod: method,
			path: pathname,
			headers: Object.fromEntries(request.headers),
			body,
		};

		// Route to appropriate handler based on path
		if (pathname.startsWith('/api/auth')) {
			const result = await authHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/products')) {
			const result = await productsHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/stock')) {
			const result = await stockHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/orders')) {
			const result = await ordersHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/customers')) {
			const result = await customersHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/suppliers')) {
			const result = await suppliersHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/users')) {
			const result = await usersHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/roles')) {
			const result = await rolesHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/warehouses')) {
			const result = await warehousesHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/purchase-orders')) {
			const result = await purchaseOrdersHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/audit-logs')) {
			const result = await auditLogsHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname.startsWith('/api/dashboard')) {
			const result = await dashboardHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		if (pathname === '/api/ping' || pathname === '/ping') {
			const result = await pingHandler(event, handlerContext);
			const statusCode = result.statusCode || 200;
			return createResponse(JSON.parse(result.body), statusCode, result.headers);
		}

		// 404 Not Found
		return createResponse({ error: 'Not Found' }, 404);
	} catch (error: any) {
		console.error('Worker error:', error);
		return createResponse(
			{ error: 'Internal Server Error', details: error?.message },
			500
		);
	}
}

export default {
	fetch: handleRequest,
};
