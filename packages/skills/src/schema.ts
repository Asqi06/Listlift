import { z } from 'zod';

export const FieldRuleSchema = z.object({
  label: z.string().min(1),
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().positive().optional(),
  max_bytes: z.number().int().positive().optional(),
  recommended_max: z.number().int().positive().optional(),
  count_max: z.number().int().positive().optional(),
  each_max: z.number().int().positive().optional(),
  required: z.boolean().default(false),
  notes: z.string().optional(),
});

export type FieldRule = z.infer<typeof FieldRuleSchema>;

export const MarketplaceSkillSchema = z.object({
  marketplace: z.enum([
    'amazon',
    'etsy',
    'ebay',
    'shopify',
    'walmart',
    'flipkart',
    'meesho',
    'shopee',
    'custom',
  ]),
  display_name: z.string().min(1),
  region: z.string().min(1),
  version: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verification_status: z.enum(['verified', 'needs_official_verify']),
  source_docs: z.array(z.string().url()).min(1),
  fields: z.object({
    title: FieldRuleSchema,
    description: FieldRuleSchema,
    bullets: FieldRuleSchema.optional(),
    tags: FieldRuleSchema.optional(),
    search_terms: FieldRuleSchema.optional(),
    seo_title: FieldRuleSchema.optional(),
    meta_description: FieldRuleSchema.optional(),
  }),
  banned_patterns: z.array(z.string()),
  style_notes: z.string().min(1),
  export_template: z.string().min(1),
});

export type MarketplaceSkill = z.infer<typeof MarketplaceSkillSchema>;
export type MarketplaceId = MarketplaceSkill['marketplace'];
