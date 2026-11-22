import { useEffect, useState } from 'preact/hooks';
import { getAllMarketplaceSkills, type MarketplaceId } from '@listlift/skills';
import { createAutoFillPayload, scoreListing, type LiveStudioGenerateResult } from '@listlift/core';
import ListingLoadingCard from './ListingLoadingCard';

const SKILLS = getAllMarketplaceSkills();

interface SyncedStudioDraft {
  marketplace?: string;
  marketplaceName?: string;
  title?: string;
  longDescription?: string;
  shortDescription?: string;
  bullets?: string[];
  tags?: string[];
  searchTerms?: string;
  seoTitle?: string;
  metaDescription?: string;
}

export default function ListingScorer() {
  const [marketplace, setMarketplace] = useState<MarketplaceId>('amazon');
  const [productUrl, setProductUrl] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlStatus, setUrlStatus] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bulletsText, setBulletsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [searchTerms, setSearchTerms] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywordsText, setKeywordsText] = useState('');

  const [studioDraft, setStudioDraft] = useState<SyncedStudioDraft | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeErr, setOptimizeErr] = useState<string | null>(null);
  const [optimized, setOptimized] = useState<{
    beforeScore: number;
    afterScore: number;
    listing: LiveStudioGenerateResult['listings'][number];
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('listlift_autofill_latest');
      if (raw) {
        const parsed = JSON.parse(raw) as SyncedStudioDraft;
        if (parsed?.title) setStudioDraft(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const activeSkill = SKILLS.find((s) => s.marketplace === marketplace) ?? SKILLS[0]!;
  const targetKeywords = keywordsText.split(',').map((k) => k.trim()).filter(Boolean);
  const bulletsList = bulletsText.split('\n').map((b) => b.trim()).filter(Boolean);
  const tagsList = tagsText.split(',').map((t) => t.trim()).filter(Boolean);

  const hasContent = title.trim().length > 0 || description.trim().length > 0;

  const result = scoreListing({
    marketplace,
    title,
    description,
    bullets: bulletsList,
    tags: tagsList,
    search_terms: searchTerms,
    seo_title: seoTitle,
    meta_description: metaDescription,
    target_keywords: targetKeywords,
  });

  const studioScore = studioDraft?.title
    ? scoreListing({
        marketplace,
        title: studioDraft.title ?? '',
        description: studioDraft.longDescription || studioDraft.shortDescription || '',
        bullets: studioDraft.bullets ?? [],
        tags: studioDraft.tags ?? [],
        search_terms: studioDraft.searchTerms ?? '',
        seo_title: studioDraft.seoTitle ?? '',
        meta_description: studioDraft.metaDescription ?? '',
        target_keywords: targetKeywords,
      })
    : null;

  const fetchFromUrl = async (e: Event) => {
    e.preventDefault();
    const cleaned = productUrl.trim();
    if (!/^https:\/\//i.test(cleaned)) {
      setUrlStatus('Enter a valid public https:// product URL.');
      return;
    }
    setFetchingUrl(true);
    setUrlStatus(null);
    setOptimized(null);

    try {
      const res = await fetch('/api/v1/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: 'Live Product Audit',
          marketplace,
          urls: [cleaned],
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        competitors?: Array<{ title?: string; description?: string; price?: number; currency?: string }>;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Could not fetch this URL.');
      }
      const hit = data.competitors?.[0];
      if (!hit || (!hit.title && !hit.description)) {
        setUrlStatus(
          'This website blocks automated readers or hides product text behind login/JS. Paste the title & description below to audit and optimize it.',
        );
      } else {
        if (hit.title) setTitle(hit.title);
        if (hit.description) setDescription(hit.description);
        setSeoTitle((hit.title ?? '').slice(0, 60));
        setMetaDescription((hit.description ?? '').slice(0, 155));
        setUrlStatus(
          `Imported live product data${hit.price ? ` (${hit.currency ?? 'USD'} ${hit.price})` : ''}. Review the rule audit on the right.`,
        );
      }
    } catch (err) {
      setUrlStatus(err instanceof Error ? err.message : 'Unable to reach URL. Paste your listing text below.');
    } finally {
      setFetchingUrl(false);
    }
  };

  const runOptimize = async () => {
    if (!hasContent) {
      setOptimizeErr('Import a product URL or paste your current title & description first.');
      return;
    }
    setOptimizing(true);
    setOptimizeErr(null);
    const beforeScore = result.score;
    const issueHints = result.issues.slice(0, 5).map((i) => `${i.field}: ${i.message}`);

    try {
      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTool: 'title',
          productName: title.trim() || description.trim().slice(0, 80),
          hardFacts: [
            ...(description.trim() ? [`Existing product info: ${description.trim().slice(0, 320)}`] : []),
            ...(issueHints.length > 0 ? [`Fix these rule gaps: ${issueHints.join('; ')}`] : []),
          ],
          keywords: targetKeywords,
          marketplaces: [marketplace],
        }),
      });
      const data = (await res.json()) as LiveStudioGenerateResult & { error?: string };
      if (!res.ok || !data.listings?.[0]) {
        throw new Error(data.error || 'Our optimizer is temporarily busy. Please retry in a moment.');
      }
      const upgraded = data.listings[0];
      const afterAudit = scoreListing({
        marketplace,
        title: upgraded.title,
        description: upgraded.longDescription,
        bullets: upgraded.bullets,
        tags: upgraded.tags,
        search_terms: upgraded.searchTerms,
        seo_title: upgraded.seoMeta.seoTitle,
        meta_description: upgraded.seoMeta.metaDescription,
        target_keywords: targetKeywords,
      });

      setOptimized({
        beforeScore,
        afterScore: afterAudit.score,
        listing: upgraded,
      });
      showToast(`Optimized listing ready (${beforeScore} → ${afterAudit.score}/100)`);
    } catch (err) {
      setOptimizeErr(err instanceof Error ? err.message : 'Optimization failed. Please try again.');
    } finally {
      setOptimizing(false);
    }
  };

  const applyOptimized = () => {
    if (!optimized) return;
    const l = optimized.listing;
    setTitle(l.title);
    setDescription(l.longDescription);
    setBulletsText(l.bullets.join('\n'));
    setTagsText(l.tags.join(', '));
    setSearchTerms(l.searchTerms);
    setSeoTitle(l.seoMeta.seoTitle);
    setMetaDescription(l.seoMeta.metaDescription);
    showToast('Applied optimized listing to editor');
  };

  const scoreTone = result.score >= 85 ? 'pass' : result.score >= 60 ? 'warn' : 'fail';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Product URL Import Bar */}
      <form onSubmit={fetchFromUrl} class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <strong style={{ fontSize: '1rem' }}>1. Paste a live product URL to audit (or enter copy manually below)</strong>
          <span class="muted" style={{ fontSize: '0.8rem' }}>Works with Shopify, WooCommerce, Custom Websites, Etsy &amp; public product pages</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="url"
            class="input"
            style={{ flex: '1 1 280px' }}
            value={productUrl}
            onInput={(e) => setProductUrl((e.target as HTMLInputElement).value)}
            placeholder="https://yourstore.com/products/gold-ribbed-heart-earrings"
            aria-label="Product URL to audit"
          />
          <button type="submit" class="btn btn-primary" disabled={fetchingUrl}>
            {fetchingUrl ? 'Fetching URL…' : 'Fetch & Audit URL'}
          </button>
        </div>
        {urlStatus && <p class="muted" style={{ margin: 0, fontSize: '0.84rem' }}>{urlStatus}</p>}
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {/* Left: Marketplace Selector & Listing Fields */}
        <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div class="muted" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
              TARGET MARKETPLACE OR CUSTOM WEBSITE RULES
            </div>
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
          </div>

          <div class="field">
            <label for="ls-title">Listing Title ({activeSkill.fields.title.max} chars max)</label>
            <input
              id="ls-title"
              class="input"
              value={title}
              placeholder="Paste your current product title…"
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
              placeholder="Paste your current product description…"
              onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            />
          </div>

          {activeSkill.fields.bullets && (
            <div class="field">
              <label for="ls-bullets">Key Bullets / Highlights (one per line)</label>
              <textarea
                id="ls-bullets"
                class="textarea"
                rows={3}
                value={bulletsText}
                placeholder="Paste each bullet point on a new line…"
                onInput={(e) => setBulletsText((e.target as HTMLTextAreaElement).value)}
              />
            </div>
          )}

          {activeSkill.fields.tags && (
            <div class="field">
              <label for="ls-tags">Tags (comma-separated · max {activeSkill.fields.tags.count_max})</label>
              <input
                id="ls-tags"
                class="input"
                value={tagsText}
                placeholder="gold heart earrings, ribbed stud earrings, gift for her"
                onInput={(e) => setTagsText((e.target as HTMLInputElement).value)}
              />
            </div>
          )}

          {activeSkill.fields.search_terms && (
            <div class="field">
              <label for="ls-search-terms">Backend Search Terms (≤{activeSkill.fields.search_terms.max_bytes} UTF-8 bytes)</label>
              <input
                id="ls-search-terms"
                class="input"
                value={searchTerms}
                placeholder="Space-separated backend keywords"
                onInput={(e) => setSearchTerms((e.target as HTMLInputElement).value)}
              />
            </div>
          )}

          {(activeSkill.fields.seo_title || activeSkill.fields.meta_description) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div class="field">
                <label for="ls-seo-title">SEO Meta Title (≤60c)</label>
                <input id="ls-seo-title" class="input" value={seoTitle} onInput={(e) => setSeoTitle((e.target as HTMLInputElement).value)} />
              </div>
              <div class="field">
                <label for="ls-meta-desc">SEO Meta Description (≤155c)</label>
                <input id="ls-meta-desc" class="input" value={metaDescription} onInput={(e) => setMetaDescription((e.target as HTMLInputElement).value)} />
              </div>
            </div>
          )}

          <div class="field">
            <label for="ls-kw">Target buyer keywords to verify (comma-separated)</label>
            <input
              id="ls-kw"
              class="input"
              value={keywordsText}
              placeholder="e.g. gold heart earrings, hypoallergenic, gift"
              onInput={(e) => setKeywordsText((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        {/* Right: Real Rule-Based Score, Studio Comparison & 1-Click Optimizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-live="polite">
          <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div class="muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {result.marketplaceName.toUpperCase()} RULE COMPLIANCE SCORE
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
                  {hasContent ? result.score : '—'}
                  <span class="muted" style={{ fontSize: '1.1rem', fontWeight: 500 }}>/100</span>
                </div>
              </div>
              {hasContent && (
                <span class={`badge badge-${scoreTone}`} style={{ fontSize: '1rem', padding: '8px 14px' }}>
                  Grade {result.grade}
                </span>
              )}
            </div>

            <div class="meter-track">
              <div
                class="meter-fill"
                style={{
                  width: `${hasContent ? result.score : 0}%`,
                  background:
                    scoreTone === 'pass'
                      ? 'var(--success)'
                      : scoreTone === 'warn'
                        ? 'var(--warning)'
                        : 'var(--danger)',
                }}
              />
            </div>

            {/* Compare Against Latest ListLift Studio Listing */}
            {studioScore && hasContent && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '0.84rem',
                }}
              >
                <div>
                  <strong>Compared to your latest Studio draft:</strong>{' '}
                  <span class="mono">{result.score}/100</span> (current) vs{' '}
                  <span class="mono"><strong>{studioScore.score}/100</strong></span> (Studio)
                </div>
                <span class={`badge ${studioScore.score >= result.score ? 'badge-pass' : 'badge-neutral'}`}>
                  {studioScore.score - result.score >= 0
                    ? `+${studioScore.score - result.score} pts with Studio`
                    : `${studioScore.score - result.score} pts`}
                </span>
              </div>
            )}

            {/* 1-Click Fix & Optimize Action */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                class="btn btn-primary"
                disabled={optimizing || !hasContent}
                onClick={runOptimize}
              >
                {optimizing ? 'Optimizing weak fields…' : 'Fix Weak Areas & Optimize Listing'}
              </button>
              <span class="muted" style={{ fontSize: '0.78rem' }}>
                Verified rules: {result.lastVerified}
              </span>
            </div>

            {optimizeErr && (
              <div class="badge badge-fail" style={{ width: 'fit-content' }}>{optimizeErr}</div>
            )}

            {optimizing && (
              <ListingLoadingCard compact marketplaceNames={[activeSkill.display_name]} />
            )}

            {/* Optimized Before -> After Comparison Box */}
            {optimized && (
              <div
                class="card"
                style={{
                  borderColor: 'var(--accent)',
                  background: 'var(--subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <strong>Optimized {activeSkill.display_name} Listing Ready</strong>
                  <span class="badge badge-pass mono">
                    {optimized.beforeScore} → {optimized.afterScore}/100
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem' }}>
                  <div class="muted" style={{ fontSize: '0.74rem', fontWeight: 600 }}>UPGRADED TITLE</div>
                  <div><strong>{optimized.listing.title}</strong></div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button type="button" class="btn btn-primary btn-sm" onClick={applyOptimized}>
                    Apply to Editor
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    onClick={() => {
                      const payload = createAutoFillPayload(optimized.listing);
                      window.postMessage({ type: 'LISTLIFT_SYNC_PAYLOAD', payload }, '*');
                      try { localStorage.setItem('listlift_autofill_latest', JSON.stringify(payload)); } catch {}
                      showToast('Synced upgraded listing to Auto-Fill Extension!');
                    }}
                  >
                    Send to Auto-Fill Agent
                  </button>
                </div>
              </div>
            )}

            {/* Exact Field-by-Field Algorithmic Rule Parameters */}
            {hasContent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div class="muted" style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                  ALGORITHM &amp; COMPLIANCE PARAMETERS ({result.fields.length} CHECKED)
                </div>
                {result.fields.map((f) => (
                  <div
                    key={f.field}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--subtle)',
                      border: '1px solid var(--border)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <span><strong>{f.label}</strong></span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span class="mono muted" style={{ fontSize: '0.78rem' }}>
                        {f.limit ? `${f.length}/${f.limit}` : `${f.length}`}
                      </span>
                      <span class={`badge badge-${f.status}`}>{f.status.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actionable Issues */}
            {hasContent && result.issues.length > 0 && (
              <details open>
                <summary style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700 }}>
                  What is holding this listing back ({result.issues.length} findings)
                </summary>
                <ul style={{ margin: '8px 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  {result.issues.map((issue, i) => (
                    <li key={i}>
                      <strong>{issue.field}:</strong> {issue.message} <em>({issue.suggestion})</em>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* Honest No-Rank-Guarantee Disclaimer */}
            <p class="muted" style={{ margin: '4px 0 0', fontSize: '0.78rem', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <strong>Transparency note:</strong> ListLift scores and optimizes your copy against verified marketplace formatting, keyword, byte-limit, and policy rules to maximize search readiness. No software can guarantee #1 rankings or viral sales, which also depend on pricing, reviews, stock availability, and sales velocity.
            </p>
          </div>
        </div>
      </div>

      {toast && <div class="ll-toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}
