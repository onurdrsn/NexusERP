import { HandlerResponse } from '@netlify/functions';

export const apiResponse = (statusCode: number, data: any): HandlerResponse => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // Adjust for production
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
        body: JSON.stringify(data),
    };
};

export const apiError = (statusCode: number, message: string, details?: any): HandlerResponse => {
    console.error(`API Error ${statusCode}: ${message}`, details);
    return apiResponse(statusCode, { error: message, details });
};

export const handleOptions = (): HandlerResponse => {
    return {
        statusCode: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
        body: '',
    };
};
