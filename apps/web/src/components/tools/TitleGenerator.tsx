import { useState } from 'preact/hooks';
import { getAllMarketplaceSkills, type MarketplaceId } from '@listlift/skills';
import { generateTitleOptions, type TitleGenerateResult } from '@listlift/core';
import QuickPhotoBar, { type UploadedPhoto } from './QuickPhotoBar';
import ListingLoadingCard from './ListingLoadingCard';

const SKILLS = getAllMarketplaceSkills();

interface Props {
  compact?: boolean;
}

export default function TitleGenerator({ compact = false }: Props) {
  const [marketplace, setMarketplace] = useState<MarketplaceId>('etsy');
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [sizeOrQuantity, setSizeOrQuantity] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineUsed, setEngineUsed] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [result, setResult] = useState<TitleGenerateResult | null>(null);

  const runGenerate = async (e?: Event) => {
    e?.preventDefault();
    const typed = productName.trim();
    if (!photo && typed.length < 2) {
      setError('Upload a product photo or enter a product name.');
      return;
    }

    setError(null);
    setLoading(true);
    const keywords = keywordsText.split(',').map((k) => k.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTool: 'title',
          productName: typed || 'Uploaded Product',
          brand: brand.trim(),
          material: material.trim(),
          sizeOrQuantity: sizeOrQuantity.trim(),
          keywords,
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
          lastVerified: string;
          title: string;
          alternateTitles: string[];
          score: { fields: Array<{ field: string; limit?: number }> };
        }>;
      };
      if (!res.ok || !data.listings?.[0]) {
        throw new Error(data.error || 'Title generation failed.');
      }

      const item = data.listings[0];
      const limit = item.score.fields.find((f) => f.field === 'title')?.limit ?? 140;
      const titles = [item.title, ...item.alternateTitles].filter(Boolean);
      setEngineUsed(data.engine || 'ListLift Vision Engine');
      setResult({
        marketplace: item.marketplace,
        marketplaceName: item.marketplaceName,
        lastVerified: item.lastVerified,
        limit,
        styleNotes: '',
        options: titles.map((t, i) => ({
          id: `ai-${i}`,
          angle: i === 0 ? 'Primary Recommended' : `Alternate Angle ${i}`,
          title: t,
          length: Array.from(t).length,
          limit,
          status: Array.from(t).length <= limit ? 'pass' : 'fail',
          matchedKeywords: keywords.filter((k) => t.toLowerCase().includes(k.toLowerCase())),
          keywordCoveragePercent:
            keywords.length === 0
              ? 100
              : Math.round(
                  (keywords.filter((k) => t.toLowerCase().includes(k.toLowerCase())).length /
                    keywords.length) *
                    100,
                ),
        })),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed.';
      if (photo && !typed) {
        setError(msg);
      } else {
        setEngineUsed('Offline Rule Engine');
        setResult(
          generateTitleOptions({
            marketplace,
            productName: typed,
            brand: brand.trim(),
            material: material.trim(),
            sizeOrQuantity: sizeOrQuantity.trim(),
            audienceOrUseCase: '',
            keywords,
            tone: 'neutral',
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const copyTitle = async (id: string, title: string) => {
    try {
      await navigator.clipboard.writeText(title);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {}
  };

  return (
    <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <form onSubmit={runGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div class="chip-group" role="group" aria-label="Target marketplace">
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

        <QuickPhotoBar photo={photo} onChange={setPhoto} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div class="field">
            <label for="tg-product">Product name (optional if photo uploaded)</label>
            <input
              id="tg-product"
              class="input"
              value={productName}
              onInput={(e) => setProductName((e.target as HTMLInputElement).value)}
              placeholder="e.g. Gold Ribbed Heart Stud Earrings"
            />
          </div>
          {!compact && (
            <>
              <div class="field">
                <label for="tg-brand">Brand (optional)</label>
                <input id="tg-brand" class="input" value={brand} onInput={(e) => setBrand((e.target as HTMLInputElement).value)} />
              </div>
              <div class="field">
                <label for="tg-material">Material / Spec (optional)</label>
                <input id="tg-material" class="input" value={material} onInput={(e) => setMaterial((e.target as HTMLInputElement).value)} />
              </div>
              <div class="field">
                <label for="tg-size">Size / Pack (optional)</label>
                <input id="tg-size" class="input" value={sizeOrQuantity} onInput={(e) => setSizeOrQuantity((e.target as HTMLInputElement).value)} />
              </div>
            </>
          )}
          <div class="field">
            <label for="tg-keywords">Target keywords (optional, comma-separated)</label>
            <input id="tg-keywords" class="input" value={keywordsText} onInput={(e) => setKeywordsText((e.target as HTMLInputElement).value)} />
          </div>
        </div>

        {error && <div class="badge badge-fail" style={{ width: 'fit-content' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'Generating…' : 'Generate Titles'}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} aria-live="polite">
          {result.options.slice(0, compact ? 3 : 5).map((opt) => (
            <div key={opt.id} class="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>{opt.angle}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span class={`badge badge-${opt.status}`}>{opt.length} / {opt.limit} chars</span>
                  <button type="button" class="btn btn-secondary btn-sm" onClick={() => copyTitle(opt.id, opt.title)}>
                    {copiedId === opt.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.98rem' }}>{opt.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
