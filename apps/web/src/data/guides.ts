export interface SellerGuide {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  updatedAt: string;
  relatedToolHref: string;
  relatedToolLabel: string;
  sections: Array<{ heading: string; body: string }>;
}

export const SELLER_GUIDES: SellerGuide[] = [
  {
    slug: 'etsy-13-tags-and-title-playbook',
    title: 'Etsy 13-Tag & 140-Character Title Playbook',
    description: 'How to fill every Etsy tag slot (≤20 chars each) with distinct multi-word buyer phrases and avoid repeating words across your title.',
    category: 'Etsy SEO',
    readTime: '4 min read',
    updatedAt: '2026-11-22',
    relatedToolHref: '/tools/tags-generator',
    relatedToolLabel: 'Open Tags Generator',
    sections: [
      {
        heading: 'Use all 13 tag slots with multi-word phrases',
        body: 'Etsy allows up to 13 tags of 20 characters each. Leaving 4 or 5 slots blank cuts your surface area in buyer search. Prefer natural 2–3 word phrases like "soy wax candle" over single broad nouns like "candle".',
      },
      {
        heading: 'Front-load the first 40 characters of your title',
        body: 'Mobile shoppers see roughly the first 40–55 characters in Etsy search cards. Put the exact product noun, primary material, and defining attribute first so buyers understand the item immediately.',
      },
      {
        heading: 'Avoid repeating identical words across tags',
        body: 'Etsy matches across your title, tags, categories, and attributes. Repeating "gift" in six different tags wastes character budget that could cover occasion, recipient, or style synonyms.',
      },
    ],
  },
  {
    slug: 'amazon-utf8-byte-limits-backend-search-terms',
    title: 'Amazon Backend Search Terms: Why 250 Bytes ≠ 250 Characters',
    description: 'How UTF-8 byte counting works on Amazon Seller Central, why punctuation wastes space, and how to deduplicate search terms cleanly.',
    category: 'Amazon',
    readTime: '4 min read',
    updatedAt: '2026-11-22',
    relatedToolHref: '/tools/character-counter',
    relatedToolLabel: 'Check UTF-8 Bytes',
    sections: [
      {
        heading: 'Bytes vs characters in international catalogs',
        body: 'Standard ASCII letters take 1 byte each, but accented characters (é, ü) take 2 bytes and Devanagari or CJK characters take 3 bytes each. Exceeding 250 UTF-8 bytes can cause Amazon to ignore the entire backend search terms field.',
      },
      {
        heading: 'Space-separated words only — skip commas and brand names',
        body: 'Separate terms with a single space instead of commas or semicolons. Do not repeat words already in your title or include competitor trademarks.',
      },
    ],
  },
  {
    slug: 'ebay-80-character-title-formula',
    title: 'The eBay 80-Character Title Formula That Packs Real Buyer Specs',
    description: 'How to fit Brand, Model, Size, Colour, and Condition into eBay’s strict 80-character cap without filler symbols.',
    category: 'eBay',
    readTime: '3 min read',
    updatedAt: '2026-11-22',
    relatedToolHref: '/tools/title-generator',
    relatedToolLabel: 'Generate eBay Titles',
    sections: [
      {
        heading: 'Every character counts at 80 chars',
        body: 'Drop promotional fluff like "LOOK!", "WOW!", or "FAST SHIPPING". Buyers filter by concrete specs: Brand + Item + Model/MPN + Material + Size + Colour + Condition.',
      },
      {
        heading: 'Use numerals instead of spelled-out numbers',
        body: 'Write "3-Pack" or "12oz" instead of "Three Pack". Numerals save 3–5 characters per spec and match how shoppers type queries on mobile.',
      },
    ],
  },
  {
    slug: 'flipkart-meesho-india-seller-listing-guide',
    title: 'Listing on Flipkart & Meesho: Practical Rules for Indian Sellers',
    description: 'Mobile-first titles, fabric/material clarity, and prohibited claim rules for high-volume Indian ecommerce catalogs.',
    category: 'India Marketplaces',
    readTime: '5 min read',
    updatedAt: '2026-11-22',
    relatedToolHref: '/studio',
    relatedToolLabel: 'Open Listing Studio',
    sections: [
      {
        heading: 'Lead with fabric, pack count, and occasion',
        body: 'Indian marketplace shoppers scan primarily on budget Android screens. Clearly state Brand + Product Type + Fabric/Material + Colour + Pack Count so returns due to unmet expectations drop.',
      },
      {
        heading: 'Avoid policy-triggering claims',
        body: 'Skip phrases like "lowest price", "first copy", "replica", or "free delivery" in titles and descriptions. Keep specs factual and verifiable.',
      },
    ],
  },
  {
    slug: 'sku-naming-system-for-multi-channel-sellers',
    title: 'How to Design a Clean SKU Naming System Across Multiple Marketplaces',
    description: 'Build human-readable, duplicate-free SKUs using Brand, Category, Product, Color, Size, and Sequence codes.',
    category: 'Operations',
    readTime: '3 min read',
    updatedAt: '2026-11-22',
    relatedToolHref: '/tools/sku-generator',
    relatedToolLabel: 'Open SKU Generator',
    sections: [
      {
        heading: 'Keep SKUs human-readable and uppercase',
        body: 'Use a predictable structure like BRAND-CAT-PROD-COL-SIZE-001 (e.g. SOLA-CAN-LAVE-AMB-8OZ-001). Avoid ambiguous characters like O/0 or I/1 when printing warehouse labels.',
      },
      {
        heading: 'Never reuse a retired SKU',
        body: 'Always run a duplicate check before importing a batch CSV into Shopify, Amazon, or Flipkart so historical sales and inventory reports never collide.',
      },
    ],
  },
  {
    slug: 'claim-safe-product-copy-avoid-suppression',
    title: 'Claim-Safe Product Copy: How to Prevent Suppressed Listings',
    description: 'Why ungrounded AI claims trigger marketplace takedowns and how a simple fact-grounding checklist protects your seller account.',
    category: 'Compliance',
    readTime: '4 min read',
    updatedAt: '2026-11-22',
    relatedToolHref: '/tools/listing-score',
    relatedToolLabel: 'Score Your Listing',
    sections: [
      {
        heading: 'Separate hard facts from persuasive framing',
        body: 'Never let a copy tool invent certifications ("FDA approved", "100% organic"), warranties, or medical benefits ("cures insomnia"). Lock your verified specs first and audit every sentence against them.',
      },
      {
        heading: 'Run a pre-upload linter check',
        body: 'Before uploading to Seller Central or Etsy, run your draft through a rule linter to catch banned phrases, ALL CAPS titles, and over-limit fields in seconds.',
      },
    ],
  },
];
