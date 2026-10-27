import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/admin', { recursive: true });
await cp('public-web/dist', 'dist', { recursive: true });
await cp('admin-web/dist', 'dist/admin', { recursive: true });
console.log('Azaad Academy public and admin bundles ready.');
