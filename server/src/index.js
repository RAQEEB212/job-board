import { createApp } from './app.js';
import { createPostgresStore } from './postgres-store.js';
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';
const store = createPostgresStore();
try {
  await store.check();
  console.log('PostgreSQL connection ready.');
  const server = createApp({ store }).listen(port, host, () => console.log(`Job Board API: http://${host}:${port}`));
  async function shutdown() {
    server.close(async () => { await store.close(); process.exit(0); });
  }
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
} catch {
  console.error('PostgreSQL unavailable. Check DATABASE_URL and run npm run db:migrate.');
  await store.close();
  process.exitCode = 1;
}
