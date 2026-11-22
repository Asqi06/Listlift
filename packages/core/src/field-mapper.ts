import type { AutoFillPayload } from './autofill.js';

export type CanonicalFieldSlot =
  | 'title'
  | 'sku'
  | 'shortDescription'
  | 'longDescription'
  | 'bullets'
  | 'tags'
  | 'searchTerms'
  | 'seoTitle'
  | 'metaDescription';

export interface FieldDescriptor {
  id: string;
  tagName: 'input' | 'textarea' | 'contenteditable' | 'select';
  inputType?: string;
  name?: string;
  domId?: string;
  placeholder?: string;
  ariaLabel?: string;
  labelText?: string;
  nearbyText?: string;
  explicitHint?: string; // data-listlift="title"
  maxLength?: number;
}

export interface FieldMatch {
  fieldId: string;
  slot: CanonicalFieldSlot;
  confidence: number;
  reason: string;
  value: string;
}

const SKIP_INPUT_TYPES = new Set([
  'hidden', 'password', 'email', 'tel', 'file', 'checkbox', 'radio', 'submit',
  'button', 'reset', 'image', 'date', 'datetime-local', 'time', 'color', 'range', 'search',
]);

const SKIP_NOISE_PATTERNS = [
  /\b(search\s+catalog|site\s+search|global\s+search|login|password|email|phone|otp|coupon|promo\s+code|gstin|pan\s+number|bank\s+account)\b/i,
];

const SLOT_RULES: Record<
  CanonicalFieldSlot,
  { exact: RegExp[]; strong: RegExp[]; weak: RegExp[]; preferMultiline?: boolean }
> = {
  seoTitle: {
    exact: [/\b(seo[\s_-]*title|meta[\s_-]*title|page[\s_-]*title|browser[\s_-]*title)\b/i],
    strong: [/\bseo\b.*\btitle\b/i, /\bsearch\s+engine\b.*\btitle\b/i],
    weak: [],
  },
  metaDescription: {
    exact: [/\b(meta[\s_-]*desc|seo[\s_-]*desc|meta[\s_-]*description|seo[\s_-]*description)\b/i],
    strong: [/\bsearch\s+engine\b.*\bdesc/i],
    weak: [],
    preferMultiline: true,
  },
  title: {
    exact: [
      /\b(product[\s_-]*title|item[\s_-]*title|listing[\s_-]*title|product[\s_-]*name|item[\s_-]*name|offer[\s_-]*title)\b/i,
    ],
    strong: [/\b(title|headline|heading|prod[\s_-]*name|product[\s_-]*heading)\b/i],
    weak: [/\bname\b/i],
  },
  sku: {
    exact: [
      /\b(seller[\s_-]*sku|item[\s_-]*sku|variant[\s_-]*sku|product[\s_-]*sku|sku[\s_-]*id|sku[\s_-]*code|style[\s_-]*code)\b/i,
    ],
    strong: [/\bsku\b/i, /\bitem[\s_-]*code\b/i, /\barticle[\s_-]*code\b/i, /\bcatalog[\s_-]*code\b/i],
    weak: [/\bref[\s_-]*code\b/i],
  },
  shortDescription: {
    exact: [
      /\b(short[\s_-]*desc|short[\s_-]*description|summary|excerpt|product[\s_-]*summary|brief[\s_-]*desc|intro[\s_-]*copy)\b/i,
    ],
    strong: [/\bshort\b.*\b(desc|copy|text)\b/i, /\bsub[\s_-]*title\b/i],
    weak: [],
    preferMultiline: true,
  },
  bullets: {
    exact: [
      /\b(bullet[\s_-]*point|key[\s_-]*features?|highlights?|product[\s_-]*highlights?|feature[\s_-]*bullets?)\b/i,
    ],
    strong: [/\bbullets?\b/i, /\bselling[\s_-]*points?\b/i],
    weak: [],
    preferMultiline: true,
  },
  longDescription: {
    exact: [
      /\b(product[\s_-]*description|item[\s_-]*description|long[\s_-]*description|detailed[\s_-]*description|full[\s_-]*description|body[\s_-]*html|body[\s_-]*copy)\b/i,
    ],
    strong: [/\bdescription\b/i, /\bdetails?\b/i, /\babout\s+this\s+item\b/i, /\bbody\b/i],
    weak: [/\bnotes?\b/i, /\bcopy\b/i],
    preferMultiline: true,
  },
  searchTerms: {
    exact: [
      /\b(backend[\s_-]*search|search[\s_-]*terms?|generic[\s_-]*keywords?|search[\s_-]*keywords?)\b/i,
    ],
    strong: [/\bkeywords?\b/i],
    weak: [],
  },
  tags: {
    exact: [/\b(product[\s_-]*tags?|listing[\s_-]*tags?|etsy[\s_-]*tags?|tags?)\b/i],
    strong: [/\bhashtags?\b/i, /\blabels?\b/i],
    weak: [],
  },
};

