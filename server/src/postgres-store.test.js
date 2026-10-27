import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPostgresStore } from './postgres-store.js';

test('PostgreSQL stores, reloads and removes an advertisement', { skip: !process.env.DATABASE_URL }, async () => {
  const store = createPostgresStore();
  const id = `verification-${randomUUID()}`;
  try {
    await store.add({ id, advertisement: 'https://example.com/test.webp', advertisement_public_id: 'test-only', apply_link: 'https://example.com/apply?name=O%27Reilly', sample: true });
    const reopened = createPostgresStore();
    let record;
    try { record = (await reopened.list()).find(job => job.id === id); }
    finally { await reopened.close(); }
    assert.equal(record.apply_link, 'https://example.com/apply?name=O%27Reilly');
    assert.equal(record.sample, true);
    assert.equal((await store.remove(id)).id, id);
    assert.equal((await store.list()).some(job => job.id === id), false);
  } finally { await store.remove(id); await store.close(); }
});
