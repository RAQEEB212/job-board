import { configureCloudinary } from '../src/cloudinary.js';
import { createPostgresStore } from '../src/postgres-store.js';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const file = process.argv[2];
if (!file) { console.error('Usage: npm run upload:sample -- /absolute/path/image.png'); process.exit(1); }
const store = createPostgresStore();
let uploaded;
try {
 await store.check();
 const client = configureCloudinary();
 uploaded = await client.uploader.upload(resolve(file), { folder: 'job-board', resource_type: 'image' });
 await store.add({ id: randomUUID(), advertisement: uploaded.secure_url, advertisement_public_id: uploaded.public_id, apply_link: 'https://example.com/apply', sample: true });
 console.log('Sample uploaded to Cloudinary and saved in PostgreSQL.');
} catch {
 if (uploaded) await configureCloudinary().uploader.destroy(uploaded.public_id).catch(() => {});
 console.error('Sample upload failed. Check database and Cloudinary access.');
 process.exitCode = 1;
} finally { await store.close(); }
