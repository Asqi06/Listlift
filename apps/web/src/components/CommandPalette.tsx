import { useEffect, useRef, useState } from 'preact/hooks';

interface CommandItem {
  label: string;
  category: string;
  href: string;
}

const ITEMS: CommandItem[] = [
  { label: 'Listing Studio — Full Multi-Marketplace Workflow', category: 'Flagship', href: '/studio' },
  { label: 'Tools Hub — All 8 Free Tools', category: 'Hub', href: '/tools/' },
  { label: 'Title Generator + Checker', category: 'Tool', href: '/tools/title-generator' },
  { label: 'Description + Bullets Generator', category: 'Tool', href: '/tools/description-generator' },
  { label: 'Tags & Keywords Generator (13-Slot Etsy + Amazon Bytes)', category: 'Tool', href: '/tools/tags-generator' },
  { label: 'SKU Generator (Batch + Duplicate Check)', category: 'Tool', href: '/tools/sku-generator' },
  { label: 'Listing Score (0–100 Linter)', category: 'Tool', href: '/tools/listing-score' },
  { label: 'Competitor Compare & Price Band Matrix', category: 'Tool', href: '/tools/competitor-compare' },
  { label: 'Character Counter & Limit Checker', category: 'Tool', href: '/tools/character-counter' },
  { label: 'Amazon Listing Rules & Limits', category: 'Marketplace', href: '/marketplaces/amazon' },
  { label: 'Etsy Listing Rules & 13-Tag Guide', category: 'Marketplace', href: '/marketplaces/etsy' },
  { label: 'eBay 80-Char Title Rules', category: 'Marketplace', href: '/marketplaces/ebay' },
  { label: 'Shopify SEO Limits', category: 'Marketplace', href: '/marketplaces/shopify' },
  { label: 'Walmart Listing Rules', category: 'Marketplace', href: '/marketplaces/walmart' },
  { label: 'Flipkart India Listing Rules', category: 'Marketplace', href: '/marketplaces/flipkart' },
  { label: 'Meesho India Listing Rules', category: 'Marketplace', href: '/marketplaces/meesho' },
  { label: 'Shopee / Lazada Rules', category: 'Marketplace', href: '/marketplaces/shopee' },
  { label: 'Seller Guides & Playbooks', category: 'Guides', href: '/guides/' },
  { label: 'Pricing & Plans', category: 'Pricing', href: '/pricing' },
];

export default function CommandPalette() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = ITEMS.filter((item) =>
    `${item.label} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const openDialog = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      setQuery('');
      setActiveIndex(0);
      // Zero animation on keyboard-triggered command palette (Emil Kowalski / Raycast rule)
      dialog.showModal();
      inputRef.current?.focus();
    }
  };

  const closeDialog = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  };

  useEffect(() => {
    const dialog = dialogRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialogRef.current?.open) {
          closeDialog();
        } else {
          openDialog();
        }
      }
    };

    const onTriggerClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-open-cmd]')) {
        openDialog();
      }
    };

    // Fallback for browsers without native <dialog closedby="any"> (Safari)
    const onBackdropClick = (e: MouseEvent) => {
      if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;
      if (e.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onTriggerClick);
    dialog?.addEventListener('click', onBackdropClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onTriggerClick);
      dialog?.removeEventListener('click', onBackdropClick);
    };
  }, []);

  const onInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      window.location.href = filtered[activeIndex].href;
      closeDialog();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      class="ll-dialog"
      aria-label="Quick tool search"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div style={{ padding: '14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="search"
          class="input"
          value={query}
          onInput={(e) => {
            setQuery((e.target as HTMLInputElement).value);
            setActiveIndex(0);
          }}
          onKeyDown={onInputKeyDown}
          placeholder="Jump to Listing Studio, a tool, or marketplace..."
          aria-label="Search tools and marketplaces"
        />
        <button type="button" class="btn btn-ghost btn-sm" onClick={closeDialog} aria-label="Close search">
          Esc
        </button>
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '8px',
          maxHeight: '340px',
          overflowY: 'auto',
        }}
      >
        {filtered.length === 0 ? (
          <li class="muted" style={{ padding: '20px', textAlign: 'center' }}>
            No matching tools found.
          </li>
        ) : (
          filtered.map((item, idx) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={closeDialog}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  color: 'var(--text)',
                  background: idx === activeIndex ? 'var(--primary-soft)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>{item.label}</span>
                <span class={item.category === 'Flagship' ? 'badge badge-pass' : 'badge badge-neutral'}>
                  {item.category}
                </span>
              </a>
            </li>
          ))
        )}
      </ul>
    </dialog>
  );
}
