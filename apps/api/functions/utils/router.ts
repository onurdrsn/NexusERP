import { HandlerEvent, HandlerContext } from '@netlify/functions';
import { apiError, handleOptions } from './apiResponse';
import { AuthUser } from './auth';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

type RouteHandler = (
    event: HandlerEvent,
    context: HandlerContext,
    params: Record<string, string>,
    user?: AuthUser
) => Promise<any>;

interface Route {
    method: HttpMethod;
    pattern: RegExp;
    handler: RouteHandler;
    paramNames: string[];
}

export class Router {
    private routes: Route[] = [];

    private add(method: HttpMethod, path: string, handler: RouteHandler) {
        // Convert path with params (e.g., /products/:id) to regex
        const paramNames: string[] = [];
        const regexPath = path.replace(/:([^\/]+)/g, (_, paramName) => {
            paramNames.push(paramName);
            return '([^\\/]+)';
        });

        // Match end of string to be prefix-agnostic
        // e.g. /login matches /api/auth/login or /apps/api/functions/auth/login
        const pattern = new RegExp(`${regexPath}$`);

        this.routes.push({ method, pattern, handler, paramNames });
    }

    get(path: string, handler: RouteHandler) {
        this.add('GET', path, handler);
    }

    post(path: string, handler: RouteHandler) {
        this.add('POST', path, handler);
    }

    put(path: string, handler: RouteHandler) {
        this.add('PUT', path, handler);
    }

    delete(path: string, handler: RouteHandler) {
        this.add('DELETE', path, handler);
    }

    async handle(event: HandlerEvent, context: HandlerContext, user?: AuthUser) {
        if (event.httpMethod === 'OPTIONS') return handleOptions();

        const method = event.httpMethod as HttpMethod;
        let path = event.path;

        // Import log locally to avoid circular dep if needed, or just use console
        console.log(`[Router] ${method} ${path}`);

        // Normalize path: strip /.netlify/functions/<funcName> if present
        const functionPrefix = '/.netlify/functions/';
        if (path.startsWith(functionPrefix)) {
            const parts = path.replace(functionPrefix, '').split('/');
            // parts[0] is function name (e.g. 'auth'), remainder is path (e.g. 'login')
            path = '/' + parts.slice(1).join('/');
        }

        console.log(`[Router] ${method} ${path} (original: ${event.path})`);
        this.routes.forEach(r => console.log(`[Router] Checking pattern: ${r.pattern} - Match: ${r.pattern.test(path)}`));

        for (const route of this.routes) {
            if (route.method !== method) continue;

            const match = path.match(route.pattern);
            if (match) {
                const params: Record<string, string> = {};
                route.paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });

                try {
                    return await route.handler(event, context, params, user);
                } catch (error) {
                    console.error(error);
                    return apiError(500, 'Internal Server Error', error);
                }
            }
        }

        return apiError(404, `Route not found: ${method} ${path}`);
    }
}
