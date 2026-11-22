import amazonRaw from '../data/amazon.json';
import ebayRaw from '../data/ebay.json';
import etsyRaw from '../data/etsy.json';
import flipkartRaw from '../data/flipkart.json';
import meeshoRaw from '../data/meesho.json';
import shopeeRaw from '../data/shopee.json';
import shopifyRaw from '../data/shopify.json';
import walmartRaw from '../data/walmart.json';
import {
  MarketplaceSkillSchema,
  type FieldRule,
  type MarketplaceId,
  type MarketplaceSkill,
} from './schema.js';

export { MarketplaceSkillSchema, type FieldRule, type MarketplaceId, type MarketplaceSkill };

const RAW_SKILLS = [
  amazonRaw,
  etsyRaw,
  ebayRaw,
  shopifyRaw,
  walmartRaw,
  flipkartRaw,
  meeshoRaw,
  shopeeRaw,
];

const parsedSkills: readonly MarketplaceSkill[] = RAW_SKILLS.map((raw) =>
  MarketplaceSkillSchema.parse(raw),
);

const SKILL_MAP = new Map<MarketplaceId, MarketplaceSkill>(
  parsedSkills.map((skill) => [skill.marketplace, skill]),
);

export const LAUNCH_MARKETPLACES: readonly MarketplaceId[] = parsedSkills.map(
  (s) => s.marketplace,
);

export function getAllMarketplaceSkills(): readonly MarketplaceSkill[] {
  return parsedSkills;
}

export function getMarketplaceSkill(id: string): MarketplaceSkill | undefined {
  return SKILL_MAP.get(id.toLowerCase() as MarketplaceId);
}

export function requireMarketplaceSkill(id: string): MarketplaceSkill {
  const skill = getMarketplaceSkill(id);
  if (!skill) {
    throw new Error(
      `Unknown marketplace "${id}". Supported: ${LAUNCH_MARKETPLACES.join(', ')}`,
    );
  }
  return skill;
}
