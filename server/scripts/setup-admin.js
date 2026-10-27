import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';

const file = new URL('../.env', import.meta.url);
if (!existsSync(file)) {
  console.error('Copy server/.env.example to server/.env first.');
  process.exit(1);
}
let env = readFileSync(file, 'utf8');
if (/^ADMIN_PASSWORD_HASH=.+/m.test(env)) {
  console.log('Admin is already configured. Existing credentials were preserved.');
} else {
  const password = randomBytes(18).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const values = {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@jobboard.local',
    ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
    SESSION_SECRET: randomBytes(48).toString('hex'),
    ADMIN_ORIGIN: 'http://127.0.0.1:5184,http://localhost:5184',
  };
  env = env.split('\n').filter(line => !Object.keys(values).some(key => line.startsWith(`${key}=`))).join('\n');
  writeFileSync(file, env + '\n' + Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', {mode:0o600});
  writeFileSync(new URL('../.admin-login.txt', import.meta.url), `Local Job Board admin\nEmail: ${values.ADMIN_EMAIL}\nPassword: ${password}\nURL: http://127.0.0.1:5184/\n`, {mode:0o600});
  console.log('Admin created. Open server/.admin-login.txt for login details.');
}
