import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import sharp from 'sharp';
import { createApp } from './app.js';

test('admin authentication, validated uploads, public listing and deletion', async () => {
  const salt = randomBytes(16).toString('hex');
  process.env.ADMIN_EMAIL = 'test@example.com';
  process.env.ADMIN_PASSWORD_HASH = `${salt}:${scryptSync('test-password', salt, 64).toString('hex')}`;
  process.env.SESSION_SECRET = randomBytes(32).toString('hex');
  process.env.ADMIN_ORIGIN = 'http://127.0.0.1:5184';
  const jobs = [];
  let uploads = 0;
  let cleaned = false;
  const app = createApp({ store: { list: async () => jobs, add: async job => { jobs.unshift(job); return job; }, remove: async id => { const index = jobs.findIndex(job => job.id === id); return index < 0 ? null : jobs.splice(index, 1)[0]; } }, uploadImage: async () => { uploads++; return { secure_url: 'https://res.cloudinary.com/demo/test.webp', public_id: 'test' }; }, removeImage: async () => { cleaned = true; } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = '';
  const request = (path, options = {}) => fetch(base+path, { ...options, headers: { origin: 'http://127.0.0.1:5184', cookie, ...options.headers } });
  try {
    assert.equal((await request('/admin/jobs')).status, 401);
    assert.equal((await request('/admin/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.com',password:'wrong'})})).status, 401);
    const login = await request('/admin/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.com',password:'test-password'})});
    assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(login.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await request('/admin/logout',{method:'POST',headers:{origin:'https://untrusted.example'}})).status,403);
    const makeForm = (link, bytes, mime='image/png') => {const form=new FormData();form.append('apply_link',link);form.append('advertisement',new Blob([bytes],{type:mime}),'ad.png');return form;};
    const png = await sharp({create:{width:20,height:20,channels:3,background:'#234f3c'}}).png().toBuffer();
    assert.equal((await request('/admin/jobs',{method:'POST',body:makeForm('javascript:alert(1)',png)})).status,400);
    assert.equal((await request('/admin/jobs',{method:'POST',body:makeForm('https://example.com/apply','fake image')})).status,400);
    assert.equal(uploads,0);
    assert.equal((await request('/admin/jobs',{method:'POST',body:makeForm('https://example.com/apply',Buffer.alloc(5*1024*1024+1))})).status,400);
    const posted = await request('/admin/jobs',{method:'POST',body:makeForm('https://example.com/apply',png)});
    assert.equal(posted.status,201);
    const job=await posted.json();
    const listing=await (await request('/jobs')).json();
    assert.equal(listing.length,1);
    assert.equal(listing[0].apply_link,'https://example.com/apply');
    assert.equal('advertisement_public_id' in listing[0],false);
    assert.equal((await request(`/admin/jobs/${job.id}`,{method:'DELETE'})).status,204);
    assert.equal(cleaned,true);
    assert.equal(jobs.length,0);
    assert.equal((await request('/admin/logout',{method:'POST'})).status,200);
    assert.equal((await request('/admin/jobs')).status,401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
