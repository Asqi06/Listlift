import { useState } from 'preact/hooks';

export default function PricingSection() {
  const [annual, setAnnual] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  const prices = {
    USD: {
      pro: annual ? '$7.50' : '$9',
      proSub: annual ? 'billed $90/yr (2 months free)' : 'billed monthly · cancel anytime',
      biz: annual ? '$19.90' : '$24',
      bizSub: annual ? 'billed $239/yr (2 months free)' : 'billed monthly · cancel anytime',
    },
    INR: {
      pro: annual ? '₹249' : '₹299',
      proSub: annual ? 'billed ₹2,988/yr (2 months free)' : 'billed monthly · UPI / card',
      biz: annual ? '₹799' : '₹999',
      bizSub: annual ? 'billed ₹9,588/yr (2 months free)' : 'billed monthly · UPI / card',
    },
  }[currency];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Controls bar: Annual (default ON for higher AOV) + Currency */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px', borderRadius: '10px', background: 'var(--subtle)', border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            aria-pressed={annual}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              border: 'none',
              background: annual ? 'var(--surface)' : 'transparent',
              color: annual ? 'var(--text)' : 'var(--muted)',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: annual ? 'var(--shadow-sm)' : 'none',
            }}
          >
            Annual <span style={{ color: 'var(--primary-text)', marginLeft: '4px' }}>2 months free</span>
          </button>
          <button
            type="button"
            onClick={() => setAnnual(false)}
            aria-pressed={!annual}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              border: 'none',
              background: !annual ? 'var(--surface)' : 'transparent',
              color: !annual ? 'var(--text)' : 'var(--muted)',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: !annual ? 'var(--shadow-sm)' : 'none',
            }}
          >
            Monthly
          </button>
        </div>

        <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', borderRadius: '10px', background: 'var(--subtle)', border: '1px solid var(--border)' }}>
          {(['USD', 'INR'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              aria-pressed={currency === c}
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                border: 'none',
                background: currency === c ? 'var(--surface)' : 'transparent',
                color: currency === c ? 'var(--text)' : 'var(--muted)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: currency === c ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {c === 'USD' ? 'Global (USD)' : 'India (INR)'}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Architectural Pricing Table */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          alignItems: 'stretch',
        }}
      >
        {/* Free */}
        <div class="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>Free</h3>
            <p class="muted" style={{ margin: 0, fontSize: '0.88rem' }}>For testing products and single-channel sellers.</p>
          </div>
          <div>
            <span class="mono" style={{ fontSize: '2.25rem', fontWeight: 700 }}>{currency === 'USD' ? '$0' : '₹0'}</span>
            <span class="muted"> / forever</span>
            <div class="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>No credit card or signup needed</div>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.9rem' }}>
            <li>3 runs/day without signup · 10/day with account</li>
            <li>All 8 standalone public tools included</li>
            <li>Cached competitor packs &amp; 0–100 score linter</li>
            <li>7-day history &amp; read-only share links</li>
          </ul>
          <a href="/studio" class="btn btn-secondary" style={{ marginTop: 'auto' }}>
            Start using free
          </a>
        </div>

        {/* Pro */}
        <div
          class="card-elevated"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            borderColor: 'var(--primary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>Pro</h3>
              <p class="muted" style={{ margin: 0, fontSize: '0.88rem' }}>For active multi-marketplace sellers (10–300 SKUs).</p>
            </div>
            <span class="badge badge-pass">Best value</span>
          </div>
          <div>
            <span class="mono" style={{ fontSize: '2.25rem', fontWeight: 700 }}>{prices.pro}</span>
            <span class="muted"> / mo</span>
            <div class="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>{prices.proSub}</div>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.9rem' }}>
            <li><strong>~300 full listings / month</strong> across all 8 marketplaces</li>
            <li>Deep 15-source competitor research &amp; price bands</li>
            <li><strong>Bulk CSV</strong> import &amp; export (up to 50 rows/batch)</li>
            <li>Unlimited history, Brand Voice profiles &amp; BYOK</li>
            <li>Zero ads anywhere on the platform</li>
          </ul>
          <a href={`/contact?plan=pro&billing=${annual ? 'annual' : 'monthly'}`} class="btn btn-primary" style={{ marginTop: 'auto' }}>
            Join Pro ({prices.pro}/mo)
          </a>
        </div>

        {/* Business (High-AOV Anchor) */}
        <div class="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--subtle)' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>Business &amp; Agencies</h3>
            <p class="muted" style={{ margin: 0, fontSize: '0.88rem' }}>For VAs, agencies, and high-volume Indian/global catalogs.</p>
          </div>
          <div>
            <span class="mono" style={{ fontSize: '2.25rem', fontWeight: 700 }}>{prices.biz}</span>
            <span class="muted"> / mo</span>
            <div class="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>{prices.bizSub}</div>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.9rem' }}>
            <li><strong>~1,500 full listings / month</strong> + priority queue</li>
            <li><strong>500-row Bulk CSV</strong> batch generation &amp; SKU audit</li>
            <li><strong>3 team seats</strong> + REST API access</li>
            <li>Client-ready branded shareable previews (`/l/`)</li>
            <li>Dedicated brand voices per client store</li>
          </ul>
          <a href={`/contact?plan=business&billing=${annual ? 'annual' : 'monthly'}`} class="btn btn-ink" style={{ marginTop: 'auto' }}>
            Get Business ({prices.biz}/mo)
          </a>
        </div>
      </div>
    </div>
  );
}
