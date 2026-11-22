import { useEffect, useState } from 'preact/hooks';

interface SharedPayload {
  id: string;
  productName: string;
  expiry: string;
  listing: {
    marketplaceName: string;
    sku: string;
    title: string;
    shortDescription: string;
    longDescription: string;
    bullets: string[];
    tags: string[];
    score: { score: number; grade: string };
    formattedCopyAll: string;
  };
}

export default function ShareViewer() {
  const [data, setData] = useState<SharedPayload | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    try {
      const json = decodeURIComponent(escape(atob(hash)));
      setData(JSON.parse(json) as SharedPayload);
    } catch {
      setData(null);
    }
  }, []);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  };

  if (!data) {
    return (
      <div class="card">
        <h2>No shared listing loaded</h2>
        <p class="muted">
          Open a share link generated from <a href="/studio">Listing Studio</a> to view and copy a client-ready listing here.
        </p>
      </div>
    );
  }

  const l = data.listing;
  return (
    <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span class="badge badge-pass">{l.marketplaceName} · Score {l.score.score}/100 ({l.score.grade})</span>
          <h1 style={{ margin: '8px 0 0', fontSize: '1.5rem' }}>{data.productName}</h1>
          <div class="muted mono" style={{ fontSize: '0.82rem' }}>SKU: {l.sku} · Read-only share (expires: {data.expiry})</div>
        </div>
        <button type="button" class="btn btn-primary" onClick={() => copy(l.formattedCopyAll, 'all')}>
          {copied === 'all' ? 'Copied all!' : 'Copy all fields'}
        </button>
      </div>

      <div class="card" style={{ background: 'var(--bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <strong>Title</strong>
          <button type="button" class="btn btn-secondary btn-sm" onClick={() => copy(l.title, 'title')}>
            {copied === 'title' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ margin: 0 }}>{l.title}</p>
      </div>

      <div class="card" style={{ background: 'var(--bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <strong>Bullets</strong>
          <button type="button" class="btn btn-secondary btn-sm" onClick={() => copy(l.bullets.join('\n'), 'bullets')}>
            {copied === 'bullets' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <ul style={{ margin: 0, paddingLeft: '18px' }}>
          {l.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </div>

      <div class="card" style={{ background: 'var(--bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <strong>Description</strong>
          <button type="button" class="btn btn-secondary btn-sm" onClick={() => copy(l.longDescription, 'desc')}>
            {copied === 'desc' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-ui)', fontSize: '0.9rem' }}>
          {l.longDescription}
        </pre>
      </div>

      <div class="card" style={{ background: 'var(--bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong>Tags ({l.tags.length})</strong>
          <button type="button" class="btn btn-secondary btn-sm" onClick={() => copy(l.tags.join(', '), 'tags')}>
            {copied === 'tags' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div class="chip-group">
          {l.tags.map((t) => <span key={t} class="badge badge-neutral">{t}</span>)}
        </div>
      </div>
    </div>
  );
}
