import { useState } from 'preact/hooks';

interface RiskMatch {
  phrase: string;
  reason: string;
  safeReplacement: string;
}

const CLAIM_RULES: Array<{ rx: RegExp; reason: string; replacement: string }> = [
  {
    rx: /\b(100%\s*guaranteed|guaranteed\s*#?1|money\s*back\s*guarantee)\b/gi,
    reason: 'Is claim se listing suppress ho sakti hai (unverified guarantee policy violation).',
    replacement: 'checked before dispatch',
  },
  {
    rx: /\b(best\s*seller|no\.?\s*1|number\s*one|world'?s\s*best|best\s*in\s*the\s*world)\b/gi,
    reason: 'Is claim se listing suppress ho sakti hai (unsubstantiated superlative banned on Amazon/Flipkart).',
    replacement: 'popular everyday choice',
  },
  {
    rx: /\b(miracle\s*cure|cures?|heals?|clinically\s*proven|fda\s*approved)\b/gi,
    reason: 'Is claim se listing suppress ho sakti hai (restricted medical/certification claim).',
    replacement: 'designed for everyday comfort',
  },
  {
    rx: /\b(free\s*shipping|lowest\s*price|cheapest|100%\s*free|limited\s*time\s*offer)\b/gi,
    reason: 'Is claim se listing suppress ho sakti hai (promotional text banned in catalog copy).',
    replacement: 'ready to ship',
  },
];

export function detectRiskyClaims(text: string): RiskMatch[] {
  const found: RiskMatch[] = [];
  const seen = new Set<string>();
  for (const rule of CLAIM_RULES) {
    const matches = text.match(rule.rx);
    if (!matches) continue;
    for (const m of matches) {
      const key = m.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({
        phrase: m,
        reason: rule.reason,
        safeReplacement: rule.replacement,
      });
    }
  }
  return found;
}

interface Props {
  text: string;
  onSafeRewrite?: (updatedText: string, fixedPhrase: string) => void;
  surface?: 'dark' | 'light';
}

export default function ClaimSafetyHighlighter({ text, onSafeRewrite, surface = 'light' }: Props) {
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const risks = detectRiskyClaims(text);

  if (risks.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '8px 12px',
          borderRadius: '10px',
          background: surface === 'dark' ? 'rgba(184, 255, 59, 0.1)' : 'var(--success-soft)',
          border: surface === 'dark' ? '1px solid rgba(184, 255, 59, 0.3)' : '1px solid var(--border)',
          fontSize: '0.82rem',
        }}
      >
        <span style={{ color: surface === 'dark' ? '#B8FF3B' : 'var(--primary-text)', fontWeight: 600 }}>
          ✓ Claim-Safety Audit Passed — 0 suppression-risk phrases detected
        </span>
      </div>
    );
  }

  const applyRewrite = (risk: RiskMatch) => {
    const escaped = risk.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const next = text.replace(new RegExp(escaped, 'gi'), risk.safeReplacement);
    setActivePhrase(null);
    onSafeRewrite?.(next, risk.phrase);
  };

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: '12px',
        background: surface === 'dark' ? 'rgba(255, 107, 107, 0.12)' : 'var(--danger-soft)',
        border: `1px solid ${surface === 'dark' ? '#FF6B6B' : '#C93636'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <strong style={{ fontSize: '0.84rem', color: surface === 'dark' ? '#FF8B8B' : '#991B1B' }}>
          ⚠ {risks.length} Claim-Safety Risk{risks.length > 1 ? 's' : ''} Flagged
        </strong>
        <span style={{ fontSize: '0.76rem', color: surface === 'dark' ? '#D2D7E2' : 'var(--muted)' }}>
          Click any underlined phrase for 1-click safe rewrite
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {risks.map((risk) => {
          const isOpen = activePhrase === risk.phrase;
          return (
            <div key={risk.phrase} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActivePhrase(isOpen ? null : risk.phrase)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '2px 4px',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: surface === 'dark' ? '#FF6B6B' : '#B91C1C',
                  textDecoration: 'underline wavy #FF6B6B',
                  textUnderlineOffset: '4px',
                  textAlign: 'left',
                }}
              >
                "{risk.phrase}"
              </button>
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: surface === 'dark' ? '#131620' : '#FFFFFF',
                  border: `1px solid ${surface === 'dark' ? 'rgba(255,107,107,0.4)' : 'var(--border-strong)'}`,
                  fontSize: '0.78rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxWidth: '340px',
                }}
              >
                <span style={{ color: surface === 'dark' ? '#F5F7FA' : 'var(--text)' }}>{risk.reason}</span>
                {onSafeRewrite && (
                  <button
                    type="button"
                    onClick={() => applyRewrite(risk)}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '5px 10px',
                      borderRadius: '7px',
                      border: 'none',
                      background: surface === 'dark' ? '#B8FF3B' : 'var(--primary)',
                      color: surface === 'dark' ? '#0B0D12' : '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    1-Click Safe Rewrite → "{risk.safeReplacement}"
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
