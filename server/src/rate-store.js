import { createHash } from 'node:crypto';
export class PostgresRateStore {
  constructor(pool) { this.pool = pool; this.localKeys = false; }
  init(options) { this.windowMs = options.windowMs; }
  key(value) { return createHash('sha256').update(value).digest('hex'); }
  async increment(key) {
    const { rows } = await this.pool.query(`
      INSERT INTO admin_login_attempts (key, hits, expires_at)
      VALUES ($1, 1, NOW() + $2 * INTERVAL '1 millisecond')
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN admin_login_attempts.expires_at <= NOW() THEN 1 ELSE admin_login_attempts.hits + 1 END,
        expires_at = CASE WHEN admin_login_attempts.expires_at <= NOW() THEN EXCLUDED.expires_at ELSE admin_login_attempts.expires_at END
      RETURNING hits, expires_at`, [this.key(key), this.windowMs]);
    return { totalHits: rows[0].hits, resetTime: rows[0].expires_at };
  }
  async decrement(key) { await this.pool.query('UPDATE admin_login_attempts SET hits = GREATEST(0, hits - 1) WHERE key = $1', [this.key(key)]); }
  async resetKey(key) { await this.pool.query('DELETE FROM admin_login_attempts WHERE key = $1', [this.key(key)]); }
}
