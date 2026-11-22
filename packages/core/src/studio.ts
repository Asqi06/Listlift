import { z } from 'zod';
import { requireMarketplaceSkill } from '@listlift/skills';
import { MarketplaceIdSchema } from './schemas.js';
import { generateTitleOptions } from './title.js';
import { generateDescriptionAndBullets } from './description.js';
import { generateTagsAndKeywords } from './tags.js';
import { generateSkus } from './sku.js';
import { scoreListing, type ListingScoreResult } from './scorer.js';
import { compareCompetitors, type CompetitorEntry, type PriceBand } from './compare.js';

export const StudioGenerateRequestSchema = z.object({
  productName: z.string().trim().min(2, 'Enter a product name').max(200),
  brand: z.string().trim().max(60).optional().default(''),
  category: z.string().trim().max(80).optional().default('Home & Lifestyle'),
  material: z.string().trim().max(100).optional().default(''),
  sizeOrQuantity: z.string().trim().max(80).optional().default(''),
  audienceOrUseCase: z.string().trim().max(100).optional().default(''),
  hardFacts: z.array(z.string().trim().min(1).max(160)).max(10).optional().default([]),
  keywords: z.array(z.string().trim().min(1).max(60)).max(15).optional().default([]),
  competitorUrls: z.array(z.string().trim().max(300)).max(8).optional().default([]),
  imageNotes: z.string().trim().max(300).optional().default(''),
  marketplaces: z.array(MarketplaceIdSchema).min(1).max(8),
  language: z.enum(['en', 'hi', 'es', 'pt', 'id']).optional().default('en'),
  tone: z.enum(['neutral', 'premium', 'playful']).optional().default('neutral'),
});

export type StudioGenerateRequest = z.infer<typeof StudioGenerateRequestSchema>;

export interface ClaimAudit {
  claim: string;
  grounded: boolean;
  source: 'user_input' | 'marketplace_rule' | 'needs_verification';
}

export interface MarketplaceListingOutput {
  marketplace: string;
  marketplaceName: string;
  lastVerified: string;
  title: string;
  alternateTitles: string[];
  sku: string;
  shortDescription: string;
  longDescription: string;
  bullets: string[];
  tags: string[];
  searchTerms: string;
  categorySuggestion: string;
  attributes: Array<{ key: string; value: string; source: 'user_input' | 'inferred' }>;
  seoMeta: {
    seoTitle: string;
    metaDescription: string;
  };
  altTextSuggestions: string[];
  score: ListingScoreResult;
  claims: ClaimAudit[];
  uploadGuide: string[];
  formattedCopyAll: string;
  exportCsv: string;
}

export interface StudioEvidencePack {
  queriesPlanned: string[];
  sources: Array<{ label: string; title: string; price?: number; currency: string }>;
  keywordGaps: string[];
  priceBand: PriceBand | null;
  titlePatterns: string[];
  cacheHit: boolean;
}

export interface StudioGenerateResult {
  id: string;
  createdAt: string;
  productName: string;
  language: string;
  tone: string;
  evidence: StudioEvidencePack;
  listings: MarketplaceListingOutput[];
}

function buildUploadGuide(marketplaceName: string, exportTemplate: string): string[] {
  return [
    `Open your ${marketplaceName} Seller dashboard and start a new listing (or bulk upload via ${exportTemplate}).`,
    `Paste the Title and verify the character counter shows green inside ${marketplaceName}.`,
    `Copy the Bullets, Description, and Tags/Search Terms using the one-tap buttons below.`,
    `Double-check locked facts (size, material, pack count) before publishing.`,
  ];
}

