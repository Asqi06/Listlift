import { describe, expect, it } from 'vitest';
import {
  LAUNCH_MARKETPLACES,
  getAllMarketplaceSkills,
  getMarketplaceSkill,
  requireMarketplaceSkill,
} from './index.js';

describe('@listlift/skills', () => {
  it('loads and validates all 8 launch marketplaces', () => {
    const skills = getAllMarketplaceSkills();
    expect(skills).toHaveLength(8);
    expect(LAUNCH_MARKETPLACES).toEqual([
      'amazon',
      'etsy',
      'ebay',
      'shopify',
      'walmart',
      'flipkart',
      'meesho',
      'shopee',
    ]);
  });

  it('exposes exact PRD-sourced starting limits without hardcoding in consumers', () => {
    const etsy = requireMarketplaceSkill('etsy');
    expect(etsy.fields.title.max).toBe(140);
    expect(etsy.fields.tags?.count_max).toBe(13);
    expect(etsy.fields.tags?.each_max).toBe(20);

    const amazon = requireMarketplaceSkill('amazon');
    expect(amazon.fields.title.max).toBe(200);
    expect(amazon.fields.search_terms?.max_bytes).toBe(250);

    const ebay = requireMarketplaceSkill('ebay');
    expect(ebay.fields.title.max).toBe(80);

    const shopify = requireMarketplaceSkill('shopify');
    expect(shopify.fields.seo_title?.recommended_max).toBe(60);
    expect(shopify.fields.meta_description?.max).toBe(160);
  });

  it('handles case-insensitive lookups and rejects unknown marketplaces', () => {
    expect(getMarketplaceSkill('ETSY')?.marketplace).toBe('etsy');
    expect(getMarketplaceSkill('unknown')).toBeUndefined();
    expect(() => requireMarketplaceSkill('unknown')).toThrow(/Unknown marketplace/);
  });
});
