import { useState } from 'preact/hooks';
import { getAllMarketplaceSkills, type MarketplaceId } from '@listlift/skills';
import { scoreListing } from '@listlift/core';

const SKILLS = getAllMarketplaceSkills();

export default function ListingScorer() {
  const [marketplace, setMarketplace] = useState<MarketplaceId>('etsy');
  const [title, setTitle] = useState(
    'Soy Wax Lavender Candle Handmade 8oz Amber Glass Jar Relaxing Gift',
  );
  const [description, setDescription] = useState(
    'Hand-poured 8oz natural soy wax candle infused with French lavender essential oil. Burns cleanly for 45 hours in a reusable amber glass jar with a braided cotton wick.',
  );
  const [tagsText, setTagsText] = useState(
    'soy wax candle, lavender candle, handmade gift, amber jar candle, relaxing scent',
  );
  const [keywordsText, setKeywordsText] = useState('soy wax, lavender, amber glass, cotton wick');

  const result = scoreListing({
    marketplace,
    title,
    description,
    bullets: [],
    tags: tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    search_terms: '',
    seo_title: '',
    meta_description: '',
    target_keywords: keywordsText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  });

  const scoreTone =
    result.score >= 85 ? 'pass' : result.score >= 60 ? 'warn' : 'fail';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'start' }}>
      <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div class="chip-group" role="group" aria-label="Marketplace rules">
          {SKILLS.map((s) => (
            <button
              key={s.marketplace}
              type="button"
              class="chip"
              aria-pressed={s.marketplace === marketplace}
              onClick={() => setMarketplace(s.marketplace)}
            >
              {s.display_name}
            </button>
          ))}
        </div>

        <div class="field">
          <label for="ls-title">Listing Title</label>
          <input
            id="ls-title"
            class="input"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="field">
          <label for="ls-desc">Description</label>
          <textarea
            id="ls-desc"
            class="textarea"
            rows={4}
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          />
        </div>

        <div class="field">
          <label for="ls-tags">Tags (comma-separated)</label>
          <input
            id="ls-tags"
            class="input"
            value={tagsText}
            onInput={(e) => setTagsText((e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="field">
          <label for="ls-kw">Target keywords to check (comma-separated)</label>
          <input
            id="ls-kw"
            class="input"
            value={keywordsText}
            onInput={(e) => setKeywordsText((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-live="polite">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div class="muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {result.marketplaceName.toUpperCase()} SCORE
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
              {result.score}
              <span class="muted" style={{ fontSize: '1.1rem', fontWeight: 500 }}>/100</span>
            </div>
          </div>
          <span class={`badge badge-${scoreTone}`} style={{ fontSize: '1rem', padding: '8px 14px' }}>
            Grade {result.grade}
          </span>
        </div>

        <div class="meter-track">
          <div
            class="meter-fill"
            style={{
              width: `${result.score}%`,
              background:
                scoreTone === 'pass'
                  ? 'var(--success)'
                  : scoreTone === 'warn'
                    ? 'var(--warning)'
                    : 'var(--danger)',
            }}
          />
        </div>

        <div>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Field Checks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.fields.map((f) => (
              <div
                key={f.field}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{f.label}</span>
                <span class={`badge badge-${f.status}`}>
                  {f.countMax !== undefined
                    ? `${f.count ?? 0}/${f.countMax}`
                    : f.byteLimit !== undefined
                      ? `${f.bytes}/${f.byteLimit}B`
                      : `${f.length}${f.limit ? `/${f.limit}` : ''}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
            Fix Checklist ({result.issues.length})
          </h3>
          {result.issues.length === 0 ? (
            <p class="badge badge-pass">No rule issues found for {result.marketplaceName}.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
              {result.issues.map((issue, idx) => (
                <li key={idx}>
                  <strong>{issue.message}</strong>{' '}
                  <span class="muted">{issue.suggestion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div class="muted" style={{ fontSize: '0.78rem' }}>
          Keyword coverage: <strong class="mono">{result.keywordCoverage.percent}%</strong> · Rules verified {result.lastVerified}
        </div>
      </div>
    </div>
  );
}
