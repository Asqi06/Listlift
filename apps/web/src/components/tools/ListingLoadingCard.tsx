import { useEffect, useState } from 'preact/hooks';

interface Props {
  photoPreviewUrl?: string | null;
  marketplaceNames: string[];
  compact?: boolean;
}

const FUN_STAGES = [
  {
    title: 'Inspecting your product photo',
    subtitle: 'Reading shape, finish, texture & visual details straight from the image…',
  },
  {
    title: 'Benchmarking top-selling listings',
    subtitle: 'Checking how high-converting sellers phrase titles & buyer keywords…',
  },
  {
    title: 'Mapping marketplace-specific fields',
    subtitle: 'Tailoring exact portal fields, character caps & byte limits…',
  },
  {
    title: 'Running claim-safety audit',
    subtitle: 'Stripping risky buzzwords so marketplace bots never suppress your listing…',
  },
  {
    title: 'Polishing ready-to-publish copy',
    subtitle: 'Packing bullets, tags, SEO meta & 1-click auto-fill payload…',
  },
];

export default function ListingLoadingCard({ photoPreviewUrl, marketplaceNames, compact = false }: Props) {
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % FUN_STAGES.length);
    }, 2300);
    const secTimer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(stageTimer);
      clearInterval(secTimer);
    };
  }, []);

  const stage = FUN_STAGES[stageIdx] ?? FUN_STAGES[0]!;
  const progressPct = Math.min(94, 14 + stageIdx * 18 + Math.min(elapsedSec * 2, 16));

  return (
    <div
      class="card"
      role="status"
      aria-live="polite"
      style={{
        marginTop: '1rem',
        padding: compact ? '1rem 1.15rem' : '1.35rem 1.5rem',
        border: '1px solid var(--accent)',
        background: 'var(--bg-elevated)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes ll-scan-beam {
          0% { transform: translateY(-100%); opacity: 0.25; }
          50% { opacity: 0.85; }
          100% { transform: translateY(220%); opacity: 0.25; }
        }
        @keyframes ll-dot-bounce {
          0%, 80%, 100% { transform: scale(0.75); opacity: 0.4; }
          40% { transform: scale(1.15); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ll-scan-line, .ll-bounce-dot { animation: none !important; }
        }
      `}</style>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Animated Photo Scanner or Pulse Box */}
        <div
          style={{
            position: 'relative',
            width: compact ? '56px' : '74px',
            height: compact ? '56px' : '74px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-subtle)',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {photoPreviewUrl ? (
            <img
              src={photoPreviewUrl}
              alt="Scanning product"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M7 8h10M7 12h7M7 16h5" />
            </svg>
          )}
          <div
            class="ll-scan-line"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: '42%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(11, 122, 83, 0.42) 55%, rgba(11, 122, 83, 0.85) 100%)',
              animation: 'll-scan-beam 1.9s ease-in-out infinite',
            }}
          />
        </div>

        {/* Cycling Stage Text */}
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: compact ? '0.95rem' : '1.05rem', color: 'var(--text)' }}>
              {stage.title}
            </strong>
            <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }} aria-hidden="true">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  class="ll-bounce-dot"
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '999px',
                    background: 'var(--accent)',
                    animation: `ll-dot-bounce 1.2s ease-in-out ${d * 0.18}s infinite`,
                  }}
                />
              ))}
            </span>
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            {stage.subtitle}
          </p>
          {marketplaceNames.length > 0 && (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.55rem' }}>
              {marketplaceNames.map((m) => (
                <span key={m} class="pill" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                  {m}
                </span>
              ))}
              <span class="mono" style={{ fontSize: '0.72rem', color: 'var(--text-faint)', alignSelf: 'center', marginLeft: 'auto' }}>
                {elapsedSec}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Smooth Progress Track */}
      <div
        style={{
          marginTop: '0.85rem',
          height: '6px',
          borderRadius: '999px',
          background: 'var(--bg-subtle)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            borderRadius: '999px',
            background: 'var(--accent)',
            transition: 'width 650ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
    </div>
  );
}
