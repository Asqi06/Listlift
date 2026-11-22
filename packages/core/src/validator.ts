import { type FieldRule, type MarketplaceSkill } from '@listlift/skills';

const encoder = new TextEncoder();

export function utf8ByteLength(text: string): number {
  return encoder.encode(text).length;
}

export function charLength(text: string): number {
  return Array.from(text).length;
}

export type FieldCheckStatus = 'pass' | 'warn' | 'fail';

export interface FieldValidationResult {
  field: string;
  label: string;
  status: FieldCheckStatus;
  length: number;
  bytes: number;
  limit?: number;
  byteLimit?: number;
  recommendedMax?: number;
  count?: number;
  countMax?: number;
  messages: string[];
}

export function validateTextField(
  field: string,
  value: string,
  rule: FieldRule,
): FieldValidationResult {
  const trimmed = value.trim();
  const length = charLength(trimmed);
  const bytes = utf8ByteLength(trimmed);
  const messages: string[] = [];
  let status: FieldCheckStatus = 'pass';

  if (rule.required && length === 0) {
    status = 'fail';
    messages.push(`${rule.label} is required.`);
  }

  if (length > 0 && rule.min !== undefined && length < rule.min) {
    status = status === 'fail' ? 'fail' : 'warn';
    messages.push(`Too short (${length}/${rule.min} min chars). Add more descriptive product facts.`);
  }

  if (rule.max !== undefined && length > rule.max) {
    status = 'fail';
    messages.push(`Exceeds ${rule.max}-character limit by ${length - rule.max} chars.`);
  } else if (
    rule.recommended_max !== undefined &&
    length > rule.recommended_max
  ) {
    status = status === 'fail' ? 'fail' : 'warn';
    messages.push(
      `Above recommended ${rule.recommended_max} chars (hard limit: ${rule.max ?? 'none'}).`,
    );
  }

  if (rule.max_bytes !== undefined && bytes > rule.max_bytes) {
    status = 'fail';
    messages.push(`Exceeds ${rule.max_bytes}-byte UTF-8 limit (${bytes} bytes).`);
  }

  return {
    field,
    label: rule.label,
    status,
    length,
    bytes,
    limit: rule.max,
    byteLimit: rule.max_bytes,
    recommendedMax: rule.recommended_max,
    messages,
  };
}

export function validateListField(
  field: string,
  items: readonly string[],
  rule: FieldRule,
): FieldValidationResult {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  const messages: string[] = [];
  let status: FieldCheckStatus = 'pass';

  if (rule.required && cleaned.length === 0) {
    status = 'fail';
    messages.push(`${rule.label} is required.`);
  }

  if (rule.count_max !== undefined && cleaned.length > rule.count_max) {
    status = 'fail';
    messages.push(`Too many items (${cleaned.length}/${rule.count_max} max).`);
  }

  if (rule.each_max !== undefined) {
    const oversized = cleaned.filter((item) => charLength(item) > rule.each_max!);
    if (oversized.length > 0) {
      status = 'fail';
      messages.push(
        `${oversized.length} item(s) exceed the ${rule.each_max}-char per-item limit.`,
      );
    }
  }

  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const item of cleaned) {
    const key = item.toLowerCase();
    if (seen.has(key)) dupes.push(item);
    seen.add(key);
  }
  if (dupes.length > 0) {
    status = status === 'fail' ? 'fail' : 'warn';
    messages.push(`Duplicate entries detected: ${dupes.slice(0, 3).join(', ')}.`);
  }

  const totalChars = cleaned.reduce((sum, item) => sum + charLength(item), 0);
  const totalBytes = cleaned.reduce((sum, item) => sum + utf8ByteLength(item), 0);

  return {
    field,
    label: rule.label,
    status,
    length: totalChars,
    bytes: totalBytes,
    count: cleaned.length,
    countMax: rule.count_max,
    limit: rule.each_max,
    messages,
  };
}

export function findBannedPatterns(
  text: string,
  skill: MarketplaceSkill,
): string[] {
  const lower = text.toLowerCase();
  const universalBanned = [
    'guaranteed #1',
    'cures disease',
    'miracle cure',
    '100% counterfeit',
  ];
  const combined = Array.from(new Set([...skill.banned_patterns, ...universalBanned]));
  return combined.filter((pattern) => lower.includes(pattern.toLowerCase()));
}

export function findRepeatedWords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of',
    'on', 'or', 'the', 'to', 'with', 'your', 'our', 'set', 'pack',
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const counts = new Map<string, number>();
  for (const w of words) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 3)
    .map(([word]) => word);
}
