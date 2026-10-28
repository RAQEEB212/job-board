let app;
export default async function handler(req, res) {
  try {
    if (!app) {
      const { createApp } = await import('../server/src/app.js');
      app = createApp();
    }
    return app(req, res);
  } catch (error) {
    const message = String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]');
    console.error('Backend initialization failed:', message);
    return res.status(503).json({ message: 'Backend initialization failed', code: error.code || error.name, detail: message });
  }
}
