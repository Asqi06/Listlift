import { useEffect, useState } from 'preact/hooks';

interface Props {
  photoDataUrl?: string | null;
  marketplaceNames: string[];
}

const STAGES = [
  {
    label: 'Photo dekh rahe hain…',
    sub: 'Reading product shape, finish, color tone, and visual details directly from your image',
    tag: 'Visual inspection',
  },
  {
    label: 'Claims & policy check…',
    sub: 'Verifying factual grounding so unverified specs or risky buzzwords never trigger suppression',
    tag: 'Claim-safety audit',
  },
  {
    label: 'Title & portal fields bana rahe hain…',
    sub: 'Matching exact character caps, UTF-8 byte limits, and high-intent buyer search phrases',
    tag: 'Marketplace rules',
  },
  {
    label: 'Auto-fill payload & score ready kar rahe hain…',
    sub: 'Scoring every field against marketplace rules and syncing to your Chrome/Edge Extension',
    tag: 'Ready to lift',
  },
];

const POP_TAGS = [
  { label: 'Product Type', top: '14%', left: '8%' },
  { label: 'Color & Finish', top: '42%', right: '8%' },
  { label: 'Style & Texture', bottom: '18%', left: '10%' },
];

export default function PhotoScanSequence({ photoDataUrl, marketplaceNames }: Props) {
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t1 = setInterval(() => {
      setStageIdx((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 2200);
    const t2 = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  const stage = STAGES[stageIdx] ?? STAGES[0]!;
  const pct = Math.min(95, 18 + stageIdx * 22 + Math.min(elapsed * 2, 14));

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: '#0B0D12',
        color: '#F5F7FA',
        borderRadius: '18px',
        border: '1px solid rgba(184, 255, 59, 0.35)',
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        alignItems: 'center',
      }}
    >
      <style>{`
        @keyframes ll-photo-sweep {
          0% { transform: translateY(-20%); opacity: 0.35; }
          50% { opacity: 1; }
          100% { transform: translateY(340%); opacity: 0.35; }
        }
        @keyframes ll-tag-pop {
          0% { transform: translateY(6px) scale(0.92); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .ll-sweep-beam {
          animation: ll-photo-sweep 1.85s ease-in-out infinite;
        }
        .ll-pop-chip {
          animation: ll-tag-pop 380ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .ll-sweep-beam, .ll-pop-chip { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      {/* Left: Pinned Photo Canvas with Scan Sweep + Popping Attribute Tags */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '4 / 3',
          maxHeight: '240px',
          width: '100%',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.14)',
          background: '#131620',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {photoDataUrl ? (
          <img
            src={photoDataUrl}
            alt="Scanning product photo"
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#FAF8F3' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', color: '#9BA3B4' }}>
            <div class="mono" style={{ color: '#B8FF3B', fontSize: '0.78rem', marginBottom: '6px' }}>
              ANALYZING PRODUCT SPEC
            </div>
            <div style={{ fontSize: '0.88rem' }}>Mapping buyer keywords &amp; marketplace limits…</div>
          </div>
        )}

        {/* Electric Lime Sweep Beam */}
        <div
          class="ll-sweep-beam"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '26%',
            background:
              'linear-gradient(180deg, transparent 0%, rgba(184, 255, 59, 0.25) 65%, rgba(184, 255, 59, 0.92) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Detected Attribute Tags popping onto the photo */}
        {POP_TAGS.slice(0, Math.min(POP_TAGS.length, stageIdx + 1)).map((t) => (
          <span
            key={t.label}
            class="ll-pop-chip mono"
            style={{
              position: 'absolute',
              top: t.top,
              left: t.left,
              right: t.right,
              bottom: t.bottom,
              padding: '4px 9px',
              borderRadius: '999px',
              background: 'rgba(11, 13, 18, 0.86)',
              border: '1px solid #B8FF3B',
              color: '#B8FF3B',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            ✓ {t.label}
          </span>
        ))}
      </div>

      {/* Right: Live Stage Timeline & Building Copy Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span
            class="mono"
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#0B0D12',
              background: '#B8FF3B',
              padding: '3px 9px',
              borderRadius: '6px',
            }}
          >
            STAGE {stageIdx + 1} / {STAGES.length} · {stage.tag.toUpperCase()}
          </span>
          <span class="mono" style={{ fontSize: '0.76rem', color: '#9BA3B4' }}>
            {elapsed}s
          </span>
        </div>

        <h3 style={{ margin: 0, fontSize: '1.22rem', color: '#F5F7FA' }}>{stage.label}</h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#9BA3B4', lineHeight: 1.5 }}>{stage.sub}</p>

        {/* Progress Bar */}
        <div
          style={{
            height: '7px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: '999px',
              background: '#B8FF3B',
              transition: 'width 500ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>

        {/* Target Marketplaces */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {marketplaceNames.map((m) => (
            <span
              key={m}
              class="mono"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#D2D7E2',
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
