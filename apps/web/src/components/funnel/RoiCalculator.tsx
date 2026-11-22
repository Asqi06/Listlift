import { useState } from 'preact/hooks';

export default function RoiCalculator() {
  const [skus, setSkus] = useState(60);
  const [channels, setChannels] = useState(3);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  const totalVariants = skus * channels;
  // PRD Section 3 honest math: 25 min manual vs 5 min review-only = 20 min saved per listing
  const hoursSaved = Math.round((totalVariants * 20) / 60);
  const hourlyRate = currency === 'USD' ? 12 : 400;
  const labourSaved = hoursSaved * hourlyRate;

  const recommendedTier = totalVariants > 280 || channels >= 4 ? 'Business' : 'Pro';
  const planCost =
    recommendedTier === 'Business'
      ? currency === 'USD'
        ? 19.9
        : 799
      : currency === 'USD'
        ? 7.5
        : 249;

  const fmt = (val: number) =>
    currency === 'USD'
      ? `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const fmtPlan = (val: number) =>
    currency === 'USD' ? `$${val.toFixed(2).replace(/\.00$/, '')}` : `₹${val}`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        alignItems: 'stretch',
      }}
    >
      {/* Left: Tactile Sliders */}
      <div class="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '1rem' }}>Estimate your monthly savings</strong>
          <div style={{ display: 'flex', gap: '4px', padding: '3px', borderRadius: '8px', background: 'var(--subtle)' }}>
            {(['USD', 'INR'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: currency === c ? 'var(--surface)' : 'transparent',
                  color: currency === c ? 'var(--text)' : 'var(--muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: currency === c ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {c === 'USD' ? 'USD ($)' : 'INR (₹)'}
              </button>
            ))}
          </div>
        </div>

        <div class="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label for="roi-skus">New or refreshed SKUs per month</label>
            <span class="mono" style={{ fontWeight: 700, fontSize: '1rem' }}>{skus} SKUs</span>
          </div>
          <input
            id="roi-skus"
            type="range"
            min={10}
            max={400}
            step={10}
            value={skus}
            onInput={(e) => setSkus(Number((e.target as HTMLInputElement).value))}
            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <div class="muted mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
            <span>10 SKUs</span>
            <span>200 SKUs</span>
            <span>400 SKUs</span>
          </div>
        </div>

        <div class="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label for="roi-channels">Marketplaces you sell on</label>
            <span class="mono" style={{ fontWeight: 700, fontSize: '1rem' }}>{channels} channel{channels > 1 ? 's' : ''}</span>
          </div>
          <input
            id="roi-channels"
            type="range"
            min={1}
            max={8}
            step={1}
            value={channels}
            onInput={(e) => setChannels(Number((e.target as HTMLInputElement).value))}
            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <div class="muted mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
            <span>1</span>
            <span>4</span>
            <span>8 marketplaces</span>
          </div>
        </div>

        <p class="muted" style={{ margin: 'auto 0 0', fontSize: '0.8rem' }}>
          Based on 25 min manual listing vs. 5 min review-only in ListLift (~20 min saved per variant). Illustrative estimate — validate with your own catalog.
        </p>
      </div>

      {/* Right: Live ROI Ledger & Smart Tier Recommendation */}
      <div
        class="card-elevated"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '18px',
          borderColor: 'var(--border-strong)',
        }}
        aria-live="polite"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div class="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Time saved / month</div>
            <div class="mono" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15, marginTop: '4px' }}>
              {hoursSaved} hrs
            </div>
            <div class="muted mono" style={{ fontSize: '0.76rem', marginTop: '4px' }}>
              {totalVariants} marketplace variants
            </div>
          </div>

          <div>
            <div class="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Est. labour value saved</div>
            <div class="mono" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15, marginTop: '4px', color: 'var(--primary-text)' }}>
              {fmt(labourSaved)}
            </div>
            <div class="muted mono" style={{ fontSize: '0.76rem', marginTop: '4px' }}>
              vs. {fmtPlan(planCost)}/mo ({recommendedTier})
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            background: 'var(--subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.92rem' }}>Best fit: ListLift {recommendedTier}</strong>
            <span class="badge badge-pass">Save 20% annual</span>
          </div>
          <p class="muted" style={{ margin: 0, fontSize: '0.84rem' }}>
            {recommendedTier === 'Business'
              ? 'Includes 1,500 listings/mo, 500-row Bulk CSV, 3 team seats, priority queue, and API access.'
              : 'Includes 300 listings/mo, all 8 marketplaces per run, 50-row Bulk CSV, brand voice, and BYOK.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <a href={`/contact?plan=${recommendedTier.toLowerCase()}&billing=annual`} class="btn btn-primary" style={{ flex: '1 1 180px' }}>
            Lock in {recommendedTier} ({fmtPlan(planCost)}/mo)
          </a>
          <a href="/studio" class="btn btn-secondary">
            Try free first
          </a>
        </div>
      </div>
    </div>
  );
}