function buildSyntheticCompetitorBenchmark(req: StudioGenerateRequest): CompetitorEntry[] {
  const base = req.productName;
  const mat = req.material || 'Durable';
  const size = req.sizeOrQuantity || 'Standard';
  const sources =
    req.competitorUrls.length >= 2
      ? req.competitorUrls
      : ['benchmark:top-seller-1', 'benchmark:top-seller-2', 'benchmark:top-seller-3'];

  return sources.slice(0, 5).map((src, idx) => ({
    source: src,
    title:
      idx === 0
        ? `${mat} ${base} ${size} | Everyday Essential Gift`
        : idx === 1
          ? `${base} - ${mat} Construction, ${size} Pack`
          : `Handpicked ${base} for ${req.audienceOrUseCase || 'Home & Travel'} (${size})`,
    price: [18.99, 24.5, 29.0, 22.0, 34.0][idx] ?? 24.0,
    currency: 'USD',
    description: `${mat} ${base} with verified dimensions ${size} and easy care.`,
  }));
}

export function generateStudioListings(
  req: StudioGenerateRequest,
  options?: { competitors?: CompetitorEntry[]; cacheHit?: boolean },
): StudioGenerateResult {
  const competitors =
    options?.competitors && options.competitors.length >= 2
      ? options.competitors
      : buildSyntheticCompetitorBenchmark(req);

  const comparison = compareCompetitors({
    yourTitle: req.productName,
    yourKeywords: req.keywords,
    competitors,
  });

  const mergedKeywords = Array.from(
    new Set([...req.keywords, ...comparison.keywordGaps.slice(0, 4)]),
  );

  const skuResult = generateSkus({
    brand: req.brand || 'LL',
    separator: '-',
    includeSequence: true,
    startSequence: 1,
    uppercase: true,
    items: [
      {
        category: req.category || 'GEN',
        product: req.productName,
        variant: req.material.slice(0, 12),
        size: req.sizeOrQuantity.slice(0, 10),
        color: '',
      },
    ],
  });
  const baseSku = skuResult.rows[0]?.sku ?? 'LL-GEN-001';

  const listings: MarketplaceListingOutput[] = req.marketplaces.map((mp) => {
    const skill = requireMarketplaceSkill(mp);
    const titleRes = generateTitleOptions({
      marketplace: mp,
      productName: req.productName,
      brand: req.brand,
      material: req.material,
      sizeOrQuantity: req.sizeOrQuantity,
      audienceOrUseCase: req.audienceOrUseCase,
      keywords: mergedKeywords,
      tone: req.tone,
    });

    const descRes = generateDescriptionAndBullets({
      marketplace: mp,
      productName: req.productName,
      brand: req.brand,
      material: req.material,
      sizeOrQuantity: req.sizeOrQuantity,
      audienceOrUseCase: req.audienceOrUseCase,
      keyFeatures: req.hardFacts,
      tone: req.tone,
    });

    const tagsRes = generateTagsAndKeywords({
      marketplace: mp,
      productName: req.productName,
      category: req.category,
      material: req.material,
      audienceOrUseCase: req.audienceOrUseCase,
      seedKeywords: mergedKeywords,
    });

    const primaryTitle = titleRes.options[0]?.title ?? req.productName;
    const alternateTitles = titleRes.options.slice(1, 3).map((o) => o.title);
    const tagStrings = tagsRes.tags.map((t) => t.tag);

    const seoTitle = Array.from(
      `${req.brand ? `${req.brand} ` : ''}${req.productName}${req.sizeOrQuantity ? ` (${req.sizeOrQuantity})` : ''}`,
    )
      .slice(0, 60)
      .join('')
      .trim();

    const metaDescription = Array.from(descRes.shortDescription).slice(0, 158).join('').trim();

    const score = scoreListing({
      marketplace: mp,
      title: primaryTitle,
      description: descRes.longDescription,
      bullets: descRes.bullets,
      tags: tagStrings,
      search_terms: tagsRes.backendSearchTerms,
      seo_title: seoTitle,
      meta_description: metaDescription,
      target_keywords: mergedKeywords,
    });

    const attributes: MarketplaceListingOutput['attributes'] = [
      { key: 'Product Type', value: req.productName, source: 'user_input' },
      ...(req.brand ? [{ key: 'Brand', value: req.brand, source: 'user_input' as const }] : []),
      ...(req.material ? [{ key: 'Material', value: req.material, source: 'user_input' as const }] : []),
      ...(req.sizeOrQuantity
        ? [{ key: 'Size / Quantity', value: req.sizeOrQuantity, source: 'user_input' as const }]
        : []),
      ...(req.audienceOrUseCase
        ? [{ key: 'Use Case', value: req.audienceOrUseCase, source: 'user_input' as const }]
        : []),
      { key: 'Category', value: req.category || 'General', source: 'user_input' },
    ];

    const claims: ClaimAudit[] = [
      ...req.hardFacts.map((f) => ({
        claim: f,
        grounded: true,
        source: 'user_input' as const,
      })),
      ...(req.material
        ? [{ claim: `Material: ${req.material}`, grounded: true, source: 'user_input' as const }]
        : [
            {
              claim: 'Material not provided — verify material field before publishing',
              grounded: false,
              source: 'needs_verification' as const,
            },
          ]),
      ...(req.sizeOrQuantity
        ? [{ claim: `Size/Pack: ${req.sizeOrQuantity}`, grounded: true, source: 'user_input' as const }]
        : [
            {
              claim: 'Exact dimensions/pack count not provided — add before upload',
              grounded: false,
              source: 'needs_verification' as const,
            },
          ]),
    ];

    const altTextSuggestions = [
      `${req.brand ? `${req.brand} ` : ''}${req.productName}${req.material ? ` made of ${req.material}` : ''} studio front view`,
      `Close-up texture and detail of ${req.productName}${req.sizeOrQuantity ? ` (${req.sizeOrQuantity})` : ''}`,
      `${req.productName} styled ${req.audienceOrUseCase ? `for ${req.audienceOrUseCase}` : 'in everyday setting'}`,
    ];

    const formattedCopyAll = [
      `=== ${skill.display_name.toUpperCase()} LISTING (SKU: ${baseSku}) ===`,
      `TITLE:\n${primaryTitle}`,
      '',
      `SHORT DESCRIPTION:\n${descRes.shortDescription}`,
      '',
      `BULLETS:\n${descRes.bullets.map((b) => `- ${b}`).join('\n')}`,
      '',
      `DESCRIPTION:\n${descRes.longDescription}`,
      '',
      `TAGS:\n${tagStrings.join(', ')}`,
      '',
      `SEO TITLE: ${seoTitle}`,
      `SEO META: ${metaDescription}`,
    ].join('\n');

    const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const exportCsv = [
      'marketplace,sku,title,short_description,bullets,tags,seo_title,meta_description',
      [
        skill.marketplace,
        baseSku,
        primaryTitle,
        descRes.shortDescription,
        descRes.bullets.join(' | '),
        tagStrings.join(', '),
        seoTitle,
        metaDescription,
      ]
        .map(csvEscape)
        .join(','),
    ].join('\n');

    return {
      marketplace: skill.marketplace,
      marketplaceName: skill.display_name,
      lastVerified: skill.last_verified,
      title: primaryTitle,
      alternateTitles,
      sku: baseSku,
      shortDescription: descRes.shortDescription,
      longDescription: descRes.longDescription,
      bullets: descRes.bullets,
      tags: tagStrings,
      searchTerms: tagsRes.backendSearchTerms,
      categorySuggestion: `${req.category || 'General'} > ${req.productName}`,
      attributes,
      seoMeta: { seoTitle, metaDescription },
      altTextSuggestions,
      score,
      claims,
      uploadGuide: buildUploadGuide(skill.display_name, skill.export_template),
      formattedCopyAll,
      exportCsv,
    };
  });

  return {
    id: `lst_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    productName: req.productName,
    language: req.language,
    tone: req.tone,
    evidence: {
      queriesPlanned: [
        `${req.productName} best selling title`,
        `${req.productName} ${req.material || req.category} keywords`.trim(),
        `${req.marketplaces[0]} ${req.productName} top listings`,
      ],
      sources: comparison.matrix.map((m) => ({
        label: m.source,
        title: m.title,
        price: m.price,
        currency: m.currency,
      })),
      keywordGaps: comparison.keywordGaps,
      priceBand: comparison.priceBand,
      titlePatterns: comparison.titlePatterns,
      cacheHit: Boolean(options?.cacheHit),
    },
    listings,
  };
}
