import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createStore } from './store.js';

test('persists serialized updates in folder paths containing spaces', async () => {
 const dir = await mkdtemp(join(tmpdir(), 'job board '));
 try {
  const path = join(dir, 'jobs.json');
  await writeFile(path, '[]');
  const store = createStore(pathToFileURL(path));
  await Promise.all([store.update(jobs => jobs.push({id:1})), store.update(jobs => jobs.push({id:2}))]);
  assert.deepEqual(await store.list(), [{id:1},{id:2}]);
 } finally { await rm(dir, {recursive:true,force:true}); }
});
