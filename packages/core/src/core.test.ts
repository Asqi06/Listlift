import { describe, expect, it } from 'vitest';
import {
  generateSkus,
  generateTitleOptions,
  scoreListing,
  utf8ByteLength,
  charLength,
} from './index.js';

describe('@listlift/core', () => {
  describe('Unicode & byte-length accounting', () => {
    it('distinguishes character count from UTF-8 byte count for Devanagari & emoji', () => {
      const hindi = 'कपास कुर्ती';
      expect(charLength(hindi)).toBe(11);
      expect(utf8ByteLength(hindi)).toBeGreaterThan(charLength(hindi));
    });

    it('flags Amazon backend search terms exceeding 250 UTF-8 bytes even if under 250 chars', () => {
      const longDevanagari = 'कपास '.repeat(35); // ~175 chars, > 250 UTF-8 bytes
      const res = scoreListing({
        marketplace: 'amazon',
        title: 'Handcrafted Cotton Kurta for Women Daily Wear Blue Medium',
        description:
          'Breathable pure cotton kurta tailored for everyday comfort with neat stitching and easy wash care. Ideal for office, college, and festive wear.',
        bullets: ['100% breathable cotton fabric', 'Pre-shrunk for consistent fit'],
        tags: [],
        search_terms: longDevanagari,
        seo_title: '',
        meta_description: '',
        target_keywords: [],
      });
      const searchCheck = res.fields.find((f) => f.field === 'search_terms');
      expect(searchCheck?.status).toBe('fail');
      expect(searchCheck?.bytes).toBeGreaterThan(250);
    });
  });

  describe('Listing Score Linter', () => {
    it('gives a high score to a well-formed Etsy listing', () => {
      const res = scoreListing({
        marketplace: 'etsy',
        title: 'Soy Wax Lavender Scented Candle Handmade 8oz Amber Glass Jar Gift',
        description:
          'Hand-poured 8oz soy wax candle infused with natural French lavender essential oil. Burns cleanly for up to 45 hours inside a reusable amber glass jar with cotton wick.',
        bullets: [],
        tags: [
          'soy wax candle',
          'lavender candle',
          'handmade gift',
          'amber jar candle',
          'relaxing scent',
          'home decor gift',
          'natural soy wax',
          'aromatherapy jar',
          'self care gift',
          'housewarming gift',
          'hand poured',
          'cotton wick',
          'gift for her',
        ],
        search_terms: '',
        seo_title: '',
        meta_description: '',
        target_keywords: ['soy wax', 'lavender', 'amber glass'],
      });
      expect(res.score).toBeGreaterThanOrEqual(90);
      expect(res.grade).toBe('A');
      expect(res.bannedMatches).toHaveLength(0);
    });

    it('penalizes prohibited/banned phrases and over-limit eBay titles', () => {
      const res = scoreListing({
        marketplace: 'ebay',
        title:
          'LOOK! GUARANTEED #1 BEST SELLER VINTAGE LEATHER JACKET MEN SIZE LARGE EXTRA LONG TITLE OVER EIGHTY CHARS',
        description: 'Short desc',
        bullets: [],
        tags: [],
        search_terms: '',
        seo_title: '',
        meta_description: '',
        target_keywords: [],
      });
      expect(res.score).toBeLessThan(60);
      expect(res.bannedMatches).toContain('guaranteed #1');
      const titleField = res.fields.find((f) => f.field === 'title');
      expect(titleField?.status).toBe('fail');
    });
  });

  describe('SKU Generator', () => {
    it('generates clean uppercase SKUs and detects duplicates when sequence is off', () => {
      const res = generateSkus({
        brand: 'ListLift!',
        separator: '-',
        includeSequence: false,
        startSequence: 1,
        uppercase: true,
        items: [
          { category: 'Candles', product: 'Lavender Soy', variant: 'Jar', size: '8oz', color: 'Amber' },
          { category: 'Candles', product: 'Lavender Soy', variant: 'Jar', size: '8oz', color: 'Amber' },
        ],
      });
      expect(res.rows).toHaveLength(2);
      expect(res.rows[0]?.sku).toBe('LIST-CAN-LAVE-JAR-AMB-8OZ');
      expect(res.rows[0]?.isDuplicate).toBe(false);
      expect(res.rows[1]?.isDuplicate).toBe(true);
      expect(res.duplicateCount).toBe(1);
    });
  });

  describe('Title Generator', () => {
    it('returns 5 title options all strictly within marketplace limits', () => {
      const res = generateTitleOptions({
        marketplace: 'ebay',
        productName: 'Insulated Stainless Steel Water Bottle',
        brand: 'PeakSip',
        material: '304 Stainless Steel',
        sizeOrQuantity: '1L',
        audienceOrUseCase: 'Hiking Travel',
        keywords: ['leakproof', 'vacuum flask', 'bpa free'],
        tone: 'neutral',
      });
      expect(res.limit).toBe(80);
      expect(res.options).toHaveLength(5);
      for (const opt of res.options) {
        expect(opt.length).toBeLessThanOrEqual(80);
        expect(opt.status).not.toBe('fail');
      }
    });
  });
});
