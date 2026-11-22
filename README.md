# ListLift — Multi-Tool AI Ecommerce Listing Platform

> "The only listing tool that shows its homework."

Monorepo implementation of [docs/PRD.md](./docs/PRD.md) built with **Astro**, **Preact islands**, **Hono**, and **Cloudflare Workers (Static Assets + D1 + R2)**.

## Workspace Layout

- `apps/web` — Static Astro site + Preact interactive tool islands + Hono Worker API (`/api/v1/*`)
- `apps/extension` — Manifest V3 Chrome/Edge **Auto-Fill Agent** extension (1-click portal injection into Amazon, Etsy, Shopify, eBay, Flipkart, Meesho, Walmart, Shopee)
- `packages/core` — Strict TypeScript + Zod schemas, field validators, 0–100 listing linter/scorer, SKU generator, title generator, 1-line quick parser, and exact marketplace upload CSV builders
- `packages/skills` — Versioned marketplace rule JSON files for all 8 launch marketplaces (Amazon, Etsy, eBay, Shopify, Walmart, Flipkart, Meesho, Shopee/Lazada)
- `packages/ui` — "Calm premium" CSS design tokens (light/dark) and accessible base primitives
- `docs` — `PRD.md`, `decisions.md`, and milestone implementation plans

## Quick Start

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

## Cloudflare Worker Local Dev

Copy `.env.example` to `apps/web/.dev.vars`, then run:

```bash
pnpm --filter @listlift/web build
pnpm --filter @listlift/web worker:dev
```
