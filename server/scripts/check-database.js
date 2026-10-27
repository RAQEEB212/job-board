import { createPool } from '../src/database.js';
const pool = createPool();
try {
  const { rows } = await pool.query('SELECT current_database() AS database, (SELECT COUNT(*)::int FROM jobs) AS advertisements');
  console.log('PostgreSQL connection OK:', rows[0]);
} catch { console.error('Database check failed. Verify DATABASE_URL and run db:migrate.'); process.exitCode = 1; }
finally { await pool.end(); }
