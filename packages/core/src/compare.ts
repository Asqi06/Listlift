import { z } from 'zod';
import { charLength } from './validator.js';

export const CompetitorEntrySchema = z.object({
  source: z.string().trim().min(1).max(300),
  title: z.string().trim().min(2).max(300),
  price: z.number().nonnegative().optional(),
  currency: z.string().trim().max(8).optional().default('USD'),
  description: z.string().trim().max(3000).optional().default(''),
});

export const CompetitorCompareRequestSchema = z.object({
  yourTitle: z.string().trim().max(300).optional().default(''),
  yourKeywords: z.array(z.string().trim().min(1).max(60)).optional().default([]),
  competitors: z.array(CompetitorEntrySchema).min(2).max(10),
});

export type CompetitorEntry = z.infer<typeof CompetitorEntrySchema>;
export type CompetitorCompareRequest = z.infer<typeof CompetitorCompareRequestSchema>;

export interface KeywordFrequency {
  term: string;
  count: number;
  inYourListing: boolean;
}

export interface PriceBand {
  min: number;
  median: number;
  max: number;
  currency: string;
  sampleSize: number;
}

export interface CompetitorCompareResult {
  competitorCount: number;
  averageTitleLength: number;
  priceBand: PriceBand | null;
  topKeywords: KeywordFrequency[];
  keywordGaps: string[];
  titlePatterns: string[];
  matrix: Array<{
    source: string;
    title: string;
    titleLength: number;
    price?: number;
    currency: string;
    topTerms: string[];
  }>;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'is', 'it',
  'of', 'on', 'or', 'the', 'to', 'with', 'your', 'our', 'new', 'best', 'set',
]);

function extractTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export function compareCompetitors(req: CompetitorCompareRequest): CompetitorCompareResult {
  const freq = new Map<string, number>();
  const yourSet = new Set([
    ...extractTerms(req.yourTitle),
    ...req.yourKeywords.flatMap((k) => extractTerms(k)),
  ]);

  const prices: number[] = [];
  let primaryCurrency = 'USD';
  let totalTitleLen = 0;

  const matrix = req.competitors.map((comp) => {
    const titleLength = charLength(comp.title);
    totalTitleLen += titleLength;
    if (comp.price !== undefined && comp.price > 0) {
      prices.push(comp.price);
      primaryCurrency = comp.currency || primaryCurrency;
    }

    const terms = Array.from(new Set(extractTerms(`${comp.title} ${comp.description}`)));
    for (const term of terms) {
      freq.set(term, (freq.get(term) ?? 0) + 1);
    }

    return {
      source: comp.source,
      title: comp.title,
      titleLength,
      price: comp.price,
      currency: comp.currency,
      topTerms: terms.slice(0, 6),
    };
  });

  const sortedKeywords: KeywordFrequency[] = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 18)
    .map(([term, count]) => ({
      term,
      count,
      inYourListing: yourSet.has(term),
    }));

  const keywordGaps = sortedKeywords
    .filter((k) => k.count >= 2 && !k.inYourListing)
    .map((k) => k.term);

  prices.sort((a, b) => a - b);
  let priceBand: PriceBand | null = null;
  if (prices.length > 0) {
    const mid = Math.floor(prices.length / 2);
    const median =
      prices.length % 2 === 0
        ? Number((((prices[mid - 1] ?? 0) + (prices[mid] ?? 0)) / 2).toFixed(2))
        : (prices[mid] ?? 0);
    priceBand = {
      min: prices[0] ?? 0,
      median,
      max: prices[prices.length - 1] ?? 0,
      currency: primaryCurrency,
      sampleSize: prices.length,
    };
  }

  const titlePatterns: string[] = [];
  const hasSeparators = req.competitors.filter((c) => /[|\-–,]/.test(c.title)).length;
  if (hasSeparators >= Math.ceil(req.competitors.length / 2)) {
    titlePatterns.push('Most competitors segment titles with separators (|, -, or commas).');
  }
  const hasNumbers = req.competitors.filter((c) => /\d+/.test(c.title)).length;
  if (hasNumbers >= Math.ceil(req.competitors.length / 2)) {
    titlePatterns.push('Numeric specs (size, pack count, oz/ml) appear in the majority of titles.');
  }
  const avgLen = Math.round(totalTitleLen / req.competitors.length);
  titlePatterns.push(`Average competitor title length is ${avgLen} characters.`);

  return {
    competitorCount: req.competitors.length,
    averageTitleLength: avgLen,
    priceBand,
    topKeywords: sortedKeywords,
    keywordGaps,
    titlePatterns,
    matrix,
  };
}

/**
 * Safely parse schema.org Product JSON-LD and OpenGraph tags from raw HTML
 * without executing scripts or relying on DOM APIs (Workers-compatible).
 */
export function extractStructuredProductFromHtml(
  html: string,
  sourceUrl: string,
): CompetitorEntry | null {
  const ldMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of ldMatches) {
    try {
      const parsed = JSON.parse(match[1] ?? '{}') as Record<string, unknown>;
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed['@graph'])
          ? (parsed['@graph'] as Array<Record<string, unknown>>)
          : [parsed];
      for (const node of nodes) {
        const typeVal = String(node['@type'] ?? '').toLowerCase();
        if (typeVal.includes('product') && typeof node.name === 'string') {
          const offers = node.offers as Record<string, unknown> | undefined;
          const rawPrice = offers?.price ?? offers?.lowPrice;
          const price = rawPrice !== undefined ? Number(rawPrice) : undefined;
          const currency =
            typeof offers?.priceCurrency === 'string' ? offers.priceCurrency : 'USD';
          return {
            source: sourceUrl,
            title: node.name.trim(),
            price: Number.isFinite(price) ? price : undefined,
            currency,
            description:
              typeof node.description === 'string' ? node.description.slice(0, 800) : '',
          };
        }
      }
    } catch {
      // Ignore malformed JSON-LD block
    }
  }

  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (!ogTitle) return null;

  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    '';

  return {
    source: sourceUrl,
    title: ogTitle.trim(),
    currency: 'USD',
    description: ogDesc.trim().slice(0, 800),
  };
}
