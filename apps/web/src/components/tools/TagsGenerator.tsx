import { useState } from 'preact/hooks';
import { getAllMarketplaceSkills, type MarketplaceId } from '@listlift/skills';
import { generateTagsAndKeywords, utf8ByteLength, type TagsGenerateResult } from '@listlift/core';
import QuickPhotoBar, { type UploadedPhoto } from './QuickPhotoBar';
import ListingLoadingCard from './ListingLoadingCard';

const SKILLS = getAllMarketplaceSkills();

export default function TagsGenerator() {
  const [marketplace, setMarketplace] = useState<MarketplaceId>('etsy');
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [material, setMaterial] = useState('');
  const [seedsText, setSeedsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineUsed, setEngineUsed] = useState<string | null>(null);
  const [result, setResult] = useState<TagsGenerateResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const runGenerate = async (e: Event) => {
    e.preventDefault();
    const typed = productName.trim();
    if (!photo && typed.length < 2) {
      setError('Upload a product photo or enter a product name.');
      return;
    }
    setError(null);
    setLoading(true);
    const seedKeywords = seedsText.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTool: 'tags',
          productName: typed || 'Uploaded Product',
          category: category.trim() || 'General',
          material: material.trim(),
          keywords: seedKeywords,
          marketplaces: [marketplace],
          imageDataUrl: photo?.dataUrl,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        engine?: string;
        listings?: Array<{
          marketplace: string;
          marketplaceName: string;
          tags: string[];
          searchTerms: string;
        }>;
      };
      if (!res.ok || !data.listings?.[0]) throw new Error(data.error || 'Generation failed.');
      const item = data.listings[0];
      const skill = SKILLS.find((s) => s.marketplace === marketplace) ?? SKILLS[0]!;
      const countMax = skill.fields.tags?.count_max ?? 13;
      const eachMax = skill.fields.tags?.each_max ?? 20;
      setEngineUsed(data.engine || 'ListLift Vision Engine');
      setResult({
        marketplace: item.marketplace,
        marketplaceName: item.marketplaceName,
        countMax,
        eachMax,
        maxBytes: skill.fields.search_terms?.max_bytes,
        tags: item.tags.map((t) => ({
          tag: t,
          length: Array.from(t).length,
          bytes: utf8ByteLength(t),
          status: Array.from(t).length <= eachMax ? 'pass' : 'fail',
        })),
        backendSearchTerms: item.searchTerms,
        backendBytes: utf8ByteLength(item.searchTerms),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed.';
      if (photo && !typed) {
        setError(msg);
      } else {
        setEngineUsed('Offline Rule Engine');
        setResult(
          generateTagsAndKeywords({
            marketplace,
            productName: typed,
            category: category.trim(),
            material: material.trim(),
            audienceOrUseCase: '',
            seedKeywords,
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {}
  };

  return (
    <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <form onSubmit={runGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div class="chip-group">
          {SKILLS.map((s) => (
            <button key={s.marketplace} type="button" class="chip" aria-pressed={s.marketplace === marketplace} onClick={() => setMarketplace(s.marketplace)}>
              {s.display_name}
            </button>
          ))}
        </div>

        <QuickPhotoBar photo={photo} onChange={setPhoto} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div class="field">
            <label for="tag-name">Product name (optional if photo uploaded)</label>
            <input id="tag-name" class="input" value={productName} onInput={(e) => setProductName((e.target as HTMLInputElement).value)} placeholder="e.g. Gold Ribbed Heart Stud Earrings" />
          </div>
          <div class="field">
            <label for="tag-cat">Category (optional)</label>
            <input id="tag-cat" class="input" value={category} onInput={(e) => setCategory((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label for="tag-mat">Material (optional)</label>
            <input id="tag-mat" class="input" value={material} onInput={(e) => setMaterial((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label for="tag-seeds">Seed keywords (optional)</label>
            <input id="tag-seeds" class="input" value={seedsText} onInput={(e) => setSeedsText((e.target as HTMLInputElement).value)} />
          </div>
        </div>

        {error && <div class="badge badge-fail" style={{ width: 'fit-content' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'Generating…' : 'Generate Tags & Search Terms'}
          </button>
          {engineUsed && <span class="badge badge-pass">{engineUsed}</span>}
        </div>
      </form>

      {loading && (
        <ListingLoadingCard
          compact
          photoPreviewUrl={photo?.dataUrl ?? null}
          marketplaceNames={[SKILLS.find((s) => s.marketplace === marketplace)?.display_name ?? marketplace]}
        />
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} aria-live="polite">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span class="badge badge-pass">
              {result.tags.length} / {result.countMax} slots filled · each ≤ {result.eachMax} chars
            </span>
            <button type="button" class="btn btn-primary btn-sm" onClick={() => copy(result.tags.map((t) => t.tag).join(', '), 'tags')}>
              {copied === 'tags' ? 'Copied all tags!' : 'Copy comma-separated tags'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px' }}>
            {result.tags.map((t) => (
              <div key={t.tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'var(--subtle)', border: '1px solid var(--border)', fontSize: '0.86rem' }}>
                <span>{t.tag}</span>
                <span class="mono muted" style={{ fontSize: '0.74rem' }}>{t.length}/{result.eachMax}</span>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Deduplicated Backend Search Terms</strong>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span class="badge badge-neutral">{result.backendBytes} / {result.maxBytes ?? 250} UTF-8 bytes</span>
                <button type="button" class="btn btn-secondary btn-sm" onClick={() => copy(result.backendSearchTerms, 'backend')}>
                  {copied === 'backend' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <p class="mono" style={{ margin: 0, fontSize: '0.84rem', padding: '10px', borderRadius: '8px', background: 'var(--subtle)', border: '1px solid var(--border)' }}>
              {result.backendSearchTerms}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
