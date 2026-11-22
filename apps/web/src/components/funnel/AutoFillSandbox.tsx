import { useState } from 'preact/hooks';
import {
  createAutoFillPayload,
  generateStudioListings,
  mapFormFieldsSemantically,
  type FieldDescriptor,
  type FieldMatch,
} from '@listlift/core';

type DemoLayoutId = 'custom' | 'flipkart' | 'shopify';

const LAYOUTS: Record<
  DemoLayoutId,
  { label: string; subtitle: string; fields: FieldDescriptor[] }
> = {
  custom: {
    label: 'Custom External Website',
    subtitle: 'Non-standard field names (fld_prod_heading, item_code_ref, brief_intro) + ignored password/search inputs',
    fields: [
      { id: 'f_title', tagName: 'input', inputType: 'text', name: 'fld_prod_heading', labelText: 'Item Heading / Product Name' },
      { id: 'f_sku', tagName: 'input', inputType: 'text', name: 'item_code_ref', placeholder: 'Enter Seller SKU or Style Code' },
      { id: 'f_short', tagName: 'textarea', name: 'brief_intro', labelText: 'Short Summary' },
      { id: 'f_desc', tagName: 'textarea', name: 'rich_body_copy', labelText: 'Full Product Description' },
      { id: 'f_seo_t', tagName: 'input', inputType: 'text', name: 'meta_t', labelText: 'SEO Title' },
      { id: 'f_seo_d', tagName: 'textarea', name: 'meta_d', labelText: 'SEO Meta Description' },
      { id: 'f_pass', tagName: 'input', inputType: 'password', name: 'admin_pass', labelText: 'Admin Password (must ignore)' },
    ],
  },
  flipkart: {
    label: 'Flipkart / Meesho Portal',
    subtitle: 'Indian seller dashboard fields (Product Title, Seller SKU ID, Key Highlights, Search Keywords)',
    fields: [
      { id: 'f_title', tagName: 'input', inputType: 'text', name: 'product_title', labelText: 'Product Title' },
      { id: 'f_sku', tagName: 'input', inputType: 'text', name: 'seller_sku_id', labelText: 'Seller SKU ID' },
      { id: 'f_bullets', tagName: 'textarea', name: 'key_highlights', labelText: 'Key Highlights' },
      { id: 'f_desc', tagName: 'textarea', name: 'product_description', labelText: 'Product Description' },
      { id: 'f_tags', tagName: 'input', inputType: 'text', name: 'search_keywords', labelText: 'Search Keywords' },
    ],
  },
  shopify: {
    label: 'Shopify / WooCommerce',
    subtitle: 'Storefront product editor with Title, SKU, Description, Product Tags, and Search Engine SEO fields',
    fields: [
      { id: 'f_title', tagName: 'input', inputType: 'text', name: 'title', labelText: 'Product Title' },
      { id: 'f_sku', tagName: 'input', inputType: 'text', name: 'variant_sku', labelText: 'Variant SKU' },
      { id: 'f_desc', tagName: 'textarea', name: 'body_html', labelText: 'Product Description' },
      { id: 'f_tags', tagName: 'input', inputType: 'text', name: 'product_tags', labelText: 'Product Tags' },
      { id: 'f_seo_t', tagName: 'input', inputType: 'text', name: 'seo_title', labelText: 'Page Title (SEO Title)' },
      { id: 'f_seo_d', tagName: 'textarea', name: 'seo_description', labelText: 'Meta Description' },
    ],
  },
};

