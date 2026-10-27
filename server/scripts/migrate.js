import { readFile, readdir } from 'node:fs/promises';
import { createPool } from '../src/database.js';
const pool = createPool();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(15271428)");
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const folder = new URL('../db/migrations/', import.meta.url);
  for (const name of (await readdir(folder)).filter(name => name.endsWith('.sql')).sort()) {
    const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
    if (existing.rowCount) continue;
    await client.query(await readFile(new URL(name, folder), 'utf8'));
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
    console.log('Applied migration:', name);
  }
  await client.query('COMMIT');
  console.log('Database schema ready.');
} catch { await client.query('ROLLBACK'); console.error('Migration failed. Check database access.'); process.exitCode = 1; }
finally { client.release(); await pool.end(); }
