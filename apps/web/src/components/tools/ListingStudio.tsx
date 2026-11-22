import { useEffect, useState } from 'preact/hooks';
import { getAllMarketplaceSkills, type MarketplaceId } from '@listlift/skills';
import {
  buildMarketplacePortalFields,
  buildMarketplaceUploadCsv,
  createAutoFillPayload,
  generateStudioListings,
  parseQuickProductInput,
  scoreListing,
  type LiveStudioGenerateResult,
  type SimilarProductInsight,
  type StudioGenerateResult,
} from '@listlift/core';
import QuickPhotoBar, { type UploadedPhoto } from './QuickPhotoBar';
import ScoreRing from '../lift/ScoreRing';
import PhotoScanSequence from '../lift/PhotoScanSequence';
import ClaimSafetyHighlighter from '../lift/ClaimSafetyHighlighter';
import LimitMeter from '../lift/LimitMeter';
import { createSampleProductPhoto, getGeoOrderedMarketIds, trackEvent } from '../../lib/analytics';

const SKILLS = getAllMarketplaceSkills();
const FREE_MAX_MARKETS = 2;

const CATEGORIES = [
  '',
  'Home & Living',
  'Candles & Fragrance',
  'Apparel & Ethnic Wear',
  'Kitchen & Dining',
  'Jewelry & Accessories',
  'Electronics & Accessories',
  'Beauty & Personal Care',
  'Handmade & Gifts',
];

