import { useState } from 'preact/hooks';
import { generateSkus } from '@listlift/core';

interface DraftRow {
  category: string;
  product: string;
  variant: string;
  color: string;
  size: string;
}

const DEFAULT_ROWS: DraftRow[] = [
  { category: 'Candles', product: 'Lavender Soy', variant: 'Jar', color: 'Amber', size: '8oz' },
  { category: 'Candles', product: 'Vanilla Bean', variant: 'Jar', color: 'Clear', size: '8oz' },
  { category: 'Apparel', product: 'Cotton Kurta', variant: 'Straight', color: 'Indigo', size: 'M' },
];

export default function SkuGenerator() {
  const [brand, setBrand] = useState('LIST');
  const [separator, setSeparator] = useState<'-' | '_' | ''>('-');
  const [includeSequence, setIncludeSequence] = useState(true);
  const [uppercase, setUppercase] = useState(true);
  const [rows, setRows] = useState<DraftRow[]>(DEFAULT_ROWS);
  const [copied, setCopied] = useState(false);

  const validItems = rows.filter((r) => r.category.trim() && r.product.trim());
  const result =
    validItems.length > 0
      ? generateSkus({
          brand,
          separator,
          includeSequence,
          startSequence: 1,
          uppercase,
          items: validItems,
        })
      : { rows: [], duplicateCount: 0, csv: '' };

  const updateRow = (idx: number, field: keyof DraftRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { category: 'General', product: 'New Item', variant: '', color: '', size: '' },
    ]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(result.csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          alignItems: 'end',
        }}
      >
        <div class="field">
          <label for="sku-brand">Brand prefix</label>
          <input
            id="sku-brand"
            class="input"
            value={brand}
            onInput={(e) => setBrand((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="field">
          <label for="sku-sep">Separator</label>
          <select
            id="sku-sep"
            class="select"
            value={separator}
            onChange={(e) => setSeparator((e.target as HTMLSelectElement).value as '-' | '_' | '')}
          >
            <option value="-">Hyphen (-)</option>
            <option value="_">Underscore (_)</option>
            <option value="">None</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeSequence}
            onChange={(e) => setIncludeSequence((e.target as HTMLInputElement).checked)}
          />
          <span>Append sequence (001…)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={uppercase}
            onChange={(e) => setUppercase((e.target as HTMLInputElement).checked)}
          />
          <span>UPPERCASE</span>
        </label>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Product</th>
              <th>Variant</th>
              <th>Color</th>
              <th>Size</th>
              <th>Generated SKU</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const generated = result.rows[idx];
              return (
                <tr key={idx}>
                  <td>
                    <input
                      aria-label={`Row ${idx + 1} category`}
                      class="input"
                      style={{ minHeight: '36px', padding: '6px 10px' }}
                      value={row.category}
                      onInput={(e) => updateRow(idx, 'category', (e.target as HTMLInputElement).value)}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Row ${idx + 1} product`}
                      class="input"
                      style={{ minHeight: '36px', padding: '6px 10px' }}
                      value={row.product}
                      onInput={(e) => updateRow(idx, 'product', (e.target as HTMLInputElement).value)}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Row ${idx + 1} variant`}
                      class="input"
                      style={{ minHeight: '36px', padding: '6px 10px' }}
                      value={row.variant}
                      onInput={(e) => updateRow(idx, 'variant', (e.target as HTMLInputElement).value)}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Row ${idx + 1} color`}
                      class="input"
                      style={{ minHeight: '36px', padding: '6px 10px' }}
                      value={row.color}
                      onInput={(e) => updateRow(idx, 'color', (e.target as HTMLInputElement).value)}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Row ${idx + 1} size`}
                      class="input"
                      style={{ minHeight: '36px', padding: '6px 10px', width: '80px' }}
                      value={row.size}
                      onInput={(e) => updateRow(idx, 'size', (e.target as HTMLInputElement).value)}
                    />
                  </td>
                  <td class="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {generated?.sku ?? '—'}
                    {generated?.isDuplicate && (
                      <span class="badge badge-fail" style={{ marginLeft: '8px' }}>
                        DUPLICATE
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      onClick={() => removeRow(idx)}
                      aria-label={`Remove row ${idx + 1}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" class="btn btn-secondary" onClick={addRow}>
            + Add row
          </button>
          <button type="button" class="btn btn-primary" onClick={copyCsv}>
            {copied ? 'CSV Copied!' : 'Copy CSV'}
          </button>
        </div>
        <span class={result.duplicateCount > 0 ? 'badge badge-fail' : 'badge badge-pass'}>
          {result.duplicateCount > 0
            ? `${result.duplicateCount} duplicate SKU(s) detected`
            : `${result.rows.length} unique SKU(s)`}
        </span>
      </div>
    </div>
  );
}
