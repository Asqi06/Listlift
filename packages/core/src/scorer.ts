import { requireMarketplaceSkill } from '@listlift/skills';
import { type ListingInput } from './schemas.js';
import {
  findBannedPatterns,
  findRepeatedWords,
  validateListField,
  validateTextField,
  type FieldValidationResult,
} from './validator.js';

export interface ScoreIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion: string;
}

export interface ListingScoreResult {
  marketplace: string;
  marketplaceName: string;
  lastVerified: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  fields: FieldValidationResult[];
  issues: ScoreIssue[];
  bannedMatches: string[];
  repeatedTitleWords: string[];
  keywordCoverage: {
    matched: string[];
    missing: string[];
    percent: number;
  };
}

export function scoreListing(input: ListingInput): ListingScoreResult {
  const skill = requireMarketplaceSkill(input.marketplace);
  const fields: FieldValidationResult[] = [];
  const issues: ScoreIssue[] = [];

  fields.push(validateTextField('title', input.title, skill.fields.title));
  fields.push(validateTextField('description', input.description, skill.fields.description));

  if (skill.fields.bullets) {
    fields.push(validateListField('bullets', input.bullets, skill.fields.bullets));
  }
  if (skill.fields.tags) {
    fields.push(validateListField('tags', input.tags, skill.fields.tags));
  }
  if (skill.fields.search_terms) {
    fields.push(
      validateTextField('search_terms', input.search_terms, skill.fields.search_terms),
    );
  }
  if (skill.fields.seo_title) {
    fields.push(validateTextField('seo_title', input.seo_title, skill.fields.seo_title));
  }
  if (skill.fields.meta_description) {
    fields.push(
      validateTextField(
        'meta_description',
        input.meta_description,
        skill.fields.meta_description,
      ),
    );
  }

  let score = 100;

  for (const result of fields) {
    if (result.status === 'fail') {
      score -= 18;
      for (const msg of result.messages) {
        issues.push({
          severity: 'error',
          field: result.field,
          message: msg,
          suggestion: `Adjust ${result.label} to meet ${skill.display_name} rules.`,
        });
      }
    } else if (result.status === 'warn') {
      score -= 7;
      for (const msg of result.messages) {
        issues.push({
          severity: 'warning',
          field: result.field,
          message: msg,
          suggestion: `Refine ${result.label} for stronger readability and search fit.`,
        });
      }
    }
  }

  // Check unused tag slots (e.g. Etsy's 13 tags)
  if (skill.fields.tags?.count_max) {
    const tagCount = input.tags.filter((t) => t.trim().length > 0).length;
    if (tagCount < skill.fields.tags.count_max) {
      const missingSlots = skill.fields.tags.count_max - tagCount;
      score -= Math.min(10, missingSlots);
      issues.push({
        severity: 'info',
        field: 'tags',
        message: `${missingSlots} unused tag slot(s) (${tagCount}/${skill.fields.tags.count_max}).`,
        suggestion: `Fill all ${skill.fields.tags.count_max} slots with distinct multi-word search phrases.`,
      });
    }
  }

  const combinedText = [
    input.title,
    input.description,
    ...input.bullets,
    ...input.tags,
    input.search_terms,
    input.seo_title,
    input.meta_description,
  ].join(' ');

  const bannedMatches = findBannedPatterns(combinedText, skill);
  if (bannedMatches.length > 0) {
    score -= Math.min(25, bannedMatches.length * 10);
    issues.push({
      severity: 'error',
      field: 'compliance',
      message: `Risky or prohibited phrase(s) detected: ${bannedMatches.join(', ')}.`,
      suggestion: 'Remove promotional, unverified, or restricted claims to prevent suppression.',
    });
  }

  const repeatedTitleWords = findRepeatedWords(input.title);
  if (repeatedTitleWords.length > 0) {
    score -= Math.min(10, repeatedTitleWords.length * 4);
    issues.push({
      severity: 'warning',
      field: 'title',
      message: `Repeated title word(s): ${repeatedTitleWords.join(', ')}.`,
      suggestion: 'Avoid repeating the same word 3+ times; use unique descriptive terms instead.',
    });
  }

  if (input.title.trim().length > 10 && input.title === input.title.toUpperCase()) {
    score -= 8;
    issues.push({
      severity: 'warning',
      field: 'title',
      message: 'Title is in ALL CAPS.',
      suggestion: 'Use Title Case or natural sentence case to comply with marketplace guidelines.',
    });
  }

  const cleanedKeywords = input.target_keywords
    .map((k) => k.trim())
    .filter(Boolean);
  const lowerCombined = combinedText.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of cleanedKeywords) {
    if (lowerCombined.includes(kw.toLowerCase())) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }
  const percent =
    cleanedKeywords.length === 0
      ? 100
      : Math.round((matched.length / cleanedKeywords.length) * 100);

  if (cleanedKeywords.length > 0 && percent < 70) {
    score -= 8;
    issues.push({
      severity: 'info',
      field: 'keywords',
      message: `Only ${percent}% of target keywords appear in your listing.`,
      suggestion: `Work missing terms into title, bullets, or tags: ${missing.slice(0, 5).join(', ')}.`,
    });
  }

  const clamped = Math.max(0, Math.min(100, score));
  const grade =
    clamped >= 90
      ? 'A'
      : clamped >= 75
        ? 'B'
        : clamped >= 60
          ? 'C'
          : clamped >= 40
            ? 'D'
            : 'F';

  return {
    marketplace: skill.marketplace,
    marketplaceName: skill.display_name,
    lastVerified: skill.last_verified,
    score: clamped,
    grade,
    fields,
    issues,
    bannedMatches,
    repeatedTitleWords,
    keywordCoverage: { matched, missing, percent },
  };
}
