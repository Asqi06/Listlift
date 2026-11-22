import { z } from 'zod';
import { requireMarketplaceSkill } from '@listlift/skills';
import { MarketplaceIdSchema } from './schemas.js';
import { charLength, utf8ByteLength } from './validator.js';

export const TagsGenerateRequestSchema = z.object({
  marketplace: MarketplaceIdSchema,
  productName: z.string().trim().min(2).max(200),
  category: z.string().trim().max(80).optional().default(''),
  material: z.string().trim().max(80).optional().default(''),
  audienceOrUseCase: z.string().trim().max(80).optional().default(''),
  seedKeywords: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
});

export type TagsGenerateRequest = z.infer<typeof TagsGenerateRequestSchema>;

export interface GeneratedTag {
  tag: string;
  length: number;
  bytes: number;
  status: 'pass' | 'fail';
}

export interface TagsGenerateResult {
  marketplace: string;
  marketplaceName: string;
  countMax: number;
  eachMax: number;
  maxBytes?: number;
  tags: GeneratedTag[];
  backendSearchTerms: string;
  backendBytes: number;
}

function cleanPhrase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateTagsAndKeywords(req: TagsGenerateRequest): TagsGenerateResult {
  const skill = requireMarketplaceSkill(req.marketplace);
  const countMax = skill.fields.tags?.count_max ?? 13;
  const eachMax = skill.fields.tags?.each_max ?? 20;
  const maxBytes = skill.fields.search_terms?.max_bytes;

  const baseName = cleanPhrase(req.productName);
  const words = baseName.split(' ').filter((w) => w.length >= 2);
  const noun = words[words.length - 1] ?? baseName;
  const material = cleanPhrase(req.material);
  const category = cleanPhrase(req.category);
  const audience = cleanPhrase(req.audienceOrUseCase);

  const candidates: string[] = [
    ...req.seedKeywords.map(cleanPhrase),
    baseName,
    material && noun ? `${material} ${noun}` : '',
    audience && noun ? `${noun} ${audience}` : '',
    category && noun ? `${category} ${noun}` : '',
    material && category ? `${material} ${category}` : '',
    ...words.slice(0, 4).map((w) => (w !== noun ? `${w} ${noun}` : '')),
    `${noun} gift`,
    `handmade ${noun}`,
    `daily use ${noun}`,
    `modern ${noun}`,
    `eco ${noun}`,
    `minimalist ${noun}`,
    `gift for her`,
    `gift for him`,
    `home essential`,
    `custom ${noun}`,
    `${noun} set`,
    `${noun} pack`,
    category,
    material,
    audience,
  ].filter(Boolean);

  const seen = new Set<string>();
  const tags: GeneratedTag[] = [];

  for (const raw of candidates) {
    if (tags.length >= countMax) break;
    let phrase = raw;
    if (charLength(phrase) > eachMax) {
      // Trim at word boundary if possible
      const parts = phrase.split(' ');
      let built = '';
      for (const p of parts) {
        const next = built ? `${built} ${p}` : p;
        if (charLength(next) <= eachMax) built = next;
      }
      phrase = built || Array.from(phrase).slice(0, eachMax).join('').trim();
    }
    if (!phrase || seen.has(phrase)) continue;
    seen.add(phrase);
    const len = charLength(phrase);
    tags.push({
      tag: phrase,
      length: len,
      bytes: utf8ByteLength(phrase),
      status: len <= eachMax ? 'pass' : 'fail',
    });
  }

  // Build deduplicated space-separated backend search terms within maxBytes (default 250B)
  const byteCap = maxBytes ?? 250;
  const termWords = new Set<string>();
  let backendSearchTerms = '';
  for (const t of tags) {
    for (const w of t.tag.split(' ')) {
      if (!w || termWords.has(w)) continue;
      const next = backendSearchTerms ? `${backendSearchTerms} ${w}` : w;
      if (utf8ByteLength(next) <= byteCap) {
        termWords.add(w);
        backendSearchTerms = next;
      }
    }
  }

  return {
    marketplace: skill.marketplace,
    marketplaceName: skill.display_name,
    countMax,
    eachMax,
    maxBytes,
    tags,
    backendSearchTerms,
    backendBytes: utf8ByteLength(backendSearchTerms),
  };
}
