import { useEffect, useRef, useState } from 'preact/hooks';
import { getAllMarketplaceSkills, type MarketplaceId } from '@listlift/skills';
import { createSampleProductPhoto, getGeoOrderedMarketIds, isIndiaGeo, trackEvent } from '../../lib/analytics';

const ALL_SKILLS = getAllMarketplaceSkills();

type DetectedMode = 'idle' | 'photo' | 'url' | 'text';

async function compressPhoto(file: File): Promise<{
  dataUrl: string;
  name: string;
  width: number;
  height: number;
  sizeKb: number;
}> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 512;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/webp', 0.82);
  const sizeKb = Math.max(1, Math.round((dataUrl.length * 0.75) / 1024));
  return { dataUrl, name: file.name, width, height, sizeKb };
}

export default function SmartCommandBar() {
  const [query, setQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketplaceId>('etsy');
  const [orderedMarkets, setOrderedMarkets] = useState<readonly MarketplaceId[]>(
    ALL_SKILLS.map((s) => s.marketplace),
  );
  const [geoLabel, setGeoLabel] = useState<string>('Global');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const order = getGeoOrderedMarketIds();
    setOrderedMarkets(order);
    const india = isIndiaGeo();
    setSelectedMarket(india ? 'flipkart' : 'etsy');
    setGeoLabel(india ? 'India' : 'Global');
    trackEvent('visit', { page: 'home', geo: india ? 'IN' : 'GLOBAL' });
  }, []);

  const trimmed = query.trim();
  const mode: DetectedMode = busyMsg
    ? 'photo'
    : /^https?:\/\//i.test(trimmed)
      ? 'url'
      : trimmed.length >= 2
        ? 'text'
        : 'idle';

  const modeMeta = {
    idle: {
      badge: 'Photo · URL · Product line',
      cta: 'Upload Photo',
      hint: 'Drop a product photo for Studio, paste a live URL to audit score, or type 1 line for titles.',
    },
    photo: {
      badge: 'Photo detected → Studio',
      cta: 'Opening Studio…',
      hint: 'Inspecting image locally and launching Listing Studio…',
    },
    url: {
      badge: 'Product URL detected → Listing Score',
      cta: 'Audit URL & Lift Score',
      hint: 'Fetches live product title & specs, scores against marketplace rules, and fixes weak fields.',
    },
    text: {
      badge: 'Product text detected → Studio',
      cta: 'Generate Listing',
      hint: 'Builds rule-checked title, bullets, tags, and seller portal fields with zero signup.',
    },
  }[mode];

  const handlePhotoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setBusyMsg('Compressing photo locally…');
    trackEvent('photo_drop', { source: 'hero_command_bar', market: selectedMarket });
    try {
      const packed = await compressPhoto(file);
      sessionStorage.setItem('ll_cmd_photo', JSON.stringify(packed));
      window.location.href = `/studio?m=${encodeURIComponent(selectedMarket)}&autostart=1`;
    } catch {
      setBusyMsg(null);
    }
  };

  const handleSamplePhoto = async () => {
    setBusyMsg('Loading sample earrings photo…');
    trackEvent('sample_click', { source: 'hero_command_bar', market: selectedMarket });
    try {
      const sample = await createSampleProductPhoto();
      sessionStorage.setItem('ll_cmd_photo', JSON.stringify(sample));
      window.location.href = `/studio?m=${encodeURIComponent(selectedMarket)}&sample=1&autostart=1`;
    } catch {
      setBusyMsg(null);
      window.location.href = `/studio?m=${encodeURIComponent(selectedMarket)}&sample=1`;
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (mode === 'idle') {
      fileRef.current?.click();
      return;
    }
    if (mode === 'url') {
      window.location.href = `/tools/listing-score?m=${encodeURIComponent(selectedMarket)}&url=${encodeURIComponent(trimmed)}`;
      return;
    }
    window.location.href = `/studio?m=${encodeURIComponent(selectedMarket)}&q=${encodeURIComponent(trimmed)}&autostart=1`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      <style>{`
        @keyframes ll-cmd-glow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(184, 255, 59, 0.28), 0 16px 40px -14px rgba(0, 0, 0, 0.65); }
          50% { box-shadow: 0 0 0 2px rgba(184, 255, 59, 0.52), 0 18px 46px -12px rgba(184, 255, 59, 0.14); }
        }
        .ll-cmd-bar {
          animation: ll-cmd-glow 4.2s ease-in-out infinite;
          transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms ease;
        }
        .ll-cmd-bar:focus-within {
          border-color: #B8FF3B !important;
          transform: translateY(-1px);
        }
        @media (prefers-reduced-motion: reduce) {
          .ll-cmd-bar { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* Unified Smart Command Bar */}
      <form
        onSubmit={handleSubmit}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer?.files?.[0];
          if (f) void handlePhotoFile(f);
        }}
        class="ll-cmd-bar"
        style={{
          background: isDragging ? '#182118' : '#131620',
          border: `1.5px solid ${isDragging ? '#B8FF3B' : 'rgba(255,255,255,0.16)'}`,
          borderRadius: '16px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Drop or select product photo"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: mode === 'url' ? 'rgba(245, 183, 49, 0.14)' : 'rgba(184, 255, 59, 0.12)',
              color: mode === 'url' ? '#F5B731' : '#B8FF3B',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {mode === 'url' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            ) : mode === 'text' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            )}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) void handlePhotoFile(f);
            }}
          />

          <input
            type="text"
            value={query}
            onFocus={() => trackEvent('command_bar_focus', { market: selectedMarket })}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (const item of items) {
                if (item.type.startsWith('image/')) {
                  const f = item.getAsFile();
                  if (f) {
                    e.preventDefault();
                    void handlePhotoFile(f);
                    return;
                  }
                }
              }
            }}
            placeholder={
              busyMsg ||
              'Drop a product photo, paste a store URL, or type 1 line (e.g. Gold heart stud earrings)...'
            }
            aria-label="Drop a product photo, paste a URL, or type a product name"
            style={{
              flex: '1 1 220px',
              minHeight: '44px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F5F7FA',
              fontSize: '0.98rem',
              fontFamily: 'var(--font-ui)',
            }}
          />

          <button
            type="submit"
            disabled={Boolean(busyMsg)}
            style={{
              minHeight: '44px',
              padding: '0 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#B8FF3B',
              color: '#0B0D12',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {modeMeta.cta}
          </button>
        </div>

        {/* Bottom meta row inside Command Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              class="mono"
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(184, 255, 59, 0.12)',
                color: '#B8FF3B',
              }}
            >
              {modeMeta.badge}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#9BA3B4' }}>{modeMeta.hint}</span>
          </div>

          <button
            type="button"
            onClick={() => void handleSamplePhoto()}
            disabled={Boolean(busyMsg)}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: '#F5F7FA',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try with sample photo
          </button>
        </div>
      </form>

      {/* Geo-Ordered Marketplace Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9BA3B4', letterSpacing: '0.04em' }}>
            PICK TARGET MARKETPLACE ({geoLabel.toUpperCase()} ORDER · 9 BUILT-IN)
          </span>
          <span class="mono" style={{ fontSize: '0.72rem', color: '#9BA3B4' }}>
            No signup · 3 free Studio runs / day
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }} role="group" aria-label="Target marketplace">
          {orderedMarkets.map((id) => {
            const skill = ALL_SKILLS.find((s) => s.marketplace === id);
            if (!skill) return null;
            const active = selectedMarket === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedMarket(id)}
                style={{
                  minHeight: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: active ? '1px solid #B8FF3B' : '1px solid rgba(255,255,255,0.14)',
                  background: active ? 'rgba(184, 255, 59, 0.14)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#B8FF3B' : '#D2D7E2',
                  fontSize: '0.82rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{skill.display_name}</span>
                <span class="mono" style={{ fontSize: '0.7rem', opacity: 0.72 }}>
                  ≤{skill.fields.title.max}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
