import { createApp } from './app.js';
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';
createApp().listen(port, host, () => console.log(`Job Board API: http://${host}:${port}`));
