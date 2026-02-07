import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export interface AuthUser {
    id: string;
    email: string;
    role?: string;
}

export const signToken = (user: AuthUser) => {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: '8h',
    });
};

export const verifyToken = (token: string): AuthUser | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch (error) {
        return null;
    }
};

export const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
    return await bcrypt.compare(password, hash);
};

// Middleware to protect routes
export const requireAuth = (handler: (event: HandlerEvent, context: HandlerContext, user: AuthUser) => Promise<HandlerResponse>): Handler => {
    return async (event: HandlerEvent, context: HandlerContext) => {
        const authHeader = event.headers.authorization || event.headers.Authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' }),
            };
        }

        const token = authHeader.split(' ')[1];
        const user = verifyToken(token);

        if (!user) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Unauthorized: Invalid token' }),
            };
        }

        // Optional: Check if user is active in DB (adds latency but more secure)
        // const dbUser = await query('SELECT is_active FROM users WHERE id = $1', [user.id]);
        // if (!dbUser.rows[0]?.is_active) return { statusCode: 403, body: 'User inactive' };

        return handler(event, context, user);
    };
};