function normalizeHint(hint: string): CanonicalFieldSlot | null {
  const h = hint.toLowerCase().replace(/[^a-z]/g, '');
  const map: Record<string, CanonicalFieldSlot> = {
    title: 'title',
    producttitle: 'title',
    sku: 'sku',
    shortdescription: 'shortDescription',
    shortdesc: 'shortDescription',
    description: 'longDescription',
    longdescription: 'longDescription',
    bullets: 'bullets',
    highlights: 'bullets',
    tags: 'tags',
    keywords: 'searchTerms',
    searchterms: 'searchTerms',
    seotitle: 'seoTitle',
    metadescription: 'metaDescription',
    seodescription: 'metaDescription',
  };
  return map[h] ?? null;
}

export function getValueForSlot(payload: AutoFillPayload, slot: CanonicalFieldSlot): string {
  switch (slot) {
    case 'title':
      return payload.title;
    case 'sku':
      return payload.sku;
    case 'shortDescription':
      return payload.shortDescription;
    case 'longDescription':
      return payload.longDescription;
    case 'bullets':
      return payload.bullets.map((b) => `• ${b}`).join('\n');
    case 'tags':
      return payload.tags.join(', ');
    case 'searchTerms':
      return payload.searchTerms;
    case 'seoTitle':
      return payload.seoTitle;
    case 'metaDescription':
      return payload.metaDescription;
  }
}

/**
 * Universally inspects any set of form fields (from any marketplace or custom website)
 * and computes the highest-confidence semantic mapping for each field.
 */
export function mapFormFieldsSemantically(
  fields: readonly FieldDescriptor[],
  payload: AutoFillPayload,
): FieldMatch[] {
  const candidates: Array<{
    field: FieldDescriptor;
    slot: CanonicalFieldSlot;
    score: number;
    reason: string;
  }> = [];

  for (const field of fields) {
    if (field.tagName === 'select') continue;
    if (field.inputType && SKIP_INPUT_TYPES.has(field.inputType.toLowerCase())) continue;

    // 1. Explicit developer hint (`data-listlift="title"`) always wins with 1.0 confidence
    if (field.explicitHint) {
      const slot = normalizeHint(field.explicitHint);
      if (slot) {
        candidates.push({
          field,
          slot,
          score: 100,
          reason: `Explicit data-listlift="${field.explicitHint}"`,
        });
        continue;
      }
    }

    const signature = [
      field.labelText,
      field.ariaLabel,
      field.placeholder,
      field.name,
      field.domId,
      field.nearbyText,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/[_-]+/g, ' ');

    if (!signature.trim()) continue;
    if (SKIP_NOISE_PATTERNS.some((rx) => rx.test(signature))) continue;

    const isMultiline = field.tagName === 'textarea' || field.tagName === 'contenteditable';

    let bestSlot: CanonicalFieldSlot | null = null;
    let bestScore = 0;
    let bestReason = '';

    for (const [slotKey, rule] of Object.entries(SLOT_RULES) as Array<
      [CanonicalFieldSlot, (typeof SLOT_RULES)[CanonicalFieldSlot]]
    >) {
      let score = 0;
      let reason = '';

      if (rule.exact.some((rx) => rx.test(signature))) {
        score = 88;
        reason = `Matched exact "${slotKey}" label/attribute`;
      } else if (rule.strong.some((rx) => rx.test(signature))) {
        score = 68;
        reason = `Matched "${slotKey}" keyword signal`;
      } else if (rule.weak.some((rx) => rx.test(signature))) {
        score = 42;
        reason = `Matched contextual "${slotKey}" signal`;
      }

      if (score > 0) {
        if (rule.preferMultiline && isMultiline) score += 10;
        if (!rule.preferMultiline && !isMultiline && slotKey !== 'tags') score += 6;
        // Avoid mapping a short single-line input to longDescription if it looks like a title
        if (slotKey === 'longDescription' && !isMultiline && field.maxLength && field.maxLength <= 200) {
          score -= 25;
        }
        if (score > bestScore) {
          bestScore = score;
          bestSlot = slotKey;
          bestReason = reason;
        }
      }
    }

    if (bestSlot && bestScore >= 40) {
      candidates.push({ field, slot: bestSlot, score: bestScore, reason: bestReason });
    }
  }

  // Sort by highest score so each field gets its strongest slot; allow multiple bullet inputs
  candidates.sort((a, b) => b.score - a.score);

  const usedSlots = new Set<CanonicalFieldSlot>();
  const usedFields = new Set<string>();
  const matches: FieldMatch[] = [];

  for (const c of candidates) {
    if (usedFields.has(c.field.id)) continue;
    // Allow multiple separate bullet fields (e.g. Amazon bullet_point1..5)
    if (c.slot !== 'bullets' && usedSlots.has(c.slot)) continue;

    usedFields.add(c.field.id);
    usedSlots.add(c.slot);
    matches.push({
      fieldId: c.field.id,
      slot: c.slot,
      confidence: Math.min(1, Number((c.score / 100).toFixed(2))),
      reason: c.reason,
      value: getValueForSlot(payload, c.slot),
    });
  }

  return matches;
}
