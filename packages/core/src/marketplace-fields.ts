import type { MarketplaceListingOutput } from './studio.js';

export interface MarketplacePortalField {
  key: string;
  label: string;
  value: string;
  required: boolean;
  hint?: string;
}

function findAttr(listing: MarketplaceListingOutput, pattern: RegExp, fallback = 'Verify before publishing'): string {
  const hit = listing.attributes.find((a) => pattern.test(a.key));
  return hit?.value?.trim() || fallback;
}

function toUrlHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 72);
}

/**
 * Returns the exact seller-portal fields tailored to each marketplace
 * (e.g. Flipkart's rich multi-field catalog vs Meesho's compact fields vs Etsy's 13-tag discovery fields).
 */
export function buildMarketplacePortalFields(
  listing: MarketplaceListingOutput,
  opts?: { imageAnalysis?: string | null },
): MarketplacePortalField[] {
  const material = findAttr(listing, /material|metal|fabric/i);
  const color = findAttr(listing, /color|colour|finish|tone/i, opts?.imageAnalysis ? 'Match photo finish' : 'Verify color');
  const size = findAttr(listing, /size|dimension|quantity|pack|weight/i, 'Standard / Pack of 1');
  const brand = findAttr(listing, /brand/i, 'Generic / Your Brand');
  const category = findAttr(listing, /category|product type|item type/i, 'General');
  const style = findAttr(listing, /style|occasion|pattern|design/i, 'Everyday / Gift-ready');

  switch (listing.marketplace) {
    case 'flipkart':
      return [
        { key: 'title', label: 'Product Title', value: listing.title, required: true, hint: 'Flipkart Catalog Title' },
        { key: 'brand', label: 'Brand', value: brand, required: true, hint: 'Registered brand or Generic' },
        { key: 'style_code', label: 'Style / Model Code (SKU)', value: listing.sku, required: true, hint: 'Unique seller SKU' },
        { key: 'color', label: 'Color / Finish', value: color, required: true, hint: 'Primary visible color' },
        { key: 'material', label: 'Primary Material', value: material, required: true, hint: 'Must match physical item' },
        { key: 'pack_of', label: 'Pack Of / Net Quantity', value: size, required: true, hint: 'Units inside one box' },
        { key: 'ideal_for', label: 'Ideal For / Occasion', value: style, required: false, hint: 'Buyer filter attribute' },
        {
          key: 'highlights',
          label: `Key Highlights (${listing.bullets.length})`,
          value: listing.bullets.map((b) => `• ${b}`).join('\n'),
          required: true,
          hint: 'Bullet points shown near price',
        },
        {
          key: 'search_keywords',
          label: 'Search Keywords (Top 5)',
          value: listing.tags.slice(0, 5).join(', '),
          required: true,
          hint: 'Flipkart allows up to 5 high-intent keywords',
        },
        { key: 'description', label: 'Product Description', value: listing.longDescription, required: true },
        { key: 'country_of_origin', label: 'Country of Origin', value: 'Specify Country of Origin (verify before publishing)', required: true, hint: 'Mandatory catalog field' },
      ];

    case 'meesho':
      return [
        { key: 'product_name', label: 'Product Name', value: listing.title, required: true, hint: 'Keep concise & clear for mobile shoppers' },
        { key: 'category', label: 'Category', value: category, required: true },
        { key: 'color', label: 'Color', value: color, required: true },
        { key: 'material', label: 'Material / Base', value: material, required: true },
        { key: 'size', label: 'Size / Free Size', value: size, required: true, hint: 'Select Free Size if non-apparel' },
        { key: 'net_quantity', label: 'Net Quantity (N)', value: '1 (verify pack count)', required: true, hint: 'Mandatory Meesho field' },
        { key: 'description', label: 'Product Description', value: `${listing.shortDescription}\n\n${listing.bullets.map((b) => `• ${b}`).join('\n')}`, required: true, hint: 'Simple, mobile-friendly copy' },
        { key: 'country_of_origin', label: 'Country of Origin', value: 'Specify Country of Origin (verify before publishing)', required: true },
      ];

    case 'etsy':
      return [
        { key: 'title', label: 'Listing Title (≤140 chars)', value: listing.title, required: true, hint: 'Front-load buyer search phrase' },
        { key: 'tags', label: `13 Search Tags (${listing.tags.length}/13)`, value: listing.tags.slice(0, 13).join(', '), required: true, hint: 'Max 20 chars per tag' },
        { key: 'materials', label: 'Materials', value: material, required: false, hint: 'Helps Etsy filter matching' },
        { key: 'style_occasion', label: 'Style & Occasion', value: style, required: false, hint: 'Gift / Holiday / Everyday' },
        { key: 'description', label: 'Listing Description', value: `${listing.shortDescription}\n\n${listing.longDescription}`, required: true, hint: 'First 160 chars power Etsy SEO' },
        { key: 'seo_meta', label: 'SEO Meta Description', value: listing.seoMeta.metaDescription, required: false },
      ];

    case 'amazon':
      return [
        { key: 'title', label: 'Item Name / Title (≤200 chars)', value: listing.title, required: true, hint: 'Brand + Type + Key Spec + Finish' },
        { key: 'sku', label: 'Seller SKU', value: listing.sku, required: true },
        {
          key: 'bullets',
          label: `Key Product Features (${listing.bullets.length} Bullets)`,
          value: listing.bullets.map((b) => `• ${b}`).join('\n'),
          required: true,
          hint: 'Benefit-led, claim-safe bullets',
        },
        { key: 'search_terms', label: 'Backend Search Terms (≤250 bytes)', value: listing.searchTerms, required: true, hint: 'Space-separated, no commas or repeats' },
        { key: 'description', label: 'Product Description', value: listing.longDescription, required: true },
        { key: 'material_color', label: 'Material & Color', value: `${material} · ${color}`, required: true },
      ];

    case 'ebay':
      return [
        { key: 'title', label: 'Listing Title (≤80 chars)', value: listing.title, required: true, hint: 'Strict 80-char eBay limit' },
        { key: 'condition', label: 'Condition', value: 'New with tags / New in box (verify)', required: true },
        { key: 'item_specifics', label: 'Item Specifics', value: `Type: ${category} | Material: ${material} | Color: ${color} | Style: ${style}`, required: true, hint: 'Drives eBay left-hand filters' },
        { key: 'description', label: 'Item Description', value: `${listing.shortDescription}\n\n${listing.bullets.map((b) => `• ${b}`).join('\n')}\n\n${listing.longDescription}`, required: true },
      ];

    case 'shopify':
      return [
        { key: 'title', label: 'Product Title', value: listing.title, required: true },
        { key: 'short_hook', label: 'Above-the-Fold Hook', value: listing.shortDescription, required: false },
        { key: 'body_html', label: 'Product Description', value: `${listing.longDescription}\n\n${listing.bullets.map((b) => `• ${b}`).join('\n')}`, required: true },
        { key: 'product_type', label: 'Product Type & Vendor', value: `${category} · ${brand}`, required: false },
        { key: 'tags', label: 'Product Tags', value: listing.tags.join(', '), required: false, hint: 'Powers Shopify collections' },
        { key: 'handle', label: 'URL Handle', value: `/products/${toUrlHandle(listing.title)}`, required: true },
        { key: 'seo_title', label: 'Search Engine Title (≤60 chars)', value: listing.seoMeta.seoTitle, required: false },
        { key: 'meta_description', label: 'Meta Description (≤160 chars)', value: listing.seoMeta.metaDescription, required: false },
        { key: 'alt_text', label: 'Primary Image Alt-Text', value: listing.altTextSuggestions[0] ?? listing.title, required: false },
      ];

    case 'walmart':
      return [
        { key: 'product_name', label: 'Product Name (≤75 chars)', value: listing.title, required: true, hint: 'Concise Walmart naming rule' },
        { key: 'key_features', label: `Key Features (${listing.bullets.length})`, value: listing.bullets.map((b) => `• ${b}`).join('\n'), required: true },
        { key: 'short_description', label: 'Short Description', value: listing.shortDescription, required: true },
        { key: 'long_description', label: 'Site Description', value: listing.longDescription, required: true },
        { key: 'brand_specs', label: 'Brand / Color / Material', value: `${brand} · ${color} · ${material}`, required: true },
      ];

    case 'custom':
      return [
        { key: 'h1_title', label: 'Product H1 Title (≤70c ideal)', value: listing.title, required: true, hint: 'Works for WooCommerce, Webflow, Magento, Wix & custom stores' },
        { key: 'url_handle', label: 'Clean URL Slug', value: `/products/${toUrlHandle(listing.title)}`, required: true, hint: 'SEO-friendly URL path' },
        { key: 'short_hook', label: 'Short Summary / Excerpt', value: listing.shortDescription, required: true },
        { key: 'highlights', label: `Key Highlights (${listing.bullets.length})`, value: listing.bullets.map((b) => `• ${b}`).join('\n'), required: false },
        { key: 'description', label: 'Full Product Description', value: listing.longDescription, required: true },
        { key: 'seo_title', label: 'SEO Meta Title (≤60 chars)', value: listing.seoMeta.seoTitle, required: true, hint: 'Google Search title link' },
        { key: 'meta_description', label: 'SEO Meta Description (≤155 chars)', value: listing.seoMeta.metaDescription, required: true, hint: 'Google Search snippet' },
        { key: 'alt_text', label: 'Primary Image Alt-Text', value: listing.altTextSuggestions[0] ?? listing.title, required: false },
        { key: 'tags', label: 'Category / Collection Tags', value: listing.tags.join(', '), required: false },
        { key: 'specs', label: 'Material, Color & Pack Spec', value: `${material} · ${color} · ${size}`, required: false },
      ];

    case 'shopee':
    default:
      return [
        { key: 'product_name', label: 'Product Name (≤120 chars)', value: listing.title, required: true },
        { key: 'highlights', label: 'Key Highlights', value: listing.bullets.map((b) => `• ${b}`).join('\n'), required: true },
        { key: 'description', label: 'Product Description', value: listing.longDescription, required: true },
        { key: 'hashtags', label: 'Search Keywords / Hashtags', value: listing.tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' '), required: false },
        { key: 'specs', label: 'Material & Variation', value: `${material} · ${color} · ${size}`, required: true },
      ];
  }
}
