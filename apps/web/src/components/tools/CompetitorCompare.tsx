import { useState } from 'preact/hooks';
import { compareCompetitors } from '@listlift/core';

interface DraftComp {
  source: string;
  title: string;
  price: string;
}

const DEFAULT_COMPS: DraftComp[] = [
  { source: 'Competitor A', title: 'Handmade Soy Wax Lavender Candle 8oz Amber Glass Jar Aromatherapy Gift', price: '22.00' },
  { source: 'Competitor B', title: 'Natural Soy Candle French Lavender 9oz Essential Oil Relaxing Home Decor', price: '26.50' },
  { source: 'Competitor C', title: 'Organic Lavender Soy Wax Candle Cotton Wick 8oz Housewarming Gift', price: '19.99' },
];

export default function CompetitorCompare() {
  const [yourTitle, setYourTitle] = useState('Lavender Scented Soy Candle 8oz Jar');
  const [comps, setComps] = useState<DraftComp[]>(DEFAULT_COMPS);

  const valid = comps
    .filter((c) => c.title.trim().length >= 2)
    .map((c) => ({
      source: c.source.trim() || 'Competitor',
      title: c.title.trim(),
      price: c.price ? Number(c.price) : undefined,
      currency: 'USD',
      description: '',
    }));

  const result =
    valid.length >= 2
      ? compareCompetitors({ yourTitle, yourKeywords: [], competitors: valid })
      : null;

  const updateComp = (idx: number, field: keyof DraftComp, val: string) => {
    setComps((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div class="field">
          <label for="cc-your-title">Your current product title</label>
          <input
            id="cc-your-title"
            class="input"
            value={yourTitle}
            onInput={(e) => setYourTitle((e.target as HTMLInputElement).value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <strong style={{ fontSize: '0.9rem' }}>Competitor Listings (2–10)</strong>
          {comps.map((c, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px auto', gap: '8px', alignItems: 'center' }}>
              <input
                aria-label={`Competitor ${idx + 1} label`}
                class="input"
                value={c.source}
                onInput={(e) => updateComp(idx, 'source', (e.target as HTMLInputElement).value)}
                placeholder="Label / URL"
              />
              <input
                aria-label={`Competitor ${idx + 1} title`}
                class="input"
                value={c.title}
                onInput={(e) => updateComp(idx, 'title', (e.target as HTMLInputElement).value)}
                placeholder="Paste competitor title..."
              />
              <input
                aria-label={`Competitor ${idx + 1} price`}
                class="input mono"
                type="number"
                step="0.01"
                value={c.price}
                onInput={(e) => updateComp(idx, 'price', (e.target as HTMLInputElement).value)}
                placeholder="Price"
              />
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                onClick={() => setComps((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev))}
                aria-label={`Remove competitor ${idx + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            disabled={comps.length >= 10}
            onClick={() => setComps((prev) => [...prev, { source: `Competitor ${prev.length + 1}`, title: '', price: '' }])}
          >
            + Add competitor
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }} aria-live="polite">
          {result.priceBand && (
            <div class="card">
              <div class="muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>PRICE BAND ({result.priceBand.sampleSize} LISTINGS)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }} class="mono">
                <div><span class="muted">Min</span><br /><strong style={{ fontSize: '1.25rem' }}>${result.priceBand.min}</strong></div>
                <div><span class="muted">Median</span><br /><strong style={{ fontSize: '1.25rem', color: 'var(--success)' }}>${result.priceBand.median}</strong></div>
                <div><span class="muted">Max</span><br /><strong style={{ fontSize: '1.25rem' }}>${result.priceBand.max}</strong></div>
              </div>
            </div>
          )}

          <div class="card">
            <div class="muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>KEYWORD GAPS (MISSING FROM YOUR TITLE)</div>
            <div class="chip-group" style={{ marginTop: '10px' }}>
              {result.keywordGaps.length === 0 ? (
                <span class="badge badge-pass">You cover all repeated competitor terms!</span>
              ) : (
                result.keywordGaps.map((g) => <span key={g} class="badge badge-warn">{g}</span>)
              )}
            </div>
          </div>

          <div class="card" style={{ gridColumn: '1 / -1' }}>
            <strong style={{ display: 'block', marginBottom: '10px' }}>Title &amp; Keyword Frequency Matrix</strong>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr><th>Source</th><th>Title</th><th>Chars</th><th>Price</th></tr>
                </thead>
                <tbody>
                  {result.matrix.map((m, idx) => (
                    <tr key={idx}>
                      <td><strong>{m.source}</strong></td>
                      <td>{m.title}</td>
                      <td class="mono">{m.titleLength}</td>
                      <td class="mono">{m.price !== undefined ? `$${m.price}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul class="muted" style={{ margin: '12px 0 0', paddingLeft: '18px', fontSize: '0.86rem' }}>
              {result.titlePatterns.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
