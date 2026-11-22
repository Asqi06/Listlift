import { trackEvent } from '../../lib/analytics';

interface Props {
  used: number;
  limit: number;
  label?: string;
}

export default function LimitMeter({ used, limit, label = 'free Studio runs' }: Props) {
  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, Math.round((remaining / Math.max(1, limit)) * 100));
  const isEmpty = remaining === 0;

  if (isEmpty) {
    return (
      <div
        class="card"
        style={{
          borderColor: 'var(--primary)',
          background: 'var(--subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 14px',
        }}
      >
        <div style={{ fontSize: '0.86rem' }}>
          <strong>Aaj ke free runs ho gaye (0/{limit} left)</strong> · Resets at 00:00 UTC. You can still copy your generated listing below, or unlock unlimited runs with Pro ($7.50/mo).
        </div>
        <a
          href="/pricing"
          class="btn btn-primary btn-sm"
          onClick={() => trackEvent('upgrade_click', { source: 'limit_meter_soft_paywall' })}
        >
          Upgrade to Pro
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 12px',
        borderRadius: '999px',
        border: '1px solid var(--border-strong)',
        background: 'var(--subtle)',
        fontSize: '0.78rem',
      }}
    >
      <span class="mono" style={{ fontWeight: 700, color: remaining === 1 ? 'var(--warning)' : 'var(--text)' }}>
        {remaining}/{limit}
      </span>
      <span class="muted">{label} left</span>
      <span
        aria-hidden="true"
        style={{
          width: '48px',
          height: '6px',
          borderRadius: '999px',
          background: 'var(--border)',
          overflow: 'hidden',
          display: 'inline-block',
        }}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            width: `${pct}%`,
            borderRadius: '999px',
            background: remaining === 1 ? 'var(--warning)' : 'var(--primary)',
            transition: 'width 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </span>
    </div>
  );
}
