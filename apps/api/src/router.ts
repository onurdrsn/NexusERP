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
import type { HandlerContext, HandlerEvent } from '../functions/utils/router';
import type { HandlerResponse } from '../functions/utils/apiResponse';

export type Handler = (event: HandlerEvent, context: HandlerContext) => Promise<HandlerResponse>;

const ALLOWED_ORIGINS = [
	'https://nexuserp.onurdrsn.com.tr',
	'https://nexus.onurdrsn.com.tr',
	'http://localhost:5173',
];

const BASE_ROUTE_HANDLERS: Record<string, Handler> = {
	auth: authHandler,
	products: productsHandler,
	stock: stockHandler,
	orders: ordersHandler,
	customers: customersHandler,
	suppliers: suppliersHandler,
	users: usersHandler,
	roles: rolesHandler,
	warehouses: warehousesHandler,
	'purchase-orders': purchaseOrdersHandler,
	'audit-logs': auditLogsHandler,
	dashboard: dashboardHandler,
	ping: pingHandler,
};

const ROUTE_REGISTRY: Record<string, Handler> = Object.fromEntries(
	Object.entries(BASE_ROUTE_HANDLERS).flatMap(([route, handler]) => [
		[`/${route}`, handler],
		[`/api/${route}`, handler],
	])
);

function getCorsHeaders(origin: string | null): Record<string, string> {
	const headers: Record<string, string> = {
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	};

	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
		headers['Access-Control-Allow-Credentials'] = 'true';
	}

	return headers;
}

async function parseBody(request: Request): Promise<string | undefined> {
	if (['GET', 'HEAD'].includes(request.method)) {
		return undefined;
	}

	return await request.text();
}

function findMatchingRoute(pathname: string): [string, Handler] | null {
	for (const [route, handler] of Object.entries(ROUTE_REGISTRY)) {
		if (pathname === route || pathname.startsWith(route + '/')) {
			return [route, handler];
		}
	}
	return null;
}

function createErrorResponse(status: number, message: string, corsHeaders: Record<string, string>): Response {
	return new Response(
		JSON.stringify({ error: message }),
		{
			status,
			headers: {
				'Content-Type': 'application/json',
				...corsHeaders,
			},
		}
	);
}

function createSuccessResponse(body: string, status: number, responseHeaders: Record<string, string> | undefined, corsHeaders: Record<string, string>): Response {
	return new Response(body, {
		status,
		headers: {
			'Content-Type': 'application/json',
			...(responseHeaders || {}),
			...corsHeaders,
		},
	});
}

export async function handleRequest(request: Request, env: Record<string, unknown>): Promise<Response> {
	const url = new URL(request.url);
	const pathname = url.pathname;
	const method = request.method;
	const origin = request.headers.get('Origin');
	const corsHeaders = getCorsHeaders(origin);

	// Handle CORS preflight
	if (method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		});
	}

	try {
		// Parse body
		const body = await parseBody(request);
		// Create handler event

		const event: HandlerEvent = {
			httpMethod: method,
			path: pathname,
			headers: Object.fromEntries(request.headers),
			body,
		};

		// Find matching route
		const match = findMatchingRoute(pathname);
		if (!match) {
			return createErrorResponse(404, 'Not Found', corsHeaders);
		}

		const [_, handler] = match;

		// Create handler context
		const context: HandlerContext = { env };

		// Call handler
		const result = await handler(event, context);
		const statusCode = result.statusCode || 200;

		return createSuccessResponse(result.body, statusCode, result.headers, corsHeaders);
	} catch (error: unknown) {
		console.error('Worker error:', error instanceof Error ? error.message : String(error));
		return createErrorResponse(500, 'Internal Server Error', corsHeaders);
	}
}
