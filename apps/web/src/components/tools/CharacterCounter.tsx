import { useState } from 'preact/hooks';
import {
  getAllMarketplaceSkills,
  type MarketplaceId,
} from '@listlift/skills';
import {
  charLength,
  utf8ByteLength,
  validateTextField,
} from '@listlift/core';

const SKILLS = getAllMarketplaceSkills();

export default function CharacterCounter() {
  const [marketplace, setMarketplace] = useState<MarketplaceId>('etsy');
  const [fieldKey, setFieldKey] = useState<string>('title');
  const [text, setText] = useState<string>(
    'Handmade Soy Wax Lavender Candle 8oz Amber Glass Jar Gift for Her',
  );
  const [copied, setCopied] = useState(false);

  const skill = SKILLS.find((s) => s.marketplace === marketplace) ?? SKILLS[0]!;
  const availableFields = Object.entries(skill.fields).filter(
    ([, rule]) => rule !== undefined && (rule.max !== undefined || rule.max_bytes !== undefined),
  );
  const activeEntry =
    availableFields.find(([k]) => k === fieldKey) ?? availableFields[0]!;
  const activeKey = activeEntry[0];
  const activeRule = activeEntry[1]!;

  const check = validateTextField(activeKey, text, activeRule);
  const limit = activeRule.max_bytes ?? activeRule.max ?? 140;
  const current = activeRule.max_bytes ? check.bytes : check.length;
  const unit = activeRule.max_bytes ? 'bytes' : 'chars';
  const pct = Math.min(100, Math.round((current / limit) * 100));
  const meterColor =
    check.status === 'fail'
      ? 'var(--danger)'
      : check.status === 'warn'
        ? 'var(--warning)'
        : 'var(--success)';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div class="muted" style={{ fontSize: '0.8rem', marginBottom: '8px', fontWeight: 600 }}>
          1. CHOOSE MARKETPLACE
        </div>
        <div class="chip-group" role="group" aria-label="Marketplace selector">
          {SKILLS.map((s) => (
            <button
              key={s.marketplace}
              type="button"
              class="chip"
              aria-pressed={s.marketplace === marketplace}
              onClick={() => {
                setMarketplace(s.marketplace);
                setFieldKey('title');
              }}
            >
              {s.display_name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div class="chip-group" role="group" aria-label="Field selector">
          {availableFields.map(([key, rule]) => (
            <button
              key={key}
              type="button"
              class="chip"
              aria-pressed={key === activeKey}
              onClick={() => setFieldKey(key)}
            >
              {rule!.label}
            </button>
          ))}
        </div>
        <span class="badge badge-neutral">Rules verified: {skill.last_verified}</span>
      </div>

      <div class="field">
        <label for="cc-input">
          {skill.display_name} — {activeRule.label}
        </label>
        <textarea
          id="cc-input"
          class="textarea"
          rows={4}
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder={`Paste or type your ${skill.display_name} ${activeRule.label.toLowerCase()}...`}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} aria-live="polite">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span class={`badge badge-${check.status}`}>
              {check.status.toUpperCase()}
            </span>
            <span class="mono" style={{ fontWeight: 600 }}>
              {current} / {limit} {unit}
            </span>
            <span class="muted mono" style={{ fontSize: '0.8rem' }}>
              ({charLength(text.trim())} chars · {utf8ByteLength(text.trim())} UTF-8 bytes)
            </span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy text'}
          </button>
        </div>

        <div class="meter-track" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={limit}>
          <div class="meter-fill" style={{ width: `${pct}%`, background: meterColor }} />
        </div>

        {activeRule.notes && (
          <p class="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
            <strong>Rule note:</strong> {activeRule.notes}
          </p>
        )}

        {check.messages.length > 0 && (
          <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: '0.875rem', color: meterColor }}>
            {check.messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
