import { useEffect, useState } from 'preact/hooks';

interface ConsentState {
  essential: true;
  analytics: boolean;
  updatedAt: string;
}

const COOKIE_NAME = 'll_cookie_consent';

function readConsent(): ConsentState | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)ll_cookie_consent=([^;]+)/);
    if (!match?.[1]) return null;
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<ConsentState>;
    if (typeof parsed.analytics === 'boolean') {
      return {
        essential: true,
        analytics: parsed.analytics,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // ignore malformed cookie
  }
  return null;
}

function writeConsent(analytics: boolean): ConsentState {
  const state: ConsentState = {
    essential: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  const maxAge = 60 * 60 * 24 * 180; // 180 days
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(state))}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent('listlift:consent-updated', { detail: state }));
  return state;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      setVisible(true);
    } else {
      setAnalyticsEnabled(existing.analytics);
    }

    const onOpenSettings = () => {
      const current = readConsent();
      setAnalyticsEnabled(current?.analytics ?? false);
      setShowPrefs(true);
      setVisible(true);
    };
    window.addEventListener('listlift:open-cookie-settings', onOpenSettings);
    return () => window.removeEventListener('listlift:open-cookie-settings', onOpenSettings);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    writeConsent(true);
    setAnalyticsEnabled(true);
    setVisible(false);
    setShowPrefs(false);
  };

  const essentialOnly = () => {
    writeConsent(false);
    setAnalyticsEnabled(false);
    setVisible(false);
    setShowPrefs(false);
  };

  const savePrefs = () => {
    writeConsent(analyticsEnabled);
    setVisible(false);
    setShowPrefs(false);
  };

  return (
    <aside
      role="dialog"
      aria-label="Cookie preferences"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '16px',
        bottom: '16px',
        zIndex: 60,
        maxWidth: '410px',
        width: 'calc(100vw - 32px)',
        padding: '16px 18px',
        borderRadius: '14px',
        background: 'var(--bg-elevated, var(--surface))',
        border: '1px solid var(--border-strong, var(--border))',
        boxShadow: '0 14px 36px rgba(17, 18, 20, 0.16)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <strong style={{ fontSize: '0.92rem' }}>Cookie Preferences</strong>
        <a href="/cookies" style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
          Cookie Policy
        </a>
      </div>

      <p class="muted" style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5 }}>
        We use essential storage for dark/light theme and 1-click Auto-Fill sync. Optional analytics stay off unless you allow them.
      </p>

      {showPrefs && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'var(--subtle)',
            border: '1px solid var(--border)',
            fontSize: '0.82rem',
          }}
        >
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span>
              <strong>Essential storage</strong> (theme, draft sync, security)
            </span>
            <input type="checkbox" checked disabled aria-label="Essential cookies always active" />
          </label>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <span>
              <strong>Optional analytics</strong> (aggregated page performance)
            </span>
            <input
              type="checkbox"
              checked={analyticsEnabled}
              onChange={(e) => setAnalyticsEnabled((e.target as HTMLInputElement).checked)}
            />
          </label>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
        {showPrefs ? (
          <button type="button" class="btn btn-primary btn-sm" onClick={savePrefs}>
            Save preferences
          </button>
        ) : (
          <button type="button" class="btn btn-primary btn-sm" onClick={acceptAll}>
            Accept all
          </button>
        )}
        <button type="button" class="btn btn-secondary btn-sm" onClick={essentialOnly}>
          Essential only
        </button>
        {!showPrefs && (
          <button type="button" class="btn btn-ghost btn-sm" onClick={() => setShowPrefs(true)}>
            Manage
          </button>
        )}
      </div>
    </aside>
  );
}
