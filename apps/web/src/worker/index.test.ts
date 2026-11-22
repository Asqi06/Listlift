import { describe, expect, it } from 'vitest';
import { createApp } from './index.js';

describe('ListLift Hono Worker API', () => {
  const app = createApp();

  it('returns health status with 8 launch marketplaces', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; marketplaces: number };
    expect(body.ok).toBe(true);
    expect(body.marketplaces).toBe(8);
  });

  it('returns 404 for unknown marketplace skill', async () => {
    const res = await app.request('/api/v1/skills/nonexistent');
    expect(res.status).toBe(404);
  });

  it('validates /api/v1/score and returns 400 on invalid marketplace', async () => {
    const bad = await app.request('/api/v1/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketplace: 'fake-store', title: 'Test' }),
    });
    expect(bad.status).toBe(400);

    const good = await app.request('/api/v1/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketplace: 'etsy',
        title: 'Handmade Soy Lavender Candle 8oz Amber Jar Gift',
        description:
          'Hand-poured natural soy wax candle in an amber glass jar with pure French lavender essential oil. Burns cleanly for 45 hours.',
      }),
    });
    expect(good.status).toBe(200);
    const body = (await good.json()) as { score: number; marketplace: string };
    expect(body.marketplace).toBe('etsy');
    expect(body.score).toBeGreaterThan(0);
  });

  it('generates 5 rule-compliant titles via /api/v1/title', async () => {
    const res = await app.request('/api/v1/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketplace: 'amazon',
        productName: 'Bamboo Cutting Board Set',
        brand: 'ChefCraft',
        sizeOrQuantity: '3-Piece',
        keywords: ['kitchen', 'juice groove'],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { options: Array<{ length: number }>; limit: number };
    expect(body.options).toHaveLength(5);
    expect(body.limit).toBe(200);
  });

  it('generates batch SKUs via /api/v1/sku', async () => {
    const res = await app.request('/api/v1/sku', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: 'AURA',
        items: [{ category: 'Apparel', product: 'Cotton Tee', color: 'Black', size: 'L' }],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: Array<{ sku: string }> };
    expect(body.rows[0]?.sku).toContain('AURA');
  });

  it('generates full multi-marketplace studio pack via /api/v1/generate and creates a share link', async () => {
    const gen = await app.request('/api/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: 'Soy Wax Lavender Candle',
        brand: 'Solace',
        material: 'Soy Wax',
        sizeOrQuantity: '8oz',
        marketplaces: ['etsy', 'amazon'],
      }),
    });
    expect(gen.status).toBe(200);
    const genBody = (await gen.json()) as { listings: Array<{ marketplace: string }> };
    expect(genBody.listings).toHaveLength(2);

    const share = await app.request('/api/v1/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing: genBody.listings[0], expiry: '7d' }),
    });
    expect(share.status).toBe(200);
    const shareBody = (await share.json()) as { slug: string; noindex: boolean };
    expect(shareBody.noindex).toBe(true);

    const fetched = await app.request(`/api/v1/listings/${shareBody.slug}`);
    expect(fetched.status).toBe(200);
  });
});
