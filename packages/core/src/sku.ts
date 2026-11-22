import { type SkuGenerateRequest } from './schemas.js';

function toCode(input: string, maxLen: number): string {
  const cleaned = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  if (!cleaned) return '';

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return (words[0] ?? '').slice(0, maxLen);
  }

  // Prefer initials + remainder of first word if needed
  const initials = words.map((w) => w[0] ?? '').join('');
  if (initials.length >= Math.min(3, maxLen)) {
    return initials.slice(0, maxLen);
  }
  return words.join('').slice(0, maxLen);
}

export interface GeneratedSkuRow {
  index: number;
  sku: string;
  category: string;
  product: string;
  variant: string;
  isDuplicate: boolean;
}

export interface SkuBatchResult {
  rows: GeneratedSkuRow[];
  duplicateCount: number;
  csv: string;
}

export function generateSkus(request: SkuGenerateRequest): SkuBatchResult {
  const brandCode = toCode(request.brand, 4);
  const sep = request.separator;
  const seen = new Set<string>();
  let duplicateCount = 0;

  const rows: GeneratedSkuRow[] = request.items.map((item, idx) => {
    const parts = [
      brandCode,
      toCode(item.category, 3),
      toCode(item.product, 4),
      toCode(item.variant, 3),
      toCode(item.color, 3),
      toCode(item.size, 3),
    ].filter(Boolean);

    if (request.includeSequence) {
      parts.push(String(request.startSequence + idx).padStart(3, '0'));
    }

    let sku = parts.join(sep);
    if (request.uppercase) {
      sku = sku.toUpperCase();
    } else {
      sku = sku.toLowerCase();
    }

    const key = sku.toLowerCase();
    const isDuplicate = seen.has(key);
    if (isDuplicate) {
      duplicateCount += 1;
    } else {
      seen.add(key);
    }

    return {
      index: idx + 1,
      sku,
      category: item.category,
      product: item.product,
      variant: [item.variant, item.color, item.size].filter(Boolean).join(' / '),
      isDuplicate,
    };
  });

  const csvHeader = 'sku,category,product,variant,duplicate';
  const csvRows = rows.map((r) =>
    [r.sku, r.category, r.product, r.variant, r.isDuplicate ? 'yes' : 'no']
      .map((cell) => `"${cell.replace(/"/g, '""')}"`)
      .join(','),
  );

  return {
    rows,
    duplicateCount,
    csv: [csvHeader, ...csvRows].join('\n'),
  };
}
