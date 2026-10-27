import { useEffect, useState } from 'react';

async function api(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, options);
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.message || 'Request failed.'); error.status = response.status; throw error; }
  return data;
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [deleting, setDeleting] = useState(null);
  useEffect(() => {
    api('/session').then(data => setAuth(data.authenticated)).catch(() => { setAuth(false); setError('Cannot reach the server. Please reload.'); });
  }, []);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function loadJobs() {
    setLoading(true);
    try { setJobs(await api('/jobs')); }
    catch (error) { if (error.status === 401) setAuth(false); setError(error.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (auth) loadJobs(); }, [auth]);
  function failure(error) { if (error.status === 401) setAuth(false); setError(error.message); }
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try { await api('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) }); setAuth(true); }
    catch (error) { failure(error); } finally { setBusy(false); }
  }
  async function publish(event) {
    event.preventDefault(); setError(''); setMessage('');
    const form = event.currentTarget;
    if (!file || file.size > 4 * 1024 * 1024) { setError('Choose an image up to 4 MB.'); return; }
    setBusy(true);
    try { const job = await api('/jobs', { method: 'POST', body: new FormData(form) }); setJobs(current => [job, ...current]); form.reset(); setFile(null); setMessage('Advertisement published. It is now available on the public page.'); }
    catch (error) { failure(error); } finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true); setError(''); setMessage('');
    try { await api(`/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' }); setJobs(current => current.filter(job => job.id !== id)); setDeleting(null); setMessage('Advertisement deleted.'); }
    catch (error) { failure(error); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await api('/logout', { method: 'POST' }); setAuth(false); setJobs([]); setFile(null); setMessage(''); }
    catch (error) { failure(error); } finally { setBusy(false); }
  }
  return <>
    <header><div className="shell header"><a className="brand" href="/">Azaad Academy <span>ADMIN</span></a>{auth && <button className="secondary" disabled={busy} onClick={logout}>Logout</button>}</div></header>
    <main className="shell">
      {auth === null ? <p role="status">Checking session…</p> : !auth ? <section className="login-panel">
        <span className="eyebrow">ADMIN ACCESS</span><h1>Welcome back.</h1><p>Sign in to publish job advertisements.</p>
        <form onSubmit={login}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required disabled={busy}/><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required disabled={busy}/><button disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button></form>
      </section> : <>
        <div className="page-heading"><span className="eyebrow">AZAAD ACADEMY</span><h1>Manage advertisements</h1><p>Upload an advertisement and add its application link.</p></div>
        <div className="layout"><section className="panel"><h2>Post a job</h2><form onSubmit={publish}>
          <label htmlFor="advertisement">Advertisement image</label><input id="advertisement" name="advertisement" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy} onChange={event => { setFile(event.target.files[0] || null); setError(''); }}/><small>JPG, PNG or WebP · up to 4 MB</small>
          {preview && <img className="upload-preview" src={preview} alt="Selected advertisement preview"/>}
          <label htmlFor="apply-link">Apply link</label><input id="apply-link" name="apply_link" type="url" placeholder="https://example.com/apply" required maxLength={2048} disabled={busy}/>
          <button disabled={busy}>{busy ? 'Please wait…' : 'Publish advertisement'}</button>
        </form></section>
        <section className="posted"><div className="list-heading"><h2>Posted advertisements <span>({jobs.length})</span></h2><button className="secondary" onClick={loadJobs} disabled={busy || loading}>Refresh</button></div>
          {loading ? <p role="status">Loading advertisements…</p> : !jobs.length ? <p>No advertisements yet. Publish your first one.</p> : <div className="job-list">{jobs.map(job => <article className="job-row" key={job.id}>
            <a href={job.advertisement} target="_blank" rel="noopener noreferrer" aria-label="Open advertisement"><img src={job.advertisement} alt="Posted advertisement"/></a>
            <div className="job-detail"><strong>{job.sample ? 'Sample advertisement' : 'Advertisement'}</strong><a className="apply-link" href={job.apply_link} target="_blank" rel="noopener noreferrer">{job.apply_link}</a>
            {deleting === job.id ? <div className="confirm"><span>Delete this advertisement?</span><div><button className="danger" disabled={busy} onClick={() => remove(job.id)}>Confirm delete</button><button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button></div></div> : <button className="delete" disabled={busy} onClick={() => setDeleting(job.id)}>Delete</button>}
            </div></article>)}</div>}
        </section></div>
      </>}
      {error && <div className="message error" role="alert">{error}</div>}{message && <div className="message success" role="status">{message}</div>}
    </main>
  </>;
}
