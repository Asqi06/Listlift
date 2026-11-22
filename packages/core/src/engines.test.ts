import { describe, expect, it } from 'vitest';
import {
  buildMarketplaceUploadCsv,
  compareCompetitors,
  createAutoFillPayload,
  extractStructuredProductFromHtml,
  generateDescriptionAndBullets,
  generateStudioListings,
  generateTagsAndKeywords,
  parseQuickProductInput,
} from './index.js';

describe('@listlift/core M2-M4 engines', () => {
  it('generates description and bullets respecting Amazon limits', () => {
    const res = generateDescriptionAndBullets({
      marketplace: 'amazon',
      productName: 'Insulated Flask',
      brand: 'PeakSip',
      material: '304 Stainless Steel',
      sizeOrQuantity: '1000ml',
      audienceOrUseCase: 'Hiking',
      keyFeatures: ['Double-wall vacuum insulation keeps drinks cold 24h'],
      tone: 'premium',
    });
    expect(res.bullets.length).toBeGreaterThanOrEqual(4);
    expect(res.bullets.length).toBeLessThanOrEqual(5);
    expect(res.longDescription).toContain('304 Stainless Steel');
  });

  it('fills all 13 Etsy tag slots within 20 chars each without duplicates', () => {
    const res = generateTagsAndKeywords({
      marketplace: 'etsy',
      productName: 'Soy Wax Lavender Candle',
      category: 'Home Decor',
      material: 'Natural Soy Wax',
      audienceOrUseCase: 'Self Care',
      seedKeywords: ['soy candle', 'lavender gift', 'amber jar'],
    });
    expect(res.countMax).toBe(13);
    expect(res.tags.length).toBe(13);
    const unique = new Set(res.tags.map((t) => t.tag));
    expect(unique.size).toBe(13);
    for (const tag of res.tags) {
      expect(tag.length).toBeLessThanOrEqual(20);
      expect(tag.status).toBe('pass');
    }
  });

  it('compares competitors and computes price band + keyword gaps', () => {
    const res = compareCompetitors({
      yourTitle: 'Cotton Kurta',
      yourKeywords: ['cotton'],
      competitors: [
        { source: 'comp-1', title: 'Breathable Pure Cotton Kurta Ethnic Festive Wear', price: 20, currency: 'USD', description: '' },
        { source: 'comp-2', title: 'Handloom Cotton Kurta Festive Office Wear', price: 30, currency: 'USD', description: '' },
        { source: 'comp-3', title: 'Festive Cotton Kurta Women Daily Wear', price: 25, currency: 'USD', description: '' },
      ],
    });
    expect(res.priceBand).toEqual({ min: 20, median: 25, max: 30, currency: 'USD', sampleSize: 3 });
    expect(res.keywordGaps).toContain('festive');
  });

  it('extracts schema.org Product JSON-LD safely from HTML', () => {
    const html = `<html><head><script type="application/ld+json">{"@type":"Product","name":"Ceramic Pour-Over Dripper","offers":{"price":"28.50","priceCurrency":"USD"}}</script></head></html>`;
    const parsed = extractStructuredProductFromHtml(html, 'https://example.com/p/dripper');
    expect(parsed?.title).toBe('Ceramic Pour-Over Dripper');
    expect(parsed?.price).toBe(28.5);
  });

  it('generates multi-marketplace Listing Studio pack with evidence, claims audit, and exports', () => {
    const res = generateStudioListings({
      productName: 'Soy Wax Lavender Candle',
      brand: 'Solace Home',
      category: 'Candles',
      material: 'Natural Soy Wax',
      sizeOrQuantity: '8oz Amber Jar',
      audienceOrUseCase: 'Relaxing Gift',
      hardFacts: ['45-hour burn time', 'Braided cotton wick'],
      keywords: ['lavender', 'soy wax', 'amber jar'],
      competitorUrls: [],
      imageNotes: '',
      marketplaces: ['etsy', 'amazon', 'ebay', 'shopify'],
      language: 'en',
      tone: 'neutral',
    });
    expect(res.listings).toHaveLength(4);
    expect(res.evidence.sources.length).toBeGreaterThanOrEqual(2);
    for (const item of res.listings) {
      expect(item.score.score).toBeGreaterThanOrEqual(70);
      expect(item.exportCsv).toContain(item.sku);
      expect(item.uploadGuide.length).toBeGreaterThan(0);
    }
  });

  it('parses 1-line quick product input and builds exact marketplace upload CSV + autofill payload', () => {
    const parsed = parseQuickProductInput('Handloom cotton kurta blue size M pack of 1 for office');
    expect(parsed.category).toBe('Apparel & Ethnic Wear');
    expect(parsed.material).toContain('cotton');
    expect(parsed.sizeOrQuantity.toLowerCase()).toContain('size m');

    const studio = generateStudioListings({
      productName: parsed.productName,
      brand: 'KalaVastra',
      category: parsed.category,
      material: parsed.material,
      sizeOrQuantity: parsed.sizeOrQuantity,
      audienceOrUseCase: parsed.audienceOrUseCase,
      hardFacts: parsed.hardFacts,
      keywords: parsed.keywords,
      competitorUrls: [],
      imageNotes: '',
      marketplaces: ['shopify', 'amazon'],
      language: 'en',
      tone: 'neutral',
    });

    const shopifyCsv = buildMarketplaceUploadCsv(studio.listings[0]!);
    expect(shopifyCsv.content).toContain('"Handle","Title","Body (HTML)"');

    const amazonCsv = buildMarketplaceUploadCsv(studio.listings[1]!);
    expect(amazonCsv.content).toContain('"item_sku","item_name","product_description"');

    const payload = createAutoFillPayload(studio.listings[0]!);
    expect(payload.version).toBe('1.0');
    expect(payload.sku).toBe(studio.listings[0]!.sku);
  });
});
