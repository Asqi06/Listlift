import { z } from 'zod';
import { requireMarketplaceSkill } from '@listlift/skills';
import { MarketplaceIdSchema } from './schemas.js';
import { charLength } from './validator.js';

export const DescriptionGenerateRequestSchema = z.object({
  marketplace: MarketplaceIdSchema,
  productName: z.string().trim().min(2).max(200),
  brand: z.string().trim().max(60).optional().default(''),
  material: z.string().trim().max(100).optional().default(''),
  sizeOrQuantity: z.string().trim().max(80).optional().default(''),
  audienceOrUseCase: z.string().trim().max(100).optional().default(''),
  keyFeatures: z.array(z.string().trim().min(1).max(160)).max(10).optional().default([]),
  tone: z.enum(['neutral', 'premium', 'playful']).optional().default('neutral'),
});

export type DescriptionGenerateRequest = z.infer<typeof DescriptionGenerateRequestSchema>;

export interface DescriptionGenerateResult {
  marketplace: string;
  marketplaceName: string;
  shortDescription: string;
  longDescription: string;
  bullets: string[];
  bulletLimit?: number;
  bulletMaxChars?: number;
}

function trimToMax(text: string, max: number): string {
  const chars = Array.from(text.trim());
  if (chars.length <= max) return text.trim();
  return `${chars.slice(0, Math.max(0, max - 1)).join('').trimEnd()}…`;
}

export function generateDescriptionAndBullets(
  req: DescriptionGenerateRequest,
): DescriptionGenerateResult {
  const skill = requireMarketplaceSkill(req.marketplace);
  const bulletCountMax = skill.fields.bullets?.count_max ?? 5;
  const bulletEachMax = skill.fields.bullets?.each_max ?? 240;
  const descMax = skill.fields.description.max ?? 2000;

  const brandPrefix = req.brand ? `${req.brand} ` : '';
  const materialPhrase = req.material ? `crafted from ${req.material}` : 'built for dependable everyday use';
  const sizePhrase = req.sizeOrQuantity ? ` (${req.sizeOrQuantity})` : '';
  const usePhrase = req.audienceOrUseCase ? ` for ${req.audienceOrUseCase}` : '';

  const toneLead =
    req.tone === 'premium'
      ? `Refined, purposeful design meets daily reliability in the ${brandPrefix}${req.productName}${sizePhrase}.`
      : req.tone === 'playful'
        ? `Meet your new favorite upgrade: the ${brandPrefix}${req.productName}${sizePhrase}, ready${usePhrase || ' whenever you are'}.`
        : `The ${brandPrefix}${req.productName}${sizePhrase} is ${materialPhrase}, designed${usePhrase || ' for practical daily performance'}.`;

  const shortDescription = trimToMax(
    `${toneLead} Includes clear specifications and straightforward care so you know exactly what arrives.`,
    220,
  );

  const rawBullets: string[] = [];
  for (const feat of req.keyFeatures) {
    rawBullets.push(trimToMax(feat, bulletEachMax));
  }
  if (req.material && rawBullets.length < bulletCountMax) {
    rawBullets.push(
      trimToMax(`Verified Material: Made with ${req.material} for consistent feel and durability.`, bulletEachMax),
    );
  }
  if (req.sizeOrQuantity && rawBullets.length < bulletCountMax) {
    rawBullets.push(
      trimToMax(`Exact Sizing & Pack: Supplied as ${req.sizeOrQuantity} — verify dimensions before ordering.`, bulletEachMax),
    );
  }
  if (req.audienceOrUseCase && rawBullets.length < bulletCountMax) {
    rawBullets.push(
      trimToMax(`Ideal Fit: Tailored specifically for ${req.audienceOrUseCase}.`, bulletEachMax),
    );
  }
  if (rawBullets.length < Math.min(5, bulletCountMax)) {
    rawBullets.push(
      trimToMax(`Ready to Use: Cleanly packed and checked for consistent quality out of the box.`, bulletEachMax),
    );
  }
  if (rawBullets.length < Math.min(5, bulletCountMax)) {
    rawBullets.push(
      trimToMax(`Straightforward Care: Easy to maintain so it stays looking sharp through repeat use.`, bulletEachMax),
    );
  }

  const bullets = rawBullets.slice(0, bulletCountMax);

  const specLines = [
    req.brand ? `Brand: ${req.brand}` : '',
    req.material ? `Material / Spec: ${req.material}` : '',
    req.sizeOrQuantity ? `Size / Pack Count: ${req.sizeOrQuantity}` : '',
    req.audienceOrUseCase ? `Recommended Use: ${req.audienceOrUseCase}` : '',
  ].filter(Boolean);

  const longRaw = [
    toneLead,
    '',
    'Key Highlights:',
    ...bullets.map((b) => `• ${b}`),
    ...(specLines.length > 0 ? ['', 'Specifications:', ...specLines] : []),
    '',
    `Note: Please review measurements and material details above to ensure the right match for your needs.`,
  ].join('\n');

  const longDescription = charLength(longRaw) > descMax ? trimToMax(longRaw, descMax) : longRaw;

  return {
    marketplace: skill.marketplace,
    marketplaceName: skill.display_name,
    shortDescription,
    longDescription,
    bullets,
    bulletLimit: skill.fields.bullets?.count_max,
    bulletMaxChars: skill.fields.bullets?.each_max,
  };
}
