import { useState } from 'preact/hooks';
import ScoreRing from './ScoreRing';
import ClaimSafetyHighlighter from './ClaimSafetyHighlighter';

interface MarketDemo {
  id: string;
  name: string;
  limitLabel: string;
  title: string;
  tags: string[];
  score: number;
}

const MARKET_DEMOS: readonly MarketDemo[] = [
  {
    id: 'amazon',
    name: 'Amazon',
    limitLabel: '≤200 chars · 250B backend',
    title: 'Gold Ribbed Heart Stud Earrings for Women, Chunky Textured Statement Studs, Lightweight Everyday & Gift Jewelry',
    tags: ['gold heart stud earrings', 'chunky ribbed earrings', 'everyday gift for her'],
    score: 94,
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    limitLabel: '11 catalog fields · 5 keywords',
    title: 'Textured Gold-Tone Ribbed Heart Stud Earrings for Women & Girls (1 Pair, Lightweight Party & Daily Wear)',
    tags: ['gold heart studs', 'party wear earrings', 'ribbed stud earrings'],
    score: 92,
  },
  {
    id: 'etsy',
    name: 'Etsy',
    limitLabel: '≤140 chars · 13×20c tags',
    title: 'Chunky Gold Ribbed Heart Stud Earrings, Sculpted Statement Studs, Minimalist Gift for Her',
    tags: ['ribbed heart studs', 'chunky gold earrings', 'minimalist gift'],
    score: 96,
  },
  {
    id: 'custom',
    name: 'Custom Store',
    limitLabel: 'H1 ≤70c · SEO ≤60c',
    title: 'Gold Ribbed Heart Stud Earrings — Lightweight Sculpted Statement Studs',
    tags: ['gold heart earrings', 'statement studs', 'gifts under 30'],
    score: 93,
  },
];

export default function HeroScoreCard() {
  const [activeId, setActiveId] = useState('amazon');
  const [riskDemoText, setRiskDemoText] = useState(
    'Best seller gold heart earrings — 100% guaranteed to never fade.',
  );
  const [fixedCount, setFixedCount] = useState(0);

  const demo = MARKET_DEMOS.find((m) => m.id === activeId) ?? MARKET_DEMOS[0]!;
  const effectiveScore = Math.min(98, demo.score + fixedCount * 2);

  return (
    <div
      style={{
        background: '#131620',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '18px',
        padding: '18px',
        color: '#F5F7FA',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 24px 56px -18px rgba(0,0,0,0.65)',
      }}
    >
      {/* Top Row: Score Ring Lifting 42 -> 94 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ScoreRing score={effectiveScore} from={42} size={86} surface="dark" label="LIFT" />
          <div>
            <div class="mono" style={{ fontSize: '0.72rem', color: '#B8FF3B', fontWeight: 700 }}>
              42 → {effectiveScore} SCORE LIFT
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.02rem', marginTop: '2px' }}>
              {demo.name} Ready Pack
            </div>
            <div class="mono" style={{ fontSize: '0.72rem', color: '#9BA3B4', marginTop: '2px' }}>
              {demo.limitLabel}
            </div>
          </div>
        </div>

        {/* Mini Marketplace Switcher */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {MARKET_DEMOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              style={{
                padding: '5px 9px',
                borderRadius: '7px',
                border: m.id === activeId ? '1px solid #B8FF3B' : '1px solid rgba(255,255,255,0.12)',
                background: m.id === activeId ? 'rgba(184, 255, 59, 0.14)' : 'rgba(255,255,255,0.04)',
                color: m.id === activeId ? '#B8FF3B' : '#9BA3B4',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Marketplace-Native Preview Snippet */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '12px',
          background: '#0B0D12',
          border: '1px solid rgba(255,255,255,0.09)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span class="mono" style={{ fontSize: '0.7rem', color: '#9BA3B4' }}>
            OPTIMIZED {demo.name.toUpperCase()} TITLE
          </span>
          <span class="mono" style={{ fontSize: '0.7rem', color: '#B8FF3B' }}>
            {demo.title.length} chars · PASS
          </span>
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4, color: '#F5F7FA' }}>
          {demo.title}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {demo.tags.map((t) => (
            <span
              key={t}
              class="mono"
              style={{
                fontSize: '0.7rem',
                padding: '2px 7px',
                borderRadius: '5px',
                background: 'rgba(255,255,255,0.07)',
                color: '#D2D7E2',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Interactive Claim-Safety Demo right in Hero */}
      <ClaimSafetyHighlighter
        surface="dark"
        text={riskDemoText}
        onSafeRewrite={(updated) => {
          setRiskDemoText(updated);
          setFixedCount((c) => c + 1);
        }}
      />
    </div>
  );
}
