import { requireMarketplaceSkill } from '@listlift/skills';
import { type TitleGenerateRequest } from './schemas.js';
import { charLength, validateTextField } from './validator.js';

export interface TitleOption {
  id: string;
  angle: string;
  title: string;
  length: number;
  limit: number;
  recommendedMax?: number;
  status: 'pass' | 'warn' | 'fail';
  matchedKeywords: string[];
  keywordCoveragePercent: number;
}

export interface TitleGenerateResult {
  marketplace: string;
  marketplaceName: string;
  lastVerified: string;
  limit: number;
  recommendedMax?: number;
  styleNotes: string;
  options: TitleOption[];
}

function fitToLimit(parts: string[], maxLen: number, separator: string): string {
  const cleanParts = parts.map((p) => p.trim()).filter(Boolean);
  let result = '';
  for (const part of cleanParts) {
    const candidate = result ? `${result}${separator}${part}` : part;
    if (charLength(candidate) <= maxLen) {
      result = candidate;
    }
  }
  if (!result && cleanParts[0]) {
    result = Array.from(cleanParts[0]).slice(0, maxLen).join('').trim();
  }
  return result;
}

function toTitleCase(input: string): string {
  const minor = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  return input
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && minor.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function generateTitleOptions(req: TitleGenerateRequest): TitleGenerateResult {
  const skill = requireMarketplaceSkill(req.marketplace);
  const titleRule = skill.fields.title;
  const maxLen = titleRule.max ?? 140;
  const preferredLen = titleRule.recommended_max ?? maxLen;

  const name = toTitleCase(req.productName);
  const brand = req.brand ? toTitleCase(req.brand) : '';
  const material = req.material ? toTitleCase(req.material) : '';
  const size = req.sizeOrQuantity ? req.sizeOrQuantity.trim() : '';
  const useCase = req.audienceOrUseCase ? toTitleCase(req.audienceOrUseCase) : '';
  const kws = req.keywords.map((k) => toTitleCase(k)).filter(Boolean);

  const kw1 = kws[0] ?? '';
  const kw2 = kws[1] ?? '';
  const kw3 = kws[2] ?? '';

  const candidates: Array<{ id: string; angle: string; rawParts: string[]; sep: string }> = [
    {
      id: 'primary-frontload',
      angle: 'Keyword Front-Loaded',
      rawParts: [name, kw1, material, size, useCase ? `for ${useCase}` : '', brand],
      sep: ' - ',
    },
    {
      id: 'brand-spec',
      angle: 'Brand + Spec Formula',
      rawParts: [brand, name, material, size, kw1, kw2],
      sep: ' ',
    },
    {
      id: 'benefit-usecase',
      angle: 'Use-Case & Buyer Intent',
      rawParts: [
        useCase ? `${name} for ${useCase}` : name,
        material ? `${material} Edition` : '',
        size,
        kw1,
        kw2,
        kw3,
      ],
      sep: ' | ',
    },
    {
      id: 'compact-mobile',
      angle: 'Compact Mobile-First',
      rawParts: [brand, material, name, size, kw1],
      sep: ' ',
    },
    {
      id: 'search-surface',
      angle: 'Max Search Coverage',
      rawParts: [name, kw1, kw2, material, useCase, size, kw3, brand],
      sep: ', ',
    },
  ];

  const seen = new Set<string>();
  const options: TitleOption[] = candidates.map((c, idx) => {
    const targetCap = idx === 3 ? Math.min(preferredLen, 75) : maxLen;
    let title = fitToLimit(c.rawParts, targetCap, c.sep);
    if (seen.has(title.toLowerCase()) && kws.length > 0) {
      title = fitToLimit([...c.rawParts.slice().reverse()], targetCap, ' - ');
    }
    seen.add(title.toLowerCase());

    const check = validateTextField('title', title, titleRule);
    const lowerTitle = title.toLowerCase();
    const matchedKeywords = req.keywords.filter((k) =>
      lowerTitle.includes(k.toLowerCase()),
    );
    const keywordCoveragePercent =
      req.keywords.length === 0
        ? 100
        : Math.round((matchedKeywords.length / req.keywords.length) * 100);

    return {
      id: c.id,
      angle: c.angle,
      title,
      length: check.length,
      limit: maxLen,
      recommendedMax: titleRule.recommended_max,
      status: check.status,
      matchedKeywords,
      keywordCoveragePercent,
    };
  });

  return {
    marketplace: skill.marketplace,
    marketplaceName: skill.display_name,
    lastVerified: skill.last_verified,
    limit: maxLen,
    recommendedMax: titleRule.recommended_max,
    styleNotes: skill.style_notes,
    options,
  };
}
