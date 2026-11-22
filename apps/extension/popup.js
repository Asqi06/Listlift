const contentEl = document.getElementById('content');
const fillBtn = document.getElementById('fillBtn');
const syncBtn = document.getElementById('syncBtn');
const statusEl = document.getElementById('status');

let currentPayload = null;

function renderPayload(payload) {
  contentEl.textContent = '';
  if (!payload || !payload.title) {
    const titleP = document.createElement('p');
    titleP.className = 'title';
    titleP.textContent = 'No listing synced yet';
    const metaP = document.createElement('p');
    metaP.className = 'meta';
    metaP.textContent = 'Open ListLift Studio, generate a listing, and click "Send to Auto-Fill Agent".';
    contentEl.append(titleP, metaP);
    fillBtn.disabled = true;
    return;
  }
  currentPayload = payload;
  const titleP = document.createElement('p');
  titleP.className = 'title';
  titleP.textContent = String(payload.title);

  const metaP = document.createElement('p');
  metaP.className = 'meta';
  const strong = document.createElement('strong');
  strong.textContent = String(payload.marketplaceName || payload.marketplace || 'Marketplace');
  const tagCount = Array.isArray(payload.tags) ? payload.tags.length : 0;
  metaP.append(
    strong,
    document.createTextNode(` · SKU: ${String(payload.sku || '—')} · ${tagCount} tags`),
  );

  contentEl.append(titleP, metaP);
  fillBtn.disabled = false;
}

// Automatically pull latest payload from any open ListLift tab (localhost / 127.0.0.1 / listlift.com)
async function pullFromOpenListLiftTab() {
  try {
    const tabs = await chrome.tabs.query({
      url: ['http://localhost:*/*', 'http://127.0.0.1:*/*', 'https://listlift.com/*'],
    });
    for (const tab of tabs) {
      if (!tab.id) continue;
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            return localStorage.getItem('listlift_autofill_latest');
          } catch {
            return null;
          }
        },
      });
      const raw = res?.[0]?.result;
      if (raw) {
        const parsed = JSON.parse(raw);
        await chrome.storage.local.set({ listliftPayload: parsed });
        renderPayload(parsed);
        return true;
      }
    }
  } catch {
    // ignore if no ListLift tab is open
  }
  return false;
}

// On popup open: try pulling fresh data from open ListLift tab first, else fall back to chrome.storage.local
(async () => {
  const synced = await pullFromOpenListLiftTab();
  if (!synced) {
    chrome.storage.local.get(['listliftPayload'], (res) => {
      renderPayload(res.listliftPayload || null);
    });
  }
})();

syncBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Pulling latest listing from ListLift tab…';
  const ok = await pullFromOpenListLiftTab();
  statusEl.textContent = ok
    ? 'Synced latest listing from ListLift Studio!'
    : 'No listing found in open ListLift tabs. Generate one in /studio first.';
});

fillBtn.addEventListener('click', async () => {
  if (!currentPayload) return;
  statusEl.textContent = 'Scanning page fields semantically…';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (payload) => window.__LISTLIFT_RUN_UNIVERSAL_AUTOFILL__(payload),
      args: [currentPayload],
    });

    const outcome = results?.[0]?.result;
    if (outcome?.filledCount > 0) {
      statusEl.textContent = `Auto-filled ${outcome.filledCount} field(s): ${outcome.filled.join(', ')}. Review & click Publish!`;
    } else {
      statusEl.textContent = 'No editable product listing inputs detected on this tab. Open your "Add / Edit Product" form first.';
    }
  } catch {
    statusEl.textContent = 'Cannot run on restricted browser pages (like chrome://). Open any seller portal or website tab.';
  }
});
