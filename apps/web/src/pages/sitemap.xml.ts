import type { APIRoute } from 'astro';
import { getAllMarketplaceSkills } from '@listlift/skills';
import { SELLER_GUIDES } from '../data/guides';

export const GET: APIRoute = ({ site }) => {
  const origin = (site?.toString() ?? 'https://listlift.com').replace(/\/$/, '');
  const staticRoutes = [
    '/',
    '/studio',
    '/autofill',
    '/tools/',
    '/tools/title-generator',
    '/tools/description-generator',
    '/tools/tags-generator',
    '/tools/sku-generator',
    '/tools/listing-score',
    '/tools/competitor-compare',
    '/tools/character-counter',
    '/guides/',
    '/pricing',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/refunds',
  ];

  const marketplaceRoutes = getAllMarketplaceSkills().map(
    (s) => `/marketplaces/${s.marketplace}`,
  );
  const guideRoutes = SELLER_GUIDES.map((g) => `/guides/${g.slug}`);
  const all = [...staticRoutes, ...marketplaceRoutes, ...guideRoutes];
  const lastmod = '2026-11-22';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((path) => `  <url><loc>${origin}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
