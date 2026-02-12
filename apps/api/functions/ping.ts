import { HandlerResponse } from './utils/apiResponse';
import { HandlerEvent, HandlerContext } from './utils/router';

export const pingHandler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: "Pong" }),
    };
};
