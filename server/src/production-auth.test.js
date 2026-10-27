import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

test('production admin session persists across function instances and logout', {skip: !process.env.DATABASE_URL || !process.env.ADMIN_PASSWORD}, async () => {
  process.env.NODE_ENV = 'production';
  const origin = process.env.ADMIN_ORIGIN.split(',')[0];
  const apps = [createApp({store:{list:async()=>[]}}),createApp({store:{list:async()=>[]}})];
  const servers = apps.map(app=>app.listen(0,'127.0.0.1'));
  await Promise.all(servers.map(server=>new Promise(resolve=>server.once('listening',resolve))));
  const urls=servers.map(server=>`http://127.0.0.1:${server.address().port}/api/admin`);
  let cookie='';
  const headers={origin,'x-forwarded-proto':'https','x-forwarded-for':'198.51.100.42'};
  try {
    const login=await fetch(urls[0]+'/login',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});
    assert.equal(login.status,200);
    const setCookie=login.headers.get('set-cookie');
    assert.match(setCookie,/Secure/);assert.match(setCookie,/HttpOnly/);
    cookie=setCookie.split(';')[0];
    const restored=await fetch(urls[1]+'/session',{headers:{...headers,cookie}});
    assert.equal((await restored.json()).authenticated,true);
    assert.equal((await fetch(urls[1]+'/logout',{method:'POST',headers:{...headers,cookie}})).status,200);
    cookie='';
    const ended=await fetch(urls[0]+'/session',{headers:{...headers,cookie:setCookie.split(';')[0]}});
    assert.equal((await ended.json()).authenticated,false);
  } finally {
    if(cookie) await fetch(urls[0]+'/logout',{method:'POST',headers:{...headers,cookie}});
    await Promise.all(servers.map(server=>new Promise(resolve=>server.close(resolve))));
    await Promise.all(apps.map(app=>app.locals.closeAuth()));
  }
});
