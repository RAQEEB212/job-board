import pg from 'pg';
export function createPool() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in server/.env.');
  const connection = new URL(process.env.DATABASE_URL);
  if (connection.hostname.endsWith('.neon.tech')) connection.searchParams.set('sslmode', 'verify-full');
  const pool = new pg.Pool({
    connectionString: connection.href,
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });
  pool.on('error', () => console.error('PostgreSQL idle connection error. The next request will reconnect.'));
  return pool;
}
