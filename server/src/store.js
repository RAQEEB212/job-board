import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export function createStore(path = new URL('../data/jobs.json', import.meta.url)) {
  let queue = Promise.resolve();
  async function list() { return JSON.parse(await readFile(path, 'utf8')); }
  function update(change) {
    const task = queue.then(async () => {
      const jobs = await list();
      const result = change(jobs);
      const temporary = `${path instanceof URL ? fileURLToPath(path) : path}.tmp`;
      await writeFile(temporary, JSON.stringify(jobs, null, 2) + '\n');
      await rename(temporary, path);
      return result;
    });
    queue = task.catch(() => {});
    return task;
  }
  return { list, update };
}
