import { readFile } from 'node:fs/promises';
import { createPool } from '../src/database.js';
const pool = createPool();
const client = await pool.connect();
try {
  const jobs = JSON.parse(await readFile(new URL('../data/jobs.json', import.meta.url), 'utf8'));
  await client.query('BEGIN');
  let imported = 0;
  for (const job of jobs) {
    const result = await client.query('INSERT INTO jobs (id, advertisement, advertisement_public_id, apply_link, sample, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING', [String(job.id), job.advertisement, job.advertisement_public_id || null, job.apply_link, Boolean(job.sample), job.created_at || new Date()]);
    imported += result.rowCount;
  }
  await client.query('COMMIT');
  console.log(`Imported ${imported} advertisements. Existing records preserved.`);
} catch { await client.query('ROLLBACK'); console.error('Import failed. Original JSON file remains unchanged.'); process.exitCode = 1; }
finally { client.release(); await pool.end(); }
