import { z } from 'zod';
import { MarketplaceSkillSchema } from '@listlift/skills';

export const MarketplaceIdSchema = MarketplaceSkillSchema.shape.marketplace;

export const ListingInputSchema = z.object({
  marketplace: MarketplaceIdSchema,
  title: z.string().default(''),
  description: z.string().default(''),
  bullets: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  search_terms: z.string().default(''),
  seo_title: z.string().default(''),
  meta_description: z.string().default(''),
  target_keywords: z.array(z.string()).default([]),
});

export type ListingInput = z.infer<typeof ListingInputSchema>;

export const TitleGenerateRequestSchema = z.object({
  marketplace: MarketplaceIdSchema,
  productName: z.string().trim().min(2, 'Enter a product name (at least 2 characters)').max(200),
  brand: z.string().trim().max(60).optional().default(''),
  material: z.string().trim().max(80).optional().default(''),
  sizeOrQuantity: z.string().trim().max(60).optional().default(''),
  audienceOrUseCase: z.string().trim().max(80).optional().default(''),
  keywords: z.array(z.string().trim().min(1).max(60)).max(15).optional().default([]),
  tone: z.enum(['neutral', 'premium', 'playful']).optional().default('neutral'),
});

export type TitleGenerateRequest = z.infer<typeof TitleGenerateRequestSchema>;

export const SkuBatchItemSchema = z.object({
  category: z.string().trim().min(1).max(60),
  product: z.string().trim().min(1).max(80),
  variant: z.string().trim().max(60).optional().default(''),
  size: z.string().trim().max(30).optional().default(''),
  color: z.string().trim().max(30).optional().default(''),
});

export const SkuGenerateRequestSchema = z.object({
  brand: z.string().trim().max(40).default('LL'),
  separator: z.enum(['-', '_', '']).default('-'),
  includeSequence: z.boolean().default(true),
  startSequence: z.number().int().min(1).max(99999).default(1),
  uppercase: z.boolean().default(true),
  items: z.array(SkuBatchItemSchema).min(1).max(500),
});

export type SkuGenerateRequest = z.infer<typeof SkuGenerateRequestSchema>;
