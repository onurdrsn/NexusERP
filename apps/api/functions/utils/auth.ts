import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import type { HandlerContext, HandlerEvent } from './router';
import type { HandlerResponse } from './apiResponse';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export interface AuthUser {
    id: string;
    email: string;
    role?: string;
}

export const signToken = async (user: AuthUser): Promise<string> => {
    return await new SignJWT({ id: user.id, email: user.email, role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(JWT_SECRET_KEY);
};

const toAuthUser = (payload: JWTPayload): AuthUser | null => {
    if (!payload.email || !payload.id) return null;
    if (typeof payload.email !== 'string') return null;

    const role = typeof payload.role === 'string' ? payload.role : undefined;
    return {
        id: String(payload.id),
        email: payload.email,
        role,
    };
};

export const verifyToken = async (token: string): Promise<AuthUser | null> => {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET_KEY, {
            algorithms: ['HS256'],
        });
        return toAuthUser(payload);
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
export const requireAuth = (handler: (event: HandlerEvent, context: HandlerContext, user: AuthUser) => Promise<HandlerResponse>) => {
    return async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
        const authHeader = event.headers.authorization || event.headers.Authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' }),
            };
        }

        const token = authHeader.split(' ')[1];
        const user = await verifyToken(token);

        if (!user) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: 'Unauthorized: Invalid token' }),
            };
        }

        // Optional: Check if user is active in DB (adds latency but more secure)
        // const dbUser = await query('SELECT is_active FROM users WHERE id = $1', [user.id]);
        // if (!dbUser.rows[0]?.is_active) return { statusCode: 403, body: 'User inactive' };

        return handler(event, context, user);
    };
};
