import { createPool } from './database.js';
export function createPostgresStore(pool = createPool()) {
  return {
    async list() {
      const { rows } = await pool.query('SELECT id, advertisement, advertisement_public_id, apply_link, sample, created_at FROM jobs ORDER BY created_at DESC, id DESC');
      return rows;
    },
    async add(job) {
      const { rows } = await pool.query(
        'INSERT INTO jobs (id, advertisement, advertisement_public_id, apply_link, sample, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [String(job.id), job.advertisement, job.advertisement_public_id || null, job.apply_link, Boolean(job.sample), job.created_at || new Date()],
      );
      return rows[0];
    },
    async remove(id) {
      const { rows } = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [String(id)]);
      return rows[0] || null;
    },
    async check() { await pool.query('SELECT 1'); },
    async close() { await pool.end(); },
  };
}
