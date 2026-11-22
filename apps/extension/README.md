# ListLift Universal Auto-Fill Agent v2.0 (Chrome / Edge / Brave — Manifest V3)

Automatically discovers and fills **Title, SKU, Short Description, Long Description, Bullets, Tags, Search Terms, SEO Title, and Meta Description** on:
- **All 8 launch marketplaces:** Amazon Seller Central (Global & India), Etsy, Shopify Admin, eBay, Walmart, Flipkart Seller Hub, Meesho Supplier Panel, Shopee / Lazada.
- **ANY custom external website or admin panel:** WooCommerce, Magento, Wix, BigCommerce, Dukaan, or custom React / Next.js / Laravel / PHP dashboards.

## How it works safely
- Uses on-demand `activeTab` + `chrome.scripting` — only runs when you click the button, zero background browsing permissions, zero password sharing.
- Traverses standard DOM + open Shadow DOMs + rich-text `contenteditable` editors.
- Never touches password, email, phone, hidden, or search inputs.
- Includes a 1-click **Undo** button right on the page after filling.

## Install locally in 30 seconds
1. Open `chrome://extensions` and turn ON **Developer mode**.
2. Click **Load unpacked** and select `apps/extension`.
3. Generate any listing in ListLift Studio → click **Send to Auto-Fill Agent**.
4. Switch to any Seller Portal or Custom Admin Panel tab → click the ListLift toolbar icon → **Auto-Fill Current Tab (Any Site)**.
