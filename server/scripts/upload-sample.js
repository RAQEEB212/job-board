import { configureCloudinary } from '../src/cloudinary.js';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const file = process.argv[2];
if (!file) { console.error('Usage: npm run upload:sample -- /absolute/path/image.png'); process.exit(1); }
try {
 const client = configureCloudinary();
 const uploaded = await client.uploader.upload(resolve(file), { folder: 'job-board', resource_type: 'image' });
 await writeFile(new URL('../data/jobs.json', import.meta.url), JSON.stringify([{ id: 1, advertisement: uploaded.secure_url, advertisement_public_id: uploaded.public_id, apply_link: 'https://example.com/apply', sample: true }], null, 2) + '\n');
 console.log('Cloudinary upload successful. Sample advertisement updated.');
} catch { console.error('Upload failed. Check Cloudinary credentials and the image file.'); process.exitCode = 1; }
