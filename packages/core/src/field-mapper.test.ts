import { describe, expect, it } from 'vitest';
import {
  createAutoFillPayload,
  generateStudioListings,
  mapFormFieldsSemantically,
} from './index.js';

describe('Universal Semantic Field Mapper', () => {
  const sampleListing = generateStudioListings({
    productName: 'Handloom Cotton Kurta',
    brand: 'KalaVastra',
    category: 'Apparel & Ethnic Wear',
    material: '100% Pure Cotton',
    sizeOrQuantity: 'Size M',
    audienceOrUseCase: 'Office Wear',
    hardFacts: ['Pre-shrunk cotton', 'Side pocket included'],
    keywords: ['cotton kurta', 'handloom', 'office wear'],
    competitorUrls: [],
    imageNotes: '',
    marketplaces: ['shopify'],
    language: 'en',
    tone: 'neutral',
  }).listings[0]!;

  const payload = createAutoFillPayload(sampleListing);

  it('auto-discovers non-standard custom website fields without hardcoded selectors', () => {
    const weirdCustomForm = [
      { id: 'f1', tagName: 'input' as const, inputType: 'text', name: 'fld_prod_heading', labelText: 'Item Heading / Product Name' },
      { id: 'f2', tagName: 'input' as const, inputType: 'text', name: 'item_code_ref', placeholder: 'Enter Seller SKU or Style Code' },
      { id: 'f3', tagName: 'textarea' as const, name: 'brief_intro', labelText: 'Short Summary' },
      { id: 'f4', tagName: 'contenteditable' as const, ariaLabel: 'Full Product Description' },
      { id: 'f5', tagName: 'input' as const, inputType: 'text', name: 'meta_t', labelText: 'SEO Title' },
      { id: 'f6', tagName: 'textarea' as const, name: 'meta_d', labelText: 'SEO Meta Description' },
      { id: 'f7', tagName: 'input' as const, inputType: 'password', name: 'admin_pass', labelText: 'Password' },
      { id: 'f8', tagName: 'input' as const, inputType: 'search', name: 'q', placeholder: 'Search catalog' },
    ];

    const matches = mapFormFieldsSemantically(weirdCustomForm, payload);
    const byId = new Map(matches.map((m) => [m.fieldId, m.slot]));

    expect(byId.get('f1')).toBe('title');
    expect(byId.get('f2')).toBe('sku');
    expect(byId.get('f3')).toBe('shortDescription');
    expect(byId.get('f4')).toBe('longDescription');
    expect(byId.get('f5')).toBe('seoTitle');
    expect(byId.get('f6')).toBe('metaDescription');
    // Must NEVER touch password or search inputs
    expect(byId.has('f7')).toBe(false);
    expect(byId.has('f8')).toBe(false);
  });

  it('prioritizes explicit data-listlift attributes with 1.0 confidence', () => {
    const matches = mapFormFieldsSemantically(
      [{ id: 'x1', tagName: 'input', inputType: 'text', name: 'xyz_99', explicitHint: 'sku' }],
      payload,
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.slot).toBe('sku');
    expect(matches[0]?.confidence).toBe(1);
  });
});
