import { apiError, handleOptions, type HandlerResponse } from './apiResponse';
import type { AuthUser } from './auth';
import type { HandlerContext, HandlerEvent } from './router';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

type MethodHandler = (
    event: HandlerEvent,
    context: HandlerContext,
    user: AuthUser
) => Promise<HandlerResponse>;

type MethodHandlers = Partial<Record<HttpMethod, MethodHandler>>;

export const dispatchByMethod = async (
    event: HandlerEvent,
    context: HandlerContext,
    user: AuthUser,
    handlers: MethodHandlers
): Promise<HandlerResponse> => {
    if (event.httpMethod === 'OPTIONS') return handleOptions();

    const method = event.httpMethod as HttpMethod;
    const handler = handlers[method];
    if (!handler) return apiError(405, 'Method Not Allowed');

    return await handler(event, context, user);
};
