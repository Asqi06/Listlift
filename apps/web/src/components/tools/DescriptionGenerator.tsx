import { useState } from 'preact/hooks';
import { getAllMarketplaceSkills, type MarketplaceId } from '@listlift/skills';
import { generateDescriptionAndBullets, type DescriptionGenerateResult } from '@listlift/core';
import QuickPhotoBar, { type UploadedPhoto } from './QuickPhotoBar';
import ListingLoadingCard from './ListingLoadingCard';

const SKILLS = getAllMarketplaceSkills();

export default function DescriptionGenerator() {
  const [marketplace, setMarketplace] = useState<MarketplaceId>('amazon');
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [sizeOrQuantity, setSizeOrQuantity] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [tone, setTone] = useState<'neutral' | 'premium' | 'playful'>('neutral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineUsed, setEngineUsed] = useState<string | null>(null);
  const [result, setResult] = useState<DescriptionGenerateResult | null>(null);
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
    const keyFeatures = featuresText.split('\n').map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTool: 'description',
          productName: typed || 'Uploaded Product',
          brand: brand.trim(),
          material: material.trim(),
          sizeOrQuantity: sizeOrQuantity.trim(),
          hardFacts: keyFeatures,
          tone,
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
          shortDescription: string;
          longDescription: string;
          bullets: string[];
        }>;
      };
      if (!res.ok || !data.listings?.[0]) throw new Error(data.error || 'Generation failed.');
      const item = data.listings[0];
      setEngineUsed(data.engine || 'ListLift Vision Engine');
      setResult({
        marketplace: item.marketplace,
        marketplaceName: item.marketplaceName,
        shortDescription: item.shortDescription,
        longDescription: item.longDescription,
        bullets: item.bullets,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed.';
      if (photo && !typed) {
        setError(msg);
      } else {
        setEngineUsed('Offline Rule Engine');
        setResult(
          generateDescriptionAndBullets({
            marketplace,
            productName: typed,
            brand: brand.trim(),
            material: material.trim(),
            sizeOrQuantity: sizeOrQuantity.trim(),
            audienceOrUseCase: '',
            keyFeatures,
            tone,
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '20px', alignItems: 'start' }}>
      <form onSubmit={runGenerate} class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div class="chip-group">
          {SKILLS.map((s) => (
            <button key={s.marketplace} type="button" class="chip" aria-pressed={s.marketplace === marketplace} onClick={() => setMarketplace(s.marketplace)}>
              {s.display_name}
            </button>
          ))}
        </div>

        <QuickPhotoBar photo={photo} onChange={setPhoto} />

        <div class="field">
          <label for="dg-name">Product name (optional if photo uploaded)</label>
          <input id="dg-name" class="input" value={productName} onInput={(e) => setProductName((e.target as HTMLInputElement).value)} placeholder="e.g. Insulated Stainless Steel Water Bottle" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div class="field">
            <label for="dg-brand">Brand</label>
            <input id="dg-brand" class="input" value={brand} onInput={(e) => setBrand((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label for="dg-size">Size / Pack</label>
            <input id="dg-size" class="input" value={sizeOrQuantity} onInput={(e) => setSizeOrQuantity((e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <div class="field">
          <label for="dg-mat">Material / Spec</label>
          <input id="dg-mat" class="input" value={material} onInput={(e) => setMaterial((e.target as HTMLInputElement).value)} />
        </div>
        <div class="field">
          <label for="dg-feats">Key facts (optional, one per line)</label>
          <textarea id="dg-feats" class="textarea" rows={3} value={featuresText} onInput={(e) => setFeaturesText((e.target as HTMLTextAreaElement).value)} />
        </div>
        <div class="chip-group">
          {(['neutral', 'premium', 'playful'] as const).map((t) => (
            <button key={t} type="button" class="chip" aria-pressed={tone === t} onClick={() => setTone(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)} tone
            </button>
          ))}
        </div>

        {error && <div class="badge badge-fail" style={{ width: 'fit-content' }}>{error}</div>}
        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? 'Generating…' : 'Generate Description & Bullets'}
        </button>
      </form>

      <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-live="polite">
        {loading ? (
          <ListingLoadingCard
            compact
            photoPreviewUrl={photo?.dataUrl ?? null}
            marketplaceNames={[SKILLS.find((s) => s.marketplace === marketplace)?.display_name ?? marketplace]}
          />
        ) : !result ? (
          <p class="muted" style={{ margin: 0 }}>
            Upload a product photo or enter product details to generate marketplace-ready descriptions and bullet points.
          </p>
        ) : (
          <>
            {engineUsed && <span class="badge badge-pass" style={{ width: 'fit-content' }}>{engineUsed}</span>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Short Description</strong>
              <button type="button" class="btn btn-secondary btn-sm" onClick={() => copy(result.shortDescription, 'short')}>
                {copied === 'short' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ margin: 0 }}>{result.shortDescription}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <strong>Bullet Points ({result.bullets.length})</strong>
              <button type="button" class="btn btn-secondary btn-sm" onClick={() => copy(result.bullets.map((b) => `• ${b}`).join('\n'), 'bullets')}>
                {copied === 'bullets' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.92rem' }}>
              {result.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <strong>Full Description</strong>
              <button type="button" class="btn btn-secondary btn-sm" onClick={() => copy(result.longDescription, 'long')}>
                {copied === 'long' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{ margin: 0, padding: '12px', borderRadius: '10px', background: 'var(--subtle)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-ui)', fontSize: '0.88rem' }}>
              {result.longDescription}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
