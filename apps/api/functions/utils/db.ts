import { Pool, type PoolClient } from '@neondatabase/serverless';

const getConnectionString = (): string => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not defined');
    }
    return connectionString;
};

const createPool = (): Pool => {
    return new Pool({ connectionString: getConnectionString() });
};

export const query = async (text: string, params?: any[]) => {
    const pool = createPool();
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    } finally {
        await pool.end();
    }
};

export const getClient = async (): Promise<PoolClient> => {
    const pool = createPool();
    const client = await pool.connect();
    const release = client.release.bind(client);

    client.release = ((err?: boolean | Error) => {
        release(err as any);
        void pool.end();
    }) as PoolClient['release'];

    return client;
};