export default function AutoFillSandbox() {
  const [layoutId, setLayoutId] = useState<DemoLayoutId>('custom');
  const [values, setValues] = useState<Record<string, string>>({});
  const [matches, setMatches] = useState<FieldMatch[]>([]);

  const layout = LAYOUTS[layoutId];

  const switchLayout = (id: DemoLayoutId) => {
    setLayoutId(id);
    setValues({});
    setMatches([]);
  };

  const runUniversalFill = async () => {
    const sample = generateStudioListings({
      productName: 'Handloom Pure Cotton Straight Kurta',
      brand: 'KalaVastra',
      category: 'Apparel & Ethnic Wear',
      material: '100% Handloom Cotton',
      sizeOrQuantity: 'Size M · Pack of 1',
      audienceOrUseCase: 'Office & Festive Daily Wear',
      hardFacts: ['Pre-shrunk breathable cotton', 'Side pocket included'],
      keywords: ['cotton kurta', 'handloom', 'office wear'],
      competitorUrls: [],
      imageNotes: '',
      marketplaces: [layoutId === 'shopify' ? 'shopify' : 'flipkart'],
      language: 'en',
      tone: 'neutral',
    }).listings[0]!;

    const payload = createAutoFillPayload(sample);
    const discovered = mapFormFieldsSemantically(layout.fields, payload);

    setValues({});
    setMatches([]);

    for (let i = 0; i < discovered.length; i++) {
      const m = discovered[i]!;
      await new Promise((r) => setTimeout(r, 75));
      setValues((prev) => ({ ...prev, [m.fieldId]: m.value }));
      setMatches((prev) => [...prev, m]);
    }
  };

  const matchById = new Map(matches.map((m) => [m.fieldId, m]));

  return (
    <div class="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
        <div class="chip-group" role="group" aria-label="Choose external form layout">
          {(Object.keys(LAYOUTS) as DemoLayoutId[]).map((id) => (
            <button
              key={id}
              type="button"
              class="chip"
              aria-pressed={layoutId === id}
              onClick={() => switchLayout(id)}
            >
              {LAYOUTS[id].label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" class="btn btn-primary btn-sm" onClick={runUniversalFill}>
            Run Semantic Auto-Fill
          </button>
          {matches.length > 0 && (
            <button type="button" class="btn btn-secondary btn-sm" onClick={() => { setValues({}); setMatches([]); }}>
              Undo All
            </button>
          )}
        </div>
      </div>

      <p class="muted" style={{ margin: 0, fontSize: '0.84rem' }}>{layout.subtitle}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {layout.fields.map((f) => {
          const m = matchById.get(f.id);
          const isIgnored = f.inputType === 'password';
          const borderStyle = m
            ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 2px var(--primary-soft)' }
            : {};

          return (
            <div key={f.id} class="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <label for={`sb-${f.id}`}>
                  {f.labelText ?? f.placeholder ?? f.name}{' '}
                  <span class="mono muted" style={{ fontSize: '0.72rem' }}>({f.name})</span>
                </label>
                {m && (
                  <span class="badge badge-pass">
                    {m.slot} · {Math.round(m.confidence * 100)}%
                  </span>
                )}
                {isIgnored && matches.length > 0 && (
                  <span class="badge badge-neutral">Safely ignored</span>
                )}
              </div>
              {f.tagName === 'textarea' ? (
                <textarea
                  id={`sb-${f.id}`}
                  class="textarea"
                  rows={3}
                  style={borderStyle}
                  value={values[f.id] ?? ''}
                  onInput={(e) => setValues((p) => ({ ...p, [f.id]: (e.target as HTMLTextAreaElement).value }))}
                  placeholder={f.placeholder ?? `Empty ${f.name} field...`}
                />
              ) : (
                <input
                  id={`sb-${f.id}`}
                  type={f.inputType ?? 'text'}
                  class="input"
                  style={borderStyle}
                  value={values[f.id] ?? ''}
                  onInput={(e) => setValues((p) => ({ ...p, [f.id]: (e.target as HTMLInputElement).value }))}
                  placeholder={f.placeholder ?? `Empty ${f.name} field...`}
                />
              )}
            </div>
          );
        })}
      </div>

      {matches.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: 'var(--success-soft)', color: 'var(--primary-text)', fontSize: '0.86rem', fontWeight: 600 }}>
          <span>
            Auto-discovered &amp; filled {matches.length} fields semantically — sensitive fields skipped. Review &amp; Publish!
          </span>
          <a href="/studio" class="btn btn-primary btn-sm">Generate &amp; Sync Yours</a>
        </div>
      )}
    </div>
  );
}
