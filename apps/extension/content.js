/* ListLift Universal Auto-Fill Agent (v2.0 — Works on ANY Marketplace or Custom Website)
   - Runs as a bridge on ListLift Studio to store the latest payload.
   - Injected on-demand via chrome.scripting.executeScript into ANY active seller portal
     or custom external website tab (using activeTab — zero broad tracking permissions!).
   - Discovers fields semantically across standard DOM + open Shadow DOM + rich-text editors,
     injects React/Vue/Angular-safe values, highlights filled fields, and supports 1-click Undo. */

(() => {
  // 1. Bridge listener strictly on trusted ListLift origins (prevents third-party sites from spoofing payloads)
  const isTrustedListLiftOrigin = (origin) => {
    try {
      const u = new URL(origin);
      return (
        u.hostname === 'listlift.com' ||
        u.hostname === 'www.listlift.com' ||
        u.hostname === 'localhost' ||
        u.hostname === '127.0.0.1'
      );
    } catch {
      return false;
    }
  };

  if (!window.__LISTLIFT_BRIDGE_BOUND__ && isTrustedListLiftOrigin(window.location.origin)) {
    window.__LISTLIFT_BRIDGE_BOUND__ = true;
    try {
      const existing = localStorage.getItem('listlift_autofill_latest');
      if (existing) {
        chrome.storage.local.set({ listliftPayload: JSON.parse(existing) });
      }
    } catch {
      // ignore
    }
    window.addEventListener('message', (event) => {
      if (event.source !== window || !isTrustedListLiftOrigin(event.origin)) return;
      if (event.data && event.data.type === 'LISTLIFT_SYNC_PAYLOAD' && event.data.payload) {
        chrome.storage.local.set({ listliftPayload: event.data.payload }, () => {
          window.postMessage({ type: 'LISTLIFT_SYNC_ACK', ok: true }, event.origin);
        });
      }
    });
  }

  const SKIP_TYPES = new Set([
    'hidden', 'password', 'email', 'tel', 'file', 'checkbox', 'radio',
    'submit', 'button', 'reset', 'image', 'date', 'time', 'color', 'range', 'search',
  ]);

  const NOISE_RX = /\b(search\s+catalog|site\s+search|global\s+search|login|password|email|phone|otp|coupon|promo\s+code|gstin|pan\s+number|bank\s+account)\b/i;

  const SLOT_RULES = {
    seoTitle: {
      exact: [/\b(seo[\s_-]*title|meta[\s_-]*title|page[\s_-]*title|browser[\s_-]*title)\b/i],
      strong: [/\bseo\b.*\btitle\b/i, /\bsearch\s+engine\b.*\btitle\b/i],
      weak: [],
    },
    metaDescription: {
      exact: [/\b(meta[\s_-]*desc|seo[\s_-]*desc|meta[\s_-]*description|seo[\s_-]*description)\b/i],
      strong: [/\bsearch\s+engine\b.*\bdesc/i],
      weak: [],
      multiline: true,
    },
    title: {
      exact: [/\b(product[\s_-]*title|item[\s_-]*title|listing[\s_-]*title|product[\s_-]*name|item[\s_-]*name|offer[\s_-]*title)\b/i],
      strong: [/\b(title|headline|heading|prod[\s_-]*name|product[\s_-]*heading)\b/i],
      weak: [/\bname\b/i],
    },
    sku: {
      exact: [/\b(seller[\s_-]*sku|item[\s_-]*sku|variant[\s_-]*sku|product[\s_-]*sku|sku[\s_-]*id|sku[\s_-]*code|style[\s_-]*code)\b/i],
      strong: [/\bsku\b/i, /\bitem[\s_-]*code\b/i, /\barticle[\s_-]*code\b/i, /\bcatalog[\s_-]*code\b/i],
      weak: [/\bref[\s_-]*code\b/i],
    },
    shortDescription: {
      exact: [/\b(short[\s_-]*desc|short[\s_-]*description|summary|excerpt|product[\s_-]*summary|brief[\s_-]*desc|intro[\s_-]*copy)\b/i],
      strong: [/\bshort\b.*\b(desc|copy|text)\b/i, /\bsub[\s_-]*title\b/i],
      weak: [],
      multiline: true,
    },
    bullets: {
      exact: [/\b(bullet[\s_-]*point|key[\s_-]*features?|highlights?|product[\s_-]*highlights?|feature[\s_-]*bullets?)\b/i],
      strong: [/\bbullets?\b/i, /\bselling[\s_-]*points?\b/i],
      weak: [],
      multiline: true,
    },
    longDescription: {
      exact: [/\b(product[\s_-]*description|item[\s_-]*description|long[\s_-]*description|detailed[\s_-]*description|full[\s_-]*description|body[\s_-]*html|body[\s_-]*copy)\b/i],
      strong: [/\bdescription\b/i, /\bdetails?\b/i, /\babout\s+this\s+item\b/i, /\bbody\b/i],
      weak: [/\bnotes?\b/i, /\bcopy\b/i],
      multiline: true,
    },
    searchTerms: {
      exact: [/\b(backend[\s_-]*search|search[\s_-]*terms?|generic[\s_-]*keywords?|search[\s_-]*keywords?)\b/i],
      strong: [/\bkeywords?\b/i],
      weak: [],
    },
    tags: {
      exact: [/\b(product[\s_-]*tags?|listing[\s_-]*tags?|etsy[\s_-]*tags?|tags?)\b/i],
      strong: [/\bhashtags?\b/i, /\blabels?\b/i],
      weak: [],
    },
  };

  function collectInputs(root, out = []) {
    const nodes = root.querySelectorAll('input, textarea, [contenteditable="true"]');
    for (const el of nodes) {
      if (el.disabled || el.readOnly) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (el.tagName === 'INPUT' && SKIP_TYPES.has((el.type || 'text').toLowerCase())) continue;
      out.push(el);
    }
    // Traverse open Shadow DOMs
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (el.shadowRoot) collectInputs(el.shadowRoot, out);
    }
    return out;
  }

  function getLabelText(el) {
    const parts = [];
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) parts.push(lbl.textContent || '');
    }
    const parentLabel = el.closest('label');
    if (parentLabel) parts.push(parentLabel.textContent || '');
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      for (const refId of labelledBy.split(/\s+/)) {
        const ref = document.getElementById(refId);
        if (ref) parts.push(ref.textContent || '');
      }
    }
    parts.push(
      el.getAttribute('aria-label') || '',
      el.getAttribute('placeholder') || '',
      el.getAttribute('name') || '',
      el.getAttribute('id') || '',
      el.getAttribute('data-testid') || '',
    );
    // Look at immediate previous sibling or container heading
    const prev = el.previousElementSibling;
    if (prev && prev.textContent && prev.textContent.length < 80) parts.push(prev.textContent);
    const parentPrev = el.parentElement?.previousElementSibling;
    if (parentPrev && parentPrev.textContent && parentPrev.textContent.length < 80) parts.push(parentPrev.textContent);

    return parts.join(' ').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function setNativeValue(el, value) {
    const prevValue = el.isContentEditable ? el.innerText : el.value;
    el.focus();
    if (el.isContentEditable) {
      el.innerText = value;
    } else {
      const proto =
        el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value);
      else el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.style.outline = '2px solid #0B7A53';
    el.style.outlineOffset = '2px';
    return prevValue;
  }

  function valueForSlot(payload, slot, bulletIndex) {
    switch (slot) {
      case 'title': return payload.title || '';
      case 'sku': return payload.sku || '';
      case 'shortDescription': return payload.shortDescription || '';
      case 'longDescription': return payload.longDescription || '';
      case 'bullets':
        if (typeof bulletIndex === 'number' && payload.bullets?.[bulletIndex]) {
          return payload.bullets[bulletIndex];
        }
        return (payload.bullets || []).map((b) => `• ${b}`).join('\n');
      case 'tags': return (payload.tags || []).join(', ');
      case 'searchTerms': return payload.searchTerms || '';
      case 'seoTitle': return payload.seoTitle || '';
      case 'metaDescription': return payload.metaDescription || '';
      default: return '';
    }
  }

  function showFloatingBar(filledList, undoStack) {
    const old = document.getElementById('listlift-autofill-banner');
    if (old) old.remove();

    const bar = document.createElement('div');
    bar.id = 'listlift-autofill-banner';
    Object.assign(bar.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: '2147483647',
      background: '#111214',
      color: '#FFFFFF',
      border: '1px solid #0B7A53',
      borderRadius: '10px',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      boxShadow: '0 14px 36px rgba(0,0,0,0.32)',
    });

    const msg = document.createElement('span');
    msg.textContent =
      filledList.length > 0
        ? `ListLift filled ${filledList.length} fields (${filledList.join(', ')}) — Review & Publish`
        : 'ListLift: No editable product form found on this page.';
    bar.appendChild(msg);

    if (undoStack.length > 0) {
      const undoBtn = document.createElement('button');
      undoBtn.textContent = 'Undo';
      Object.assign(undoBtn.style, {
        background: '#262B35',
        color: '#FFFFFF',
        border: '1px solid #3A4150',
        borderRadius: '6px',
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600',
      });
      undoBtn.addEventListener('click', () => {
        for (const item of undoStack) {
          setNativeValue(item.el, item.prev);
          item.el.style.outline = '';
        }
        bar.remove();
      });
      bar.appendChild(undoBtn);
    }

    document.body.appendChild(bar);
    setTimeout(() => bar.remove(), 9000);
  }

  window.__LISTLIFT_RUN_UNIVERSAL_AUTOFILL__ = function (payload) {
    const elements = collectInputs(document);
    const scored = [];

    for (const el of elements) {
      const explicit = el.getAttribute('data-listlift');
      if (explicit) {
        const clean = explicit.toLowerCase().replace(/[^a-z]/g, '');
        const map = {
          title: 'title', sku: 'sku', shortdescription: 'shortDescription',
          description: 'longDescription', longdescription: 'longDescription',
          bullets: 'bullets', highlights: 'bullets', tags: 'tags',
          keywords: 'searchTerms', searchterms: 'searchTerms',
          seotitle: 'seoTitle', metadescription: 'metaDescription',
        };
        if (map[clean]) {
          scored.push({ el, slot: map[clean], score: 100 });
          continue;
        }
      }

      const sig = getLabelText(el);
      if (!sig || NOISE_RX.test(sig)) continue;
      const isMulti = el.tagName === 'TEXTAREA' || el.isContentEditable;

      let bestSlot = null;
      let bestScore = 0;
      for (const [slot, rule] of Object.entries(SLOT_RULES)) {
        let s = 0;
        if (rule.exact.some((rx) => rx.test(sig))) s = 88;
        else if (rule.strong.some((rx) => rx.test(sig))) s = 68;
        else if (rule.weak.some((rx) => rx.test(sig))) s = 42;
        if (s > 0) {
          if (rule.multiline && isMulti) s += 10;
          if (!rule.multiline && !isMulti && slot !== 'tags') s += 6;
          if (s > bestScore) {
            bestScore = s;
            bestSlot = slot;
          }
        }
      }
      if (bestSlot && bestScore >= 40) scored.push({ el, slot: bestSlot, score: bestScore });
    }

    scored.sort((a, b) => b.score - a.score);
    const usedSlots = new Set();
    const usedEls = new Set();
    const undoStack = [];
    const filled = [];
    let bulletIdx = 0;

    for (const item of scored) {
      if (usedEls.has(item.el)) continue;
      if (item.slot !== 'bullets' && usedSlots.has(item.slot)) continue;
      const val = valueForSlot(
        payload,
        item.slot,
        item.slot === 'bullets' && item.el.tagName === 'INPUT' ? bulletIdx++ : undefined,
      );
      if (!val) continue;
      usedEls.add(item.el);
      usedSlots.add(item.slot);
      const prev = setNativeValue(item.el, val);
      undoStack.push({ el: item.el, prev });
      filled.push(item.slot);
    }

    showFloatingBar(filled, undoStack);
    return { filledCount: filled.length, filled };
  };
})();
