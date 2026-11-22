import { useMemo, useState } from 'preact/hooks';
import { generateStudioListings } from '@listlift/core';
import type { MarketplaceId } from '@listlift/skills';

interface Preset {
  id: string;
  label: string;
  productName: string;
  brand: string;
  category: string;
  material: string;
  sizeOrQuantity: string;
  audienceOrUseCase: string;
  hardFacts: string[];
  keywords: string[];
}

const PRESETS: Preset[] = [
  {
    id: 'candle',
    label: 'Soy Candle',
    productName: 'Soy Wax Lavender Scented Candle',
    brand: 'Solace Home',
    category: 'Candles & Fragrance',
    material: '100% Natural Soy Wax, Amber Glass',
    sizeOrQuantity: '8oz Jar',
    audienceOrUseCase: 'Housewarming Gift',
    hardFacts: ['45-hour clean burn time', 'Braided cotton wick'],
    keywords: ['soy wax candle', 'lavender gift', 'amber jar'],
  },
  {
    id: 'kurta',
    label: 'Cotton Kurta (India)',
    productName: 'Handloom Pure Cotton Straight Kurta',
    brand: 'KalaVastra',
    category: 'Apparel & Ethnic Wear',
    material: '100% Breathable Handloom Cotton',
    sizeOrQuantity: 'Size M · Pack of 1',
    audienceOrUseCase: 'Office & Festive Daily Wear',
    hardFacts: ['Pre-shrunk fabric', 'Side pocket included'],
    keywords: ['cotton kurta', 'office wear', 'handloom'],
  },
  {
    id: 'flask',
    label: '1L Steel Flask',
    productName: 'Insulated Stainless Steel Water Bottle',
    brand: 'PeakSip',
    category: 'Kitchen & Dining',
    material: '304 Food-Grade Stainless Steel',
    sizeOrQuantity: '1000ml (34 oz)',
    audienceOrUseCase: 'Gym & Travel',
    hardFacts: ['Keeps cold 24 hours', 'Leakproof silicone seal'],
    keywords: ['vacuum flask', 'leakproof bottle', 'bpa free'],
  },
  {
    id: 'wallet',
    label: 'Leather Wallet',
    productName: 'Slim Bifold Full-Grain Leather Wallet',
    brand: 'NorthHide',
    category: 'Jewelry & Accessories',
    material: 'Full-Grain Vegetable-Tanned Leather',
    sizeOrQuantity: '6 Card Slots · Slim',
    audienceOrUseCase: 'Everyday Minimalist Carry',
    hardFacts: ['Hand-stitched edges', 'Fits front pocket'],
    keywords: ['slim wallet', 'leather bifold', 'gift for him'],
  },
];

const MARKETS: Array<{ id: MarketplaceId; label: string }> = [
  { id: 'etsy', label: 'Etsy' },
  { id: 'amazon', label: 'Amazon' },
  { id: 'flipkart', label: 'Flipkart' },
  { id: 'ebay', label: 'eBay' },
];

export default function HeroWorkbench() {
  const [presetId, setPresetId] = useState<string>('candle');
  const [market, setMarket] = useState<MarketplaceId>('etsy');
  const [copied, setCopied] = useState(false);

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]!;

  const generated = useMemo(() => {
    const res = generateStudioListings({
      productName: preset.productName,
      brand: preset.brand,
      category: preset.category,
      material: preset.material,
      sizeOrQuantity: preset.sizeOrQuantity,
      audienceOrUseCase: preset.audienceOrUseCase,
      hardFacts: preset.hardFacts,
      keywords: preset.keywords,
      competitorUrls: [],
      imageNotes: '',
      marketplaces: [market],
      language: 'en',
      tone: 'neutral',
    });
    return res;
  }, [preset, market]);

  const listing = generated.listings[0]!;
  const titleField = listing.score.fields.find((f) => f.field === 'title');
  const limit = titleField?.limit ?? 140;
  const pct = Math.min(100, Math.round((listing.title.length / limit) * 100));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(listing.formattedCopyAll);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
      }}
    >
      {/* Top bar: Sample Product Selector */}
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--subtle)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} role="group" aria-label="Sample products">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPresetId(p.id)}
              aria-pressed={p.id === presetId}
              style={{
                padding: '6px 11px',
                borderRadius: '7px',
                border: p.id === presetId ? '1px solid var(--ink-btn)' : '1px solid transparent',
                background: p.id === presetId ? 'var(--ink-btn)' : 'transparent',
                color: p.id === presetId ? 'var(--surface)' : 'var(--muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 150ms ease, color 150ms ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '4px' }} role="group" aria-label="Preview marketplace">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMarket(m.id)}
              aria-pressed={m.id === market}
              style={{
                padding: '5px 9px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: m.id === market ? 'var(--surface)' : 'transparent',
                color: m.id === market ? 'var(--text)' : 'var(--muted)',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Output Ledger */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} aria-live="polite">
        {/* Title + Live Limit Meter */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)' }}>
              {listing.marketplaceName} Title
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span class="mono" style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                {listing.title.length} / {limit} chars
              </span>
              <span class="badge badge-pass">Score {listing.score.score}/100</span>
            </div>
          </div>
          <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.98rem', lineHeight: 1.4, color: 'var(--text)' }}>
            {listing.title}
          </p>
          <div class="meter-track">
            <div class="meter-fill" style={{ width: `${pct}%`, background: 'var(--success)' }} />
          </div>
        </div>

        {/* Tags + Price Band split row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>Tags filled</span>
              <span class="mono" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-text)' }}>
                {listing.tags.length} slots
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {listing.tags.slice(0, 6).map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 7px',
                    borderRadius: '5px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  {t}
                </span>
              ))}
              {listing.tags.length > 6 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', padding: '2px 4px' }}>
                  +{listing.tags.length - 6} more
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>Competitor price band</span>
              <span class="mono" style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>SKU {listing.sku}</span>
            </div>
            {generated.evidence.priceBand && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }} class="mono">
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Min</div>
                  <strong style={{ fontSize: '0.98rem' }}>${generated.evidence.priceBand.min}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Median</div>
                  <strong style={{ fontSize: '1.08rem', color: 'var(--primary-text)' }}>${generated.evidence.priceBand.median}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Max</div>
                  <strong style={{ fontSize: '0.98rem' }}>${generated.evidence.priceBand.max}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Claim Grounding Proof Line */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <span class="badge badge-pass">{listing.claims.filter((c) => c.grounded).length} facts verified</span>
            <span>Rules checked {listing.lastVerified}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" class="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy sample'}
            </button>
            <a href="/studio" class="btn btn-primary btn-sm">
              Use your product
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
