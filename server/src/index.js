import express from 'express';
import { readFile } from 'node:fs/promises';
const app = express();
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'job-board-api' }));
app.get('/api/jobs', async (req, res) => {
 try {
  const jobs = JSON.parse(await readFile(new URL('../data/jobs.json', import.meta.url), 'utf8'));
  res.json(jobs.map(({ id, advertisement, apply_link, sample }) => ({ id, advertisement, apply_link, sample })));
 } catch { res.status(500).json({ message: 'Unable to load advertisements.' }); }
});
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`Job Board API: http://${host}:${port}`));
