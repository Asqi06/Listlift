import type { MarketplaceListingOutput } from './studio.js';

export interface ParsedQuickInput {
  productName: string;
  brand: string;
  category: string;
  material: string;
  sizeOrQuantity: string;
  audienceOrUseCase: string;
  hardFacts: string[];
  keywords: string[];
}

/**
 * Turns a single casual line (e.g. "Handloom cotton kurta blue size M pack of 1 for office")
 * or an image filename into structured product fields so sellers never have to fill 8 boxes.
 */
export function parseQuickProductInput(rawInput: string): ParsedQuickInput {
  const clean = rawInput.replace(/\.[^.\s]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();

  const sizeMatch = clean.match(
    /\b(\d+(?:\.\d+)?\s?(?:oz|ml|l|g|kg|cm|mm|inch|in|ft|pack|pcs|piece|pieces|set)|size\s+[a-z0-9]+|pack\s+of\s+\d+)\b/i,
  );
  const sizeOrQuantity = sizeMatch?.[0]?.trim() ?? '';

  const materialPatterns = [
    'soy wax', 'beeswax', 'organic cotton', 'handloom cotton', 'pure cotton', 'cotton',
    'stainless steel', '304 stainless steel', 'full-grain leather', 'leather', 'bamboo',
    'ceramic', 'amber glass', 'glass', 'linen', 'silk', 'brass', 'wood', 'silicone',
  ];
  const material = materialPatterns.find((m) => lower.includes(m)) ?? '';

  const category =
    /candle|wax|diffuser|incense/i.test(lower)
      ? 'Candles & Fragrance'
      : /kurta|saree|shirt|dress|hoodie|t-shirt|tee|jacket|cotton|linen/i.test(lower)
        ? 'Apparel & Ethnic Wear'
        : /bottle|flask|mug|cup|board|kitchen|pan|bowl/i.test(lower)
          ? 'Kitchen & Dining'
          : /wallet|ring|necklace|earring|bracelet|bag|watch/i.test(lower)
            ? 'Jewelry & Accessories'
            : /lamp|vase|pillow|rug|decor|jar/i.test(lower)
              ? 'Home & Living'
              : 'General Merchandise';

  const useCaseMatch = clean.match(/\bfor\s+([a-z0-9&\s]{3,36})/i);
  const audienceOrUseCase = useCaseMatch?.[1]?.trim() ?? '';

  const stop = new Set(['for', 'with', 'and', 'the', 'size', 'pack', 'of', 'in', 'by']);
  const keywords = Array.from(
    new Set(
      clean
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !stop.has(w)),
    ),
  ).slice(0, 6);

  const hardFacts: string[] = [];
  if (material) hardFacts.push(`Made with ${material}`);
  if (sizeOrQuantity) hardFacts.push(`Spec / Size: ${sizeOrQuantity}`);

  return {
    productName: clean || 'New Product',
    brand: '',
    category,
    material,
    sizeOrQuantity,
    audienceOrUseCase,
    hardFacts,
    keywords,
  };
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Generates an exact marketplace-ready bulk upload CSV (Shopify, Etsy, Amazon, Flipkart/Meesho)
 * so sellers can upload directly without re-mapping columns.
 */
export function buildMarketplaceUploadCsv(listing: MarketplaceListingOutput): {
  filename: string;
  mime: string;
  content: string;
  formatLabel: string;
} {
  if (listing.marketplace === 'shopify') {
    const handle = listing.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const headers = [
      'Handle', 'Title', 'Body (HTML)', 'Type', 'Tags', 'Published',
      'Variant SKU', 'SEO Title', 'SEO Description', 'Image Alt Text', 'Status',
    ];
    const htmlBody = `<p>${listing.shortDescription}</p><ul>${listing.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`;
    const row = [
      handle,
      listing.title,
      htmlBody,
      listing.categorySuggestion,
      listing.tags.join(', '),
      'FALSE',
      listing.sku,
      listing.seoMeta.seoTitle,
      listing.seoMeta.metaDescription,
      listing.altTextSuggestions[0] ?? listing.title,
      'draft',
    ];
    return {
      filename: `shopify-import-${listing.sku}.csv`,
      mime: 'text/csv;charset=utf-8',
      content: [headers.map(csvCell).join(','), row.map(csvCell).join(',')].join('\n'),
      formatLabel: 'Shopify Official Product CSV',
    };
  }

  if (listing.marketplace === 'amazon') {
    const headers = [
      'item_sku', 'item_name', 'product_description',
      'bullet_point1', 'bullet_point2', 'bullet_point3', 'bullet_point4', 'bullet_point5',
      'generic_keywords',
    ];
    const row = [
      listing.sku,
      listing.title,
      listing.longDescription,
      listing.bullets[0] ?? '',
      listing.bullets[1] ?? '',
      listing.bullets[2] ?? '',
      listing.bullets[3] ?? '',
      listing.bullets[4] ?? '',
      listing.searchTerms,
    ];
    return {
      filename: `amazon-flatfile-${listing.sku}.csv`,
      mime: 'text/csv;charset=utf-8',
      content: [headers.map(csvCell).join(','), row.map(csvCell).join(',')].join('\n'),
      formatLabel: 'Amazon Seller Central Flat-File CSV',
    };
  }

  if (listing.marketplace === 'etsy') {
    const headers = ['TITLE', 'DESCRIPTION', 'SKU', 'TAGS', 'CATEGORY'];
    const row = [
      listing.title,
      listing.longDescription,
      listing.sku,
      listing.tags.join(','),
      listing.categorySuggestion,
    ];
    return {
      filename: `etsy-draft-${listing.sku}.csv`,
      mime: 'text/csv;charset=utf-8',
      content: [headers.map(csvCell).join(','), row.map(csvCell).join(',')].join('\n'),
      formatLabel: 'Etsy Listing CSV',
    };
  }

  // Flipkart / Meesho / eBay / Walmart / Shopee structured upload sheet
  const headers = [
    'Seller SKU ID', 'Product Title', 'Short Description', 'Key Highlights',
    'Detailed Description', 'Search Keywords', 'Category',
  ];
  const row = [
    listing.sku,
    listing.title,
    listing.shortDescription,
    listing.bullets.join(' | '),
    listing.longDescription,
    listing.tags.join(', '),
    listing.categorySuggestion,
  ];
  return {
    filename: `${listing.marketplace}-catalog-${listing.sku}.csv`,
    mime: 'text/csv;charset=utf-8',
    content: [headers.map(csvCell).join(','), row.map(csvCell).join(',')].join('\n'),
    formatLabel: `${listing.marketplaceName} Catalog CSV`,
  };
}

export interface AutoFillPayload {
  version: '1.0';
  marketplace: string;
  marketplaceName: string;
  sku: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  bullets: string[];
  tags: string[];
  searchTerms: string;
  seoTitle: string;
  metaDescription: string;
  syncedAt: string;
}

export function createAutoFillPayload(listing: MarketplaceListingOutput): AutoFillPayload {
  return {
    version: '1.0',
    marketplace: listing.marketplace,
    marketplaceName: listing.marketplaceName,
    sku: listing.sku,
    title: listing.title,
    shortDescription: listing.shortDescription,
    longDescription: listing.longDescription,
    bullets: listing.bullets,
    tags: listing.tags,
    searchTerms: listing.searchTerms,
    seoTitle: listing.seoMeta.seoTitle,
    metaDescription: listing.seoMeta.metaDescription,
    syncedAt: new Date().toISOString(),
  };
}
