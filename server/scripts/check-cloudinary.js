import { configureCloudinary } from '../src/cloudinary.js';
try { const result = await configureCloudinary().api.ping(); console.log('Cloudinary:', result.status); } catch { console.error('Cloudinary connection failed: verify the three Cloudinary values in server/.env.'); process.exitCode = 1; }
