import { HandlerResponse } from '@netlify/functions';
import * as fs from 'fs';
import * as path from 'path';

const logFile = path.join('/tmp', 'api_debug.log');
const log = (msg: string) => {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    } catch (e) {
        console.error('Failed to write to log file', e);
    }
};

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
    const errorMsg = `API Error ${statusCode}: ${message} - ${JSON.stringify(details)}`;
    console.error(errorMsg);
    log(errorMsg);
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
