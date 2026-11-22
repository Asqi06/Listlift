# ListLift — Architectural & Verification Decisions

Every `[VERIFY]` item from `docs/PRD.md` is tracked here with verification date and source.

## 2026-11-22 — Initial Foundation (M0 & M1)

1. **Frontend island framework:** Preact (`@astrojs/preact`) selected over React for Astro islands to stay well below the `< 60 KB` gzip JS budget on public pages (PRD Section 8).
2. **Marketplace limits (`[VERIFY]` items in PRD Section 6):**
   - Starting values loaded into `packages/skills/*.json` with `"verification_status": "needs_official_verify"` and `"last_verified": "2026-11-22"`:
     - Etsy: title max 140 chars, 13 tags max 20 chars each.
     - Amazon: title max 200 chars (varies by category; recommended <= 150), 5 bullets max 500 chars each, backend search terms 250 bytes.
     - eBay: title max 80 chars.
     - Shopify: SEO title best-practice <= 60 chars, meta description <= 160 chars.
     - Walmart: title max 200 chars (recommended 50–75).
     - Flipkart: title max 200 chars.
     - Meesho: title max 150 chars.
     - Shopee/Lazada: title max 120 chars.
   - Weekly doc-diff Worker (cron) will flag changes; human updates only.
3. **Cloudflare Workers + Astro static assets:**
   - Using `wrangler.jsonc` with `assets: { directory: "./dist", binding: "ASSETS", run_worker_first: ["/api/*"] }`.
   - Static pages built by Astro into `apps/web/dist`; Hono Worker handles `/api/*`.
4. **Local development without paid services:**
   - No paid APIs or external credentials required to run locally.
   - Turnstile verification gracefully bypasses when `TURNSTILE_SECRET_KEY` is unset in `.dev.vars` (development mode only; enforced in production).
   - AI router falls back to deterministic rule-backed generation when Workers AI binding or external LLM key is unavailable in local dev, ensuring zero-friction local testing.
5. **Open founder decisions (PRD Section 19):**
   - Domain name, India/global payment provider (Razorpay / Paddle / Lemon Squeezy / Dodo Payments), and Hindi/Hinglish launch timing remain open for founder confirmation before M4.
6. **Groq Production Model IDs (Verified 2026-11-22 against `console.groq.com/docs/models`):**
   - Active production text model IDs: `openai/gpt-oss-120b` (default), `openai/gpt-oss-20b`, `llama-3.1-8b-instant`, and `llama-3.3-70b-versatile`.
   - Added live model discovery (`GET https://api.groq.com/openai/v1/models`) in Listing Studio BYOK settings so users can always refresh active models on their Groq tier.
