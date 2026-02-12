/**
 * Cloudflare Workers compatible API response utilities
 */

const toJson = (value: unknown, fallback = 'null'): string => {
    const seen = new WeakSet<object>();

    try {
        return JSON.stringify(
            value,
            (_key, currentValue) => {
                if (typeof currentValue === 'bigint') return currentValue.toString();

                if (currentValue instanceof Error) {
                    return {
                        name: currentValue.name,
                        message: currentValue.message,
                        stack: currentValue.stack,
                    };
                }

                if (currentValue && typeof currentValue === 'object') {
                    const objectValue = currentValue as object;
                    if (seen.has(objectValue)) return '[Circular]';
                    seen.add(objectValue);
                }

                return currentValue;
            }
        );
    } catch (error) {
        console.error('Response serialization failed:', error);
        return fallback;
    }
};

export interface HandlerResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

export const apiResponse = (statusCode: number, data: any): HandlerResponse => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://nexuserp.onurdrsn.com.tr',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        },
        body: toJson(data, '{"error":"Failed to serialize response"}'),
    };
};

export const apiError = (statusCode: number, message: string, details?: any): HandlerResponse => {
    const detailsJson = details === undefined ? undefined : toJson(details);
    const errorMsg = detailsJson
        ? `API Error ${statusCode}: ${message} - ${detailsJson}`
        : `API Error ${statusCode}: ${message}`;

    console.error(errorMsg);

    // Keep error payload robust even when details contain circular refs.
    return apiResponse(statusCode, detailsJson ? { error: message, details: detailsJson } : { error: message });
};

export const handleOptions = (): HandlerResponse => {
    return {
        statusCode: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        },
        body: '',
    };
};
