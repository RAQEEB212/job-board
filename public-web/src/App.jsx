import { useEffect, useState } from 'react';

function AdvertisementCard({ job }) {
  return <article className="ad-card">
    <a className="poster-link" href={job.advertisement} target="_blank" rel="noopener noreferrer" aria-label="Open full advertisement">
      <img src={job.advertisement} alt="Job advertisement" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/sample-advertisement.svg'; }} />
    </a>
    <div className="card-bottom"><span>{job.sample ? 'Sample advertisement' : 'Job advertisement'}</span><a className="apply" href={job.apply_link} target="_blank" rel="noopener noreferrer">Apply ↗</a></div>
  </article>;
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch('/api/jobs', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Request failed'); return response.json(); })
      .then(data => { setJobs(data); setStatus('ready'); })
      .catch(error => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, [attempt]);
  return <>
    <header className="site-header"><div className="container"><a href="/" className="brand">Job Board<span>Advertisement & application links</span></a></div></header>
    <main className="container">
      <section className="intro"><span className="eyebrow">OPPORTUNITIES, IN ONE PLACE</span><h1>Your next opportunity<br />starts here.</h1><p>Browse advertisements and apply directly through the official link.</p></section>
      <section aria-labelledby="jobs-heading"><div className="section-heading"><h2>Latest advertisements</h2>{status === 'ready' && <span>{jobs.length} posted</span>}</div>
        {status === 'loading' && <p role="status">Loading advertisements…</p>}
        {status === 'error' && <div role="alert"><p>Advertisements could not load. Please try again.</p><button onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
        {status === 'ready' && (jobs.length ? <div className="ad-grid">{jobs.map(job => <AdvertisementCard key={job.id} job={job} />)}</div> : <p>No advertisements yet. Check back soon.</p>)}
      </section>
    </main><footer className="container">Job Board · Apply on the advertiser’s website.</footer>
  </>;
}