export default function ListingStudio() {
  // 100% blank by default — zero prewritten specs, zero frontend API keys
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [quickInput, setQuickInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [material, setMaterial] = useState('');
  const [sizeOrQuantity, setSizeOrQuantity] = useState('');
  const [audienceOrUseCase, setAudienceOrUseCase] = useState('');
  const [hardFactsText, setHardFactsText] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [orderedSkills, setOrderedSkills] = useState(SKILLS);
  const [selectedMarkets, setSelectedMarkets] = useState<MarketplaceId[]>(['etsy', 'amazon']);
  const [language, setLanguage] = useState<'en' | 'hi' | 'es' | 'pt' | 'id'>('en');
  const [tone, setTone] = useState<'neutral' | 'premium' | 'playful'>('neutral');

  const [engineUsed, setEngineUsed] = useState<string>('');
  const [imageAnalysis, setImageAnalysis] = useState<string | null>(null);
  const [imageMismatch, setImageMismatch] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<SimilarProductInsight[]>([]);
  const [usageQuota, setUsageQuota] = useState<{ used: number; limit: number; remaining: number }>({
    used: 0,
    limit: 3,
    remaining: 3,
  });
  const [limitReached, setLimitReached] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<StudioGenerateResult | null>(null);
  const [activeMarket, setActiveMarket] = useState<string>('etsy');
  const [editableTitles, setEditableTitles] = useState<Record<string, string>>({});
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; productName: string; createdAt: string; markets: number }>>([]);
  const [autoStartPending, setAutoStartPending] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ll_studio_history');
      if (saved) setHistory(JSON.parse(saved));

      // Geo-order marketplace chips (India -> Flipkart/Meesho/Amazon first; Global -> Etsy/Amazon/eBay first)
      const geoIds = getGeoOrderedMarketIds();
      const sorted = geoIds
        .map((id) => SKILLS.find((s) => s.marketplace === id))
        .filter((s): s is (typeof SKILLS)[number] => Boolean(s));
      if (sorted.length > 0) setOrderedSkills(sorted);

      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m') as MarketplaceId | null;
      if (mParam && SKILLS.some((s) => s.marketplace === mParam)) {
        setSelectedMarkets([mParam]);
        setActiveMarket(mParam);
      } else if (sorted[0] && sorted[1]) {
        setSelectedMarkets([sorted[0].marketplace, sorted[1].marketplace]);
        setActiveMarket(sorted[0].marketplace);
      }

      const qParam = params.get('q');
      if (qParam && qParam.trim()) {
        applyQuickParse(qParam.trim());
      }

      // Pick up photo dropped in Hero Smart Command Bar
      const cmdPhotoRaw = sessionStorage.getItem('ll_cmd_photo');
      if (cmdPhotoRaw) {
        sessionStorage.removeItem('ll_cmd_photo');
        const parsedPhoto = JSON.parse(cmdPhotoRaw) as UploadedPhoto;
        if (parsedPhoto?.dataUrl) {
          setPhoto(parsedPhoto);
          if (params.get('autostart') === '1') {
            setAutoStartPending(true);
          }
        }
      } else if (params.get('sample') === '1') {
        void createSampleProductPhoto().then((sample) => {
          setPhoto(sample);
          setAutoStartPending(true);
        });
      } else if (qParam && params.get('autostart') === '1') {
        setAutoStartPending(true);
      }

      trackEvent('visit', { page: 'studio' });
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const applyQuickParse = (val: string) => {
    setQuickInput(val);
    if (!val.trim()) {
      setProductName('');
      setBrand('');
      setCategory('');
      setMaterial('');
      setSizeOrQuantity('');
      setAudienceOrUseCase('');
      setHardFactsText('');
      setKeywordsText('');
      return;
    }
    if (val.trim().startsWith('http')) {
      setUrlsText(val.trim());
      return;
    }
    const parsed = parseQuickProductInput(val);
    setProductName(parsed.productName);
    setCategory(parsed.category);
    setMaterial(parsed.material);
    setSizeOrQuantity(parsed.sizeOrQuantity);
    setAudienceOrUseCase(parsed.audienceOrUseCase);
    setKeywordsText(parsed.keywords.join(', '));
    setHardFactsText(parsed.hardFacts.join('\n'));
  };

  const toggleMarket = (id: MarketplaceId) => {
    setSelectedMarkets((prev) => {
      if (prev.includes(id)) return prev.length > 1 ? prev.filter((m) => m !== id) : prev;
      if (prev.length >= FREE_MAX_MARKETS) {
        showToast(`Free plan includes up to ${FREE_MAX_MARKETS} marketplaces per run — Upgrade to Pro for all 8 at once.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const executeGeneration = async (marketsOverride?: MarketplaceId[]) => {
    const targetMarkets = marketsOverride && marketsOverride.length > 0 ? marketsOverride : selectedMarkets;
    const typedText = (productName || quickInput).trim();
    if (!photo && typedText.length < 2) {
      setErrorMsg('Upload a product photo (recommended) or enter at least 1 line describing your product.');
      return;
    }

    setErrorMsg(null);
    setLimitReached(false);
    setShareUrl(null);
    setImageAnalysis(null);
    setImageMismatch(null);
    setSimilarProducts([]);
    setIsGenerating(true);

    const reqPayload = {
      productName: typedText || 'Uploaded Product',
      brand: brand.trim(),
      category: category || 'General',
      material: material.trim(),
      sizeOrQuantity: sizeOrQuantity.trim(),
      audienceOrUseCase: audienceOrUseCase.trim(),
      hardFacts: hardFactsText.split('\n').map((s) => s.trim()).filter(Boolean),
      keywords: keywordsText.split(',').map((s) => s.trim()).filter(Boolean),
      competitorUrls: urlsText.split('\n').map((s) => s.trim()).filter((s) => s.startsWith('http')),
      imageNotes: photo ? `${photo.width}x${photo.height} WebP` : '',
      marketplaces: targetMarkets,
      language,
      tone,
      imageDataUrl: photo?.dataUrl,
    };

    try {
      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload),
      });
      const data = (await res.json()) as LiveStudioGenerateResult & {
        error?: string;
        limitReached?: boolean;
        usage?: { used: number; limit: number; remaining: number };
      };

      if (res.status === 429 || data.limitReached) {
        setIsGenerating(false);
        setLimitReached(true);
        setUsageQuota({ used: data.usage?.used ?? 3, limit: data.usage?.limit ?? 3, remaining: 0 });
        setErrorMsg(data.error || 'Daily free limit reached. Upgrade to Pro for unlimited listings.');
        trackEvent('limit_hit', { tool: 'studio' });
        trackEvent('paywall_view', { trigger: 'limit_hit' });
        return;
      }

      if (!res.ok || !data.listings) {
        throw new Error(data.error || 'Our listing engine is temporarily busy. Please try again in a moment.');
      }

      setResult(data);
      setEngineUsed(data.engine || 'ListLift Vision Engine');
      setImageAnalysis(data.imageAnalysis ?? null);
      setImageMismatch(data.imageTextMismatch ?? null);
      setSimilarProducts(data.similarProducts ?? []);
      if (data.usage) setUsageQuota(data.usage);
      const first = data.listings[0];
      setActiveMarket(first?.marketplace ?? 'etsy');
      setEditableTitles({});
      setIsGenerating(false);
      trackEvent('result_view', {
        markets: data.listings.length,
        primaryMarket: first?.marketplace,
        score: first?.score.score,
      });

      // Auto-sync to Chrome Extension + localStorage immediately
      if (first) {
        const autoPayload = createAutoFillPayload(first);
        try { localStorage.setItem('listlift_autofill_latest', JSON.stringify(autoPayload)); } catch {}
        window.postMessage({ type: 'LISTLIFT_SYNC_PAYLOAD', payload: autoPayload }, '*');
      }

      try {
        const entry = {
          id: data.id,
          productName: first?.title.slice(0, 48) || data.productName,
          createdAt: data.createdAt,
          markets: data.listings.length,
        };
        const next = [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, 8);
        setHistory(next);
        localStorage.setItem('ll_studio_history', JSON.stringify(next));
      } catch {}

      showToast(`Generated ${data.listings.length} listing(s) & synced to Auto-Fill Agent`);
    } catch (err) {
      setIsGenerating(false);
      const msg = err instanceof Error ? err.message : 'Our listing engine is temporarily busy. Please retry.';
      if (photo && !typedText) {
        setResult(null);
        setErrorMsg(msg);
      } else {
        setErrorMsg(msg);
        const fallback = generateStudioListings(reqPayload);
        setResult(fallback);
        setEngineUsed('ListLift Rules Engine');
        setActiveMarket(fallback.listings[0]?.marketplace ?? 'etsy');
      }
    }
  };

  const runPipeline = async (e: Event) => {
    e.preventDefault();
    await executeGeneration();
  };

  useEffect(() => {
    if (autoStartPending && (photo || quickInput.trim().length >= 2) && !isGenerating) {
      setAutoStartPending(false);
      void executeGeneration();
    }
  }, [autoStartPending, photo, quickInput]);

  const copyText = async (text: string, label: string) => {
    trackEvent('copy', { label, market: activeMarket });
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${label}`);
    } catch {
      showToast('Clipboard unavailable');
    }
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    trackEvent('csv_click', { filename, market: activeMarket });
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  };

  const createShareLink = async () => {
    if (!result) return;
    trackEvent('share', { market: activeMarket });
    try {
      const encoded = btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify({
              id: result.id,
              productName: result.productName,
              expiry: '7d',
              listing: result.listings.find((l) => l.marketplace === activeMarket) ?? result.listings[0],
            }),
          ),
        ),
      );
      const url = `${window.location.origin}/l/#${encoded}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      showToast('Read-only share link copied (expires 7d)');
    } catch {
      showToast('Share link ready below');
    }
  };

  const activeListing =
    result?.listings.find((l) => l.marketplace === activeMarket) ?? result?.listings[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <form onSubmit={runPipeline} class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Upload a product photo — or type 1 line</h2>
          <span class="muted" style={{ fontSize: '0.82rem' }}>
            Photo-first inspection · Claim-safe &amp; marketplace-verified
          </span>
        </div>

        {/* #1 Primary Input: Product Photo */}
        <QuickPhotoBar
          photo={photo}
          onChange={setPhoto}
          label="Drop or upload a product photo (primary — AI inspects the image directly, filename is ignored)"
        />

        {/* #2 Fallback / Optional Context Line */}
        <div class="field">
          <label for="st-quick">Optional text fallback or extra note (leave blank for pure photo inspection)</label>
          <input
            id="st-quick"
            class="input"
            value={quickInput}
            onInput={(e) => applyQuickParse((e.target as HTMLInputElement).value)}
            placeholder="e.g. Handloom pure cotton kurta blue size M pack of 1 for office..."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span class="muted" style={{ fontSize: '0.8rem' }}>
              {category || material || sizeOrQuantity
                ? <>Detected: <strong>{category || 'General'}</strong>{material ? ` · ${material}` : ''}{sizeOrQuantity ? ` · ${sizeOrQuantity}` : ''}</>
                : 'Starts 100% blank so AI never hallucinates specs.'}
            </span>
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setShowAdvanced((s) => !s)}>
              {showAdvanced ? 'Hide detailed fields' : 'Fine-tune facts & specs'}
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
              <div class="field">
                <label for="st-name">Product name</label>
                <input id="st-name" class="input" value={productName} onInput={(e) => setProductName((e.target as HTMLInputElement).value)} />
              </div>
              <div class="field">
                <label for="st-brand">Brand</label>
                <input id="st-brand" class="input" value={brand} onInput={(e) => setBrand((e.target as HTMLInputElement).value)} />
              </div>
              <div class="field">
                <label for="st-cat">Category</label>
                <select id="st-cat" class="select" value={category} onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'Auto-detect'}</option>)}
                </select>
              </div>
              <div class="field">
                <label for="st-mat">Material / Spec</label>
                <input id="st-mat" class="input" value={material} onInput={(e) => setMaterial((e.target as HTMLInputElement).value)} />
              </div>
              <div class="field">
                <label for="st-size">Size / Pack Count</label>
                <input id="st-size" class="input" value={sizeOrQuantity} onInput={(e) => setSizeOrQuantity((e.target as HTMLInputElement).value)} />
              </div>
              <div class="field">
                <label for="st-use">Audience / Use Case</label>
                <input id="st-use" class="input" value={audienceOrUseCase} onInput={(e) => setAudienceOrUseCase((e.target as HTMLInputElement).value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              <div class="field">
                <label for="st-facts">Hard facts to lock (one per line)</label>
                <textarea id="st-facts" class="textarea" rows={3} value={hardFactsText} onInput={(e) => setHardFactsText((e.target as HTMLTextAreaElement).value)} />
              </div>
              <div class="field">
                <label for="st-kw">Seed keywords (comma-separated)</label>
                <input id="st-kw" class="input" value={keywordsText} onInput={(e) => setKeywordsText((e.target as HTMLInputElement).value)} />
                <label for="st-lang" style={{ marginTop: '8px' }}>Output language</label>
                <select id="st-lang" class="select" value={language} onChange={(e) => setLanguage((e.target as HTMLSelectElement).value as 'en' | 'hi' | 'es' | 'pt' | 'id')}>
                  <option value="en">English (Global)</option>
                  <option value="hi">Hindi / India English</option>
                  <option value="es">Spanish</option>
                  <option value="pt">Portuguese</option>
                  <option value="id">Indonesian</option>
                </select>
              </div>
            </div>

            <div class="chip-group">
              {(['neutral', 'premium', 'playful'] as const).map((t) => (
                <button key={t} type="button" class="chip" aria-pressed={tone === t} onClick={() => setTone(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)} tone
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <span class="muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              TARGET MARKETPLACES ({selectedMarkets.length}/{FREE_MAX_MARKETS} FREE)
            </span>
            <a href="/pricing" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
              Unlock all 8 at once with Pro →
            </a>
          </div>
          <div class="chip-group" role="group" aria-label="Target marketplaces">
            {orderedSkills.map((s) => (
              <button key={s.marketplace} type="button" class="chip" aria-pressed={selectedMarkets.includes(s.marketplace)} onClick={() => toggleMarket(s.marketplace)}>
                {s.display_name}
              </button>
            ))}
          </div>
        </div>

        {limitReached ? (
          <LimitMeter used={usageQuota.limit} limit={usageQuota.limit} />
        ) : errorMsg ? (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '0.86rem', fontWeight: 500 }}>
            {errorMsg}
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <button type="submit" class="btn btn-primary" disabled={isGenerating || limitReached}>
              {isGenerating
                ? 'Scanning photo & building listing…'
                : `Generate ${selectedMarkets.length} Marketplace Listing${selectedMarkets.length > 1 ? 's' : ''}`}
            </button>
            {!photo && (
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                disabled={isGenerating}
                onClick={() => {
                  trackEvent('sample_click', { source: 'studio' });
                  void createSampleProductPhoto().then((s) => {
                    setPhoto(s);
                    setAutoStartPending(true);
                  });
                }}
              >
                Try sample photo
              </button>
            )}
          </div>
          <LimitMeter used={usageQuota.used} limit={usageQuota.limit} />
        </div>
      </form>

      {isGenerating && (
        <PhotoScanSequence
          photoDataUrl={photo?.dataUrl ?? null}
          marketplaceNames={selectedMarkets.map((id) => SKILLS.find((s) => s.marketplace === id)?.display_name ?? id)}
        />
      )}

      {result && activeListing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} aria-live="polite">
          {imageMismatch && (
            <div class="card" style={{ background: 'var(--warning-soft)', borderColor: 'var(--warning)', color: 'var(--warning)', fontSize: '0.9rem' }}>
              <strong>Image vs. Text Mismatch Detected:</strong> {imageMismatch}
            </div>
          )}

          {imageAnalysis && (
            <div class="card" style={{ background: 'var(--subtle)', fontSize: '0.88rem' }}>
              <strong>Visual Inspection (from your photo):</strong>{' '}
              <span class="muted">{imageAnalysis}</span>
            </div>
          )}

          <div class="card-elevated" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <span class="badge badge-pass">
                  {engineUsed || 'ListLift Vision Engine'}
                </span>
                <span class="muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  Rules verified {activeListing.lastVerified}
                </span>
              </div>
              <div class="chip-group">
                {result.listings.map((item) => (
                  <button
                    key={item.marketplace}
                    type="button"
                    class="chip"
                    aria-pressed={item.marketplace === activeListing.marketplace}
                    onClick={() => setActiveMarket(item.marketplace)}
                  >
                    <span>{item.marketplaceName}</span>
                    <span class="mono" style={{ fontSize: '0.75rem', opacity: 0.85 }}>{item.score.score}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {photo?.dataUrl && (
                <img
                  src={photo.dataUrl}
                  alt="Product thumbnail"
                  style={{ width: '58px', height: '58px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border)' }}
                />
              )}
              <ScoreRing
                score={
                  scoreListing({
                    marketplace: activeListing.marketplace as MarketplaceId,
                    title: editableTitles[activeListing.marketplace] ?? activeListing.title,
                    description: activeListing.longDescription,
                    bullets: activeListing.bullets,
                    tags: activeListing.tags,
                    search_terms: activeListing.searchTerms,
                    seo_title: activeListing.seoMeta.seoTitle,
                    meta_description: activeListing.seoMeta.metaDescription,
                    target_keywords: [],
                  }).score
                }
                from={42}
                size={84}
                label="LIFT"
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Grade {activeListing.score.grade}</div>
                <div class="muted" style={{ fontSize: '0.82rem' }}>SKU: <span class="mono">{activeListing.sku}</span></div>
                {/* 1-Click Quick Convert to another marketplace */}
                {!limitReached && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {(['flipkart', 'meesho', 'amazon', 'etsy', 'custom'] as MarketplaceId[])
                      .filter((id) => !result.listings.some((l) => l.marketplace === id))
                      .slice(0, 2)
                      .map((id) => {
                        const sk = SKILLS.find((s) => s.marketplace === id);
                        if (!sk) return null;
                        return (
                          <button
                            key={id}
                            type="button"
                            class="btn btn-ghost btn-sm"
                            style={{ padding: '2px 8px', height: 'auto', fontSize: '0.73rem' }}
                            onClick={() => {
                              setSelectedMarkets([id]);
                              void executeGeneration([id]);
                            }}
                          >
                            Convert to {sk.display_name} →
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Primary Editable Title + Live Claim-Safety Highlighter */}
          <div class="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <strong>Title ({activeListing.marketplaceName})</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span class="badge badge-pass">
                  {(editableTitles[activeListing.marketplace] ?? activeListing.title).length} chars
                </span>
                <button type="button" class="btn btn-secondary btn-sm" onClick={() => copyText(editableTitles[activeListing.marketplace] ?? activeListing.title, 'Title')}>
                  Copy
                </button>
              </div>
            </div>
            <input
              class="input"
              aria-label="Editable product title"
              value={editableTitles[activeListing.marketplace] ?? activeListing.title}
              onInput={(e) => setEditableTitles((prev) => ({ ...prev, [activeListing.marketplace]: (e.target as HTMLInputElement).value }))}
            />
            <ClaimSafetyHighlighter
              text={`${editableTitles[activeListing.marketplace] ?? activeListing.title} ${activeListing.shortDescription}`}
              onSafeRewrite={(updated) => {
                const nextTitle = updated.slice(0, (editableTitles[activeListing.marketplace] ?? activeListing.title).length + 24);
                setEditableTitles((prev) => ({ ...prev, [activeListing.marketplace]: nextTitle.trim() }));
                showToast('Rewrote risky claim safely');
              }}
            />
            {activeListing.alternateTitles.length > 0 && (
              <details style={{ marginTop: '2px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Alternate title angles ({activeListing.alternateTitles.length}) — click to expand &amp; swap
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {activeListing.alternateTitles.map((alt) => (
                    <button
                      key={alt}
                      type="button"
                      class="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '8px 10px' }}
                      onClick={() => setEditableTitles((prev) => ({ ...prev, [activeListing.marketplace]: alt }))}
                    >
                      {alt}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Compact Openable Accordion Stack — Zero Clutter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 1. Marketplace-Specific Seller Portal Fields (Open by default) */}
            {(() => {
              const portalFields = buildMarketplacePortalFields(
                { ...activeListing, title: editableTitles[activeListing.marketplace] ?? activeListing.title },
                { imageAnalysis },
              );
              return (
                <details class="card" open style={{ padding: '14px 16px' }}>
                  <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.96rem', listStyle: 'none' }}>
                    <span>{activeListing.marketplaceName} Seller-Portal Fields ({portalFields.length} tailored fields)</span>
                    <span class="badge badge-pass" style={{ fontSize: '0.72rem' }}>Ready to paste / auto-fill</span>
                  </summary>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginTop: '14px' }}>
                    {portalFields.map((f) => (
                      <div
                        key={f.key}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          background: 'var(--subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                            {f.label}
                            {f.required && <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>*</span>}
                          </span>
                          <button type="button" class="btn btn-ghost btn-sm" style={{ padding: '2px 8px', height: 'auto', fontSize: '0.74rem' }} onClick={() => copyText(f.value, f.label)}>
                            Copy
                          </button>
                        </div>
                        <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)' }}>
                          {f.value}
                        </div>
                        {f.hint && <span class="muted" style={{ fontSize: '0.73rem' }}>{f.hint}</span>}
                      </div>
                    ))}
                  </div>
                </details>
              );
            })()}

            {/* 2. Similar Products Analyzed & Benchmark Sources */}
            <details class="card" style={{ padding: '14px 16px' }}>
              <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.96rem', listStyle: 'none' }}>
                <span>Similar Products Analyzed &amp; Market Benchmark ({similarProducts.length || result.evidence.sources.length})</span>
                <span class="muted" style={{ fontSize: '0.78rem' }}>
                  {result.evidence.priceBand
                    ? `Est. band: ${result.evidence.priceBand.currency} ${result.evidence.priceBand.min}–${result.evidence.priceBand.max}`
                    : 'Click to open'}
                </span>
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <p class="muted" style={{ margin: 0, fontSize: '0.84rem' }}>
                  Based on what we detected in your product, these comparable listings shaped your title structure, buyer keywords, and positioning:
                </p>
                {similarProducts.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                    {similarProducts.map((sp) => (
                      <div key={sp.title} style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '0.85rem', lineHeight: 1.35 }}>{sp.title}</strong>
                          {sp.price && <span class="badge badge-neutral mono" style={{ flexShrink: 0 }}>{sp.price}</span>}
                        </div>
                        <span class="muted" style={{ fontSize: '0.74rem', textTransform: 'capitalize' }}>{sp.marketplace}</span>
                        {sp.takeaways.length > 0 && (
                          <ul style={{ margin: '2px 0 0', paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {sp.takeaways.map((t) => <li key={t}>{t}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.evidence.sources.map((s) => (
                      <li key={s.label}><strong>{s.title}</strong> {s.price ? `(${s.currency} ${s.price})` : ''}</li>
                    ))}
                  </ul>
                )}
                {result.evidence.keywordGaps.length > 0 && (
                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    <div class="muted" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>HIGH-INTENT KEYWORDS EXTRACTED</div>
                    <div class="chip-group">
                      {result.evidence.keywordGaps.map((kw) => <span key={kw} class="badge badge-neutral">{kw}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </details>

            {/* 3. Key Bullets / Highlights */}
            <details class="card" style={{ padding: '14px 16px' }}>
              <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.96rem', listStyle: 'none' }}>
                <span>Key Bullets / Highlights ({activeListing.bullets.length})</span>
                <span class="muted" style={{ fontSize: '0.78rem' }}>Click to expand</span>
              </summary>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" class="btn btn-secondary btn-sm" onClick={() => copyText(activeListing.bullets.map((b) => `• ${b}`).join('\n'), 'Bullets')}>
                    Copy bullets
                  </button>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                  {activeListing.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            </details>

            {/* 4. Tags & Backend Search Terms */}
            <details class="card" style={{ padding: '14px 16px' }}>
              <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.96rem', listStyle: 'none' }}>
                <span>Tags &amp; Backend Search Terms ({activeListing.tags.length} tags)</span>
                <span class="muted" style={{ fontSize: '0.78rem' }}>Click to expand</span>
              </summary>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" class="btn btn-secondary btn-sm" onClick={() => copyText(activeListing.tags.join(', '), 'Tags')}>
                    Copy tags
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" onClick={() => copyText(activeListing.searchTerms, 'Search Terms')}>
                    Copy backend terms
                  </button>
                </div>
                <div class="chip-group">
                  {activeListing.tags.map((t) => <span key={t} class="badge badge-neutral">{t}</span>)}
                </div>
                <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <div class="muted" style={{ fontSize: '0.76rem', fontWeight: 600 }}>BACKEND SEARCH TERMS</div>
                  <p class="mono" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>{activeListing.searchTerms}</p>
                </div>
              </div>
            </details>

            {/* 5. Short Hook & Long Description */}
            <details class="card" style={{ padding: '14px 16px' }}>
              <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.96rem', listStyle: 'none' }}>
                <span>Short Hook &amp; Full Description</span>
                <span class="muted" style={{ fontSize: '0.78rem' }}>Click to expand</span>
              </summary>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" class="btn btn-secondary btn-sm" onClick={() => copyText(activeListing.longDescription, 'Description')}>
                    Copy description
                  </button>
                </div>
                <p style={{ margin: 0, fontWeight: 500 }}>{activeListing.shortDescription}</p>
                <pre style={{ margin: 0, padding: '12px', borderRadius: '10px', background: 'var(--subtle)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-ui)', fontSize: '0.9rem' }}>
                  {activeListing.longDescription}
                </pre>
              </div>
            </details>

            {/* 6. Attributes & SEO Meta */}
            <details class="card" style={{ padding: '14px 16px' }}>
              <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.96rem', listStyle: 'none' }}>
                <span>Attributes, SEO Meta &amp; Image Alt-Text</span>
                <span class="muted" style={{ fontSize: '0.78rem' }}>Click to expand</span>
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '12px' }}>
                <div class="table-wrap">
                  <table class="table">
                    <thead>
                      <tr><th>Attribute</th><th>Value</th></tr>
                    </thead>
                    <tbody>
                      {activeListing.attributes.map((a) => (
                        <tr key={a.key}><td>{a.key}</td><td>{a.value}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <div>
                    <div class="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>SEO TITLE (≤60)</div>
                    <div>{activeListing.seoMeta.seoTitle}</div>
                  </div>
                  <div>
                    <div class="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>META DESCRIPTION (≤160)</div>
                    <div>{activeListing.seoMeta.metaDescription}</div>
                  </div>
                  <div>
                    <div class="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>ALT-TEXT SUGGESTIONS</div>
                    <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                      {activeListing.altTextSuggestions.map((a) => <li key={a}>{a}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div class="studio-action-bar">
            <div style={{ fontSize: '0.84rem' }}>
              <strong>{activeListing.marketplaceName}</strong> · Ready to auto-fill or export
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                onClick={() => {
                  const payload = createAutoFillPayload({
                    ...activeListing,
                    title: editableTitles[activeListing.marketplace] ?? activeListing.title,
                  });
                  window.postMessage({ type: 'LISTLIFT_SYNC_PAYLOAD', payload }, '*');
                  try { localStorage.setItem('listlift_autofill_latest', JSON.stringify(payload)); } catch {}
                  showToast(`Synced to Auto-Fill Agent! Open ${activeListing.marketplaceName} & click the ListLift extension.`);
                }}
              >
                Send to Auto-Fill Agent
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                onClick={() => {
                  const upload = buildMarketplaceUploadCsv({
                    ...activeListing,
                    title: editableTitles[activeListing.marketplace] ?? activeListing.title,
                  });
                  downloadFile(upload.content, upload.filename, upload.mime);
                }}
              >
                Official Upload CSV
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onClick={() => copyText(activeListing.formattedCopyAll, `all ${activeListing.marketplaceName} fields`)}>
                Copy all
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onClick={createShareLink}>
                Share link
              </button>
              <a href="/autofill" class="btn btn-ghost btn-sm" style={{ color: '#FFFFFF' }}>
                Get Extension
              </a>
            </div>
          </div>

          {shareUrl && (
            <div class="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.86rem' }}>
                <strong>Read-only share link:</strong>{' '}
                <a href={shareUrl} target="_blank" rel="noopener">{shareUrl.slice(0, 64)}…</a>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" onClick={() => copyText(shareUrl, 'Share URL')}>
                Copy link
              </button>
            </div>
          )}

          {/* Mobile-to-Desktop Extension Handoff + WhatsApp Share */}
          <div class="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'var(--subtle)' }}>
            <div style={{ fontSize: '0.84rem' }}>
              <strong>On phone (Meesho / Flipkart / Shopify)?</strong>{' '}
              <span class="muted">Send this listing to WhatsApp or desktop Chrome for 1-click Auto-Fill.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `ListLift ${activeListing.marketplaceName} Listing (Score ${activeListing.score.score}/100):\n\n${editableTitles[activeListing.marketplace] ?? activeListing.title}\n\nBullets:\n${activeListing.bullets.map((b) => `• ${b}`).join('\n')}\n\nCreate yours free: https://listlift.com/studio`,
                )}`}
                target="_blank"
                rel="noopener"
                class="btn btn-secondary btn-sm"
                onClick={() => trackEvent('share', { channel: 'whatsapp', market: activeListing.marketplace })}
              >
                Share on WhatsApp
              </a>
              <button type="button" class="btn btn-ghost btn-sm" onClick={createShareLink}>
                Copy Desktop Link
              </button>
            </div>
          </div>

          <p class="muted" style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.5 }}>
            <strong>Transparency note:</strong> ListLift optimizes your listing to match verified marketplace rules, buyer search terms, and claim-safety guidelines. Ranking and sales performance also depend on pricing, reviews, stock, and buyer demand, so no tool can guarantee #1 placement.
          </p>

          <div class="card" style={{ background: 'var(--subtle)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <strong style={{ fontSize: '0.96rem' }}>Need to run 50–500 SKUs at once?</strong>
              <p class="muted" style={{ margin: '4px 0 0', fontSize: '0.86rem' }}>
                Upgrade to Pro ($7.50/mo billed annually) for Bulk CSV, Brand Voice profiles, and unlimited 1-click Auto-Fill — or Business for 3 team seats &amp; API.
              </p>
            </div>
            <a href="/pricing" class="btn btn-primary btn-sm">Compare Pro &amp; Business</a>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div class="card">
          <strong style={{ fontSize: '0.95rem' }}>Recent Studio Runs</strong>
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((h) => (
              <li key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'var(--subtle)', fontSize: '0.86rem' }}>
                <span><strong>{h.productName}</strong> · {h.markets} marketplaces</span>
                <span class="muted mono">{new Date(h.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && <div class="ll-toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}
