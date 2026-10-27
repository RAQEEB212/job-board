import { v2 as cloudinary } from 'cloudinary';
export function configureCloudinary() {
  const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  if (keys.some(key => !process.env[key] || process.env[key].startsWith('your_'))) throw new Error('Add Cloudinary credentials to server/.env first.');
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
  return cloudinary;
}
