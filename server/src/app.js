import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { createPool } from './database.js';
import { PostgresRateStore } from './rate-store.js';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { configureCloudinary } from './cloudinary.js';
import { createPostgresStore } from './postgres-store.js';

export function createApp({ store = createPostgresStore(), uploadImage = cloudUpload, removeImage = cloudRemove } = {}) {
  const app = express();
  const production = process.env.NODE_ENV === 'production';
  const configuredHash = process.env.ADMIN_PASSWORD ? (() => { const salt = randomUUID(); return `${salt}:${scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString('hex')}`; })() : process.env.ADMIN_PASSWORD_HASH;
  if (!process.env.SESSION_SECRET || !configuredHash || !process.env.ADMIN_EMAIL) {
    throw new Error('Configure SESSION_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH).');
  }
  if (production) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('X-Frame-Options', 'DENY');
    next();
  });
  app.use(express.json({ limit: '10kb' }));
  app.use('/api/admin', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) {
      const origin = req.get('origin');
      const allowed = process.env.ADMIN_ORIGIN?.split(',').map(value => value.trim()) || ['http://127.0.0.1:5184', 'http://localhost:5184'];
      if (!origin || !allowed.includes(origin)) return res.status(403).json({ message: 'Request origin is not allowed.' });
    }
    next();
  });
  const persistentAuth = production || process.env.SESSION_STORE === 'postgres';
  const authPool = persistentAuth ? createPool() : null;
  const PgSession = connectPgSimple(session);
  app.locals.closeAuth = async () => { if (authPool) await authPool.end(); };
  const sessionStore = authPool ? new PgSession({ pool: authPool, tableName: 'admin_sessions', pruneSessionInterval: false }) : undefined;
  app.use(session({
    store: sessionStore,
    name: 'jobboard.sid', secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'strict', secure: production, maxAge: 8 * 60 * 60 * 1000 },
  }));
  const requireAdmin = (req, res, next) => req.session.admin ? next() : res.status(401).json({ message: 'Please log in.' });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 1 } });
  const loginLimit = rateLimit({ ...(authPool ? { store: new PostgresRateStore(authPool) } : {}), windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, message: { message: 'Too many attempts. Try again in 15 minutes.' } });
  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'job-board-api' }));
  app.get('/api/jobs', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const jobs = await store.list();
    res.json(jobs.filter(job => !production || !job.sample).map(({ id, advertisement, apply_link, sample }) => ({ id, advertisement, apply_link, sample })));
  });
  app.get('/api/admin/session', (req, res) => res.json({ authenticated: Boolean(req.session.admin) }));
  app.post('/api/admin/login', loginLimit, (req, res, next) => {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 256) return res.status(400).json({ message: 'Enter a valid email and password.' });
    const [salt, stored] = configuredHash.split(':');
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(stored, 'hex');
    if (email !== process.env.ADMIN_EMAIL || expected.length !== actual.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ message: 'Email or password is incorrect.' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.admin = true;
      req.session.save(error => error ? next(error) : res.json({ authenticated: true }));
    });
  });
  app.post('/api/admin/logout', requireAdmin, (req, res, next) => req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('jobboard.sid', { httpOnly: true, sameSite: 'strict', secure: production });
    res.json({ authenticated: false });
  }));
  app.get('/api/admin/jobs', requireAdmin, async (req, res) => res.json(await store.list()));
  app.post('/api/admin/jobs', requireAdmin, upload.single('advertisement'), async (req, res) => {
    let link;
    try {
      link = new URL(req.body.apply_link);
      if (!['https:', 'http:'].includes(link.protocol) || link.username || link.password || link.href.length > 2048) throw new Error();
    } catch { return res.status(400).json({ message: 'Enter a valid http or https apply link.' }); }
    if (!req.file) return res.status(400).json({ message: 'Choose an advertisement image.' });
    let buffer;
    try {
      const image = sharp(req.file.buffer, { limitInputPixels: 20000000 });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error();
      buffer = await image.rotate().webp({ quality: 88 }).toBuffer();
    } catch { return res.status(400).json({ message: 'Use a valid JPG, PNG or WebP image (maximum 20 megapixels).' }); }
    let asset;
    try { asset = await uploadImage(buffer); }
    catch { return res.status(502).json({ message: 'Image upload failed. Please try again.' }); }
    const job = { id: randomUUID(), advertisement: asset.secure_url, advertisement_public_id: asset.public_id, apply_link: link.href, created_at: new Date().toISOString() };
    try { await store.add(job); }
    catch (error) { await removeImage(asset.public_id).catch(() => {}); throw error; }
    res.status(201).json(job);
  });
  app.delete('/api/admin/jobs/:id', requireAdmin, async (req, res) => {
    const removed = await store.remove(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Advertisement not found.' });
    // The listing stays removed if remote cleanup fails. Its asset ID is logged for retry.
    if (removed.advertisement_public_id) await removeImage(removed.advertisement_public_id).catch(() => console.error('Cloudinary cleanup failed for asset:', removed.advertisement_public_id));
    res.status(204).end();
  });
  app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 4 MB or smaller.' : 'Upload one image and one apply link.' });
    if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ message: 'Invalid request.' });
    console.error('API request failed:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  });
  return app;
}
function cloudUpload(buffer) {
  return new Promise((resolve, reject) => {
    const stream = configureCloudinary().uploader.upload_stream({ folder: 'job-board', resource_type: 'image' }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(buffer);
  });
}
async function cloudRemove(id) { return configureCloudinary().uploader.destroy(id, { invalidate: true }); }
