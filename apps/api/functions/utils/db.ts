import { Pool, type PoolClient } from '@neondatabase/serverless';

let pool: Pool | null = null;

const getPool = (): Pool => {
    if (pool) return pool;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not defined');
    }

    pool = new Pool({ connectionString });
    return pool;
};

export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
};

export const getClient = async (): Promise<PoolClient> => {
    return await getPool().connect();
};
