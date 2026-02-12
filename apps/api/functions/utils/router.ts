/**
 * Cloudflare Workers compatible router
 * No longer dependent on Netlify types
 */

import { apiError, handleOptions, HandlerResponse } from './apiResponse';
import { AuthUser } from './auth';

export interface HandlerEvent {
    httpMethod: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
}

export interface HandlerContext {
    env?: Record<string, any>;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'OPTIONS';

type RouteHandler = (
    event: HandlerEvent,
    context: HandlerContext,
    params: Record<string, string>,
    user?: AuthUser
) => Promise<HandlerResponse>;

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

    patch(path: string, handler: RouteHandler) {
        this.add('PATCH', path, handler);
    }

    async handle(event: HandlerEvent, context: HandlerContext, user?: AuthUser): Promise<HandlerResponse> {
        if (event.httpMethod === 'OPTIONS') return handleOptions();

        const method = event.httpMethod as HttpMethod;
        let path = event.path;

        console.log(`[Router] ${method} ${path}`);

        // Normalize path: strip optional /api/<endpoint> or /<endpoint> prefix
        // e.g. /api/users or /users -> /
        const apiMatch = path.match(/^\/(?:api\/)?([^\/]+)(\/.*)?$/);
        if (apiMatch) {
            path = apiMatch[2] || '/';
        }

        console.log(`[Router] ${method} ${path} (normalized)`);
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
