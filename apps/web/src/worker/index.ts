import { Hono } from 'hono';
import { z } from 'zod';
import {
  CompetitorCompareRequestSchema,
  DescriptionGenerateRequestSchema,
  ListingInputSchema,
  SkuGenerateRequestSchema,
  StudioGenerateRequestSchema,
  TagsGenerateRequestSchema,
  TitleGenerateRequestSchema,
  compareCompetitors,
  extractStructuredProductFromHtml,
  generateDescriptionAndBullets,
  generateSkus,
  generateStudioListings,
  generateTagsAndKeywords,
  generateTitleOptions,
  generateWithAutoFallback,
  scoreListing,
  type CompetitorEntry,
} from '@listlift/core';
import { getAllMarketplaceSkills, getMarketplaceSkill } from '@listlift/skills';

export interface WorkerEnv {
  ASSETS?: Fetcher;
  DB?: D1Database;
  MEDIA_BUCKET?: R2Bucket;
  TURNSTILE_SECRET_KEY?: string;
  OMNIROUTE_BASE_URL?: string;
  OMNIROUTE_API_KEY?: string;
  OMNIROUTE_VISION_MODEL?: string;
  OMNIROUTE_TEXT_MODEL?: string;
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  GROQ_API_KEY?: string;
  GEMINI_MODELS?: string;
  OPENROUTER_MODELS?: string;
  GROQ_MODELS?: string;
  OPENAI_API_KEY?: string;
  APP_ENV?: string;
}

// Freemium daily limits: generous enough to try every day, tight enough to drive Pro upgrades
const DAILY_STUDIO_LIMIT = 3;
const DAILY_FREE_TOOL_LIMIT = 5;
const DAILY_SHARE_LIMIT = 10;
const FREE_MAX_MARKETPLACES = 2;
const MAX_IMAGE_DATA_URL_CHARS = 450_000; // ~320 KB base64 cap (512px WebP is ~25 KB)
const MAX_SHARE_PAYLOAD_CHARS = 45_000;
const VALID_IMAGE_DATA_URL_RX = /^data:image\/(webp|jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/;

/** Strict SSRF guard: only allow public HTTPS URLs (blocks localhost, private IPs, metadata endpoints). */
function isSafePublicHttpsUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('[::1]') ||
      host.startsWith('[fc') ||
      host.startsWith('[fd') ||
      host.startsWith('[fe80')
    ) {
      return false;
    }
    // Block IPv4 loopback, private RFC1918, and link-local/cloud metadata ranges
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const [a, b] = host.split('.').map(Number);
      if (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// In-memory fallback stores for local dev when D1 is unbound
const memoryShares = new Map<string, { id: string; slug: string; payload: unknown; expiresAt: string | null }>();
const memoryUsage = new Map<string, number>();

async function verifyTurnstile(
  token: string | undefined,
  secret: string | undefined,
  ip: string | undefined,
): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const data = (await res.json()) as { success?: boolean };
  return Boolean(data.success);
}

async function checkAndIncrementUsage(
  db: D1Database | undefined,
  subject: string,
  tool: string,
  limit: number = DAILY_FREE_TOOL_LIMIT,
): Promise<{ allowed: boolean; count: number; limit: number; remaining: number }> {
  const day = new Date().toISOString().slice(0, 10);
  if (!db) {
    const memKey = `${day}:${subject}:${tool}`;
    const nextCount = (memoryUsage.get(memKey) ?? 0) + 1;
    memoryUsage.set(memKey, nextCount);
    return {
      allowed: nextCount <= limit,
      count: nextCount,
      limit,
      remaining: Math.max(0, limit - nextCount),
    };
  }
  try {
    await db
      .prepare(
        `INSERT INTO usage_counters (subject, day, tool, count)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(subject, day, tool) DO UPDATE SET count = count + 1`,
      )
      .bind(subject, day, tool)
      .run();

    const row = await db
      .prepare(`SELECT count FROM usage_counters WHERE subject = ? AND day = ? AND tool = ?`)
      .bind(subject, day, tool)
      .first<{ count: number }>();

    const count = row?.count ?? 1;
    return { allowed: count <= limit, count, limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { allowed: true, count: 1, limit, remaining: Math.max(0, limit - 1) };
  }
}

const IdentifySchema = z.object({
  text: z.string().trim().max(500).optional().default(''),
  imageFilename: z.string().trim().max(200).optional().default(''),
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
});

const ResearchSchema = z.object({
  productName: z.string().trim().min(2).max(200),
  marketplace: z.string().trim().min(2).max(40),
  urls: z.array(z.string().url()).max(6).optional().default([]),
});

const ShareCreateSchema = z.object({
  listing: z.record(z.unknown()),
  expiry: z.enum(['24h', '7d', 'never']).optional().default('7d'),
});

export function createApp() {
  const app = new Hono<{ Bindings: WorkerEnv }>();

  // Global security headers on all API responses
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  });

  app.get('/api/v1/health', (c) => {
    return c.json({
      ok: true,
      service: 'listlift-api',
      env: c.env?.APP_ENV ?? 'development',
      marketplaces: getAllMarketplaceSkills().length,
    });
  });

  app.get('/api/v1/skills', (c) => c.json({ skills: getAllMarketplaceSkills() }));

  app.get('/api/v1/skills/:marketplace', (c) => {
    const id = c.req.param('marketplace');
    const skill = getMarketplaceSkill(id);
    if (!skill) return c.json({ error: `Unknown marketplace "${id}".` }, 404);
    return c.json({ skill });
  });

  app.post('/api/v1/identify', async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }
    const parsed = IdentifySchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }

    const hint = (parsed.data.text || parsed.data.imageFilename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')).trim();
    const confidence = hint.length >= 6 ? 0.88 : 0.52;
    return c.json({
      identified: {
        productType: hint || 'Unidentified Product',
        probableCategory: /candle|jar|decor/i.test(hint)
          ? 'Home & Living'
          : /kurta|shirt|dress|cotton|jacket/i.test(hint)
            ? 'Apparel'
            : /bottle|flask|mug|kitchen/i.test(hint)
              ? 'Kitchen & Dining'
              : 'General Merchandise',
        confidence,
        needsConfirmation: confidence < 0.7,
        followUpQuestions:
          confidence < 0.7
            ? ['What primary material is this made of?', 'What is the size or pack count?']
            : [],
      },
    });
  });

  app.post('/api/v1/research', async (c) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'local';
    const usage = await checkAndIncrementUsage(c.env?.DB, `ip:${ip}`, 'research', DAILY_FREE_TOOL_LIMIT);
    if (!usage.allowed) {
      return c.json({ error: 'Daily research limit reached.', limitReached: true }, 429);
    }

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }
    const parsed = ResearchSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }

    const fetchedCompetitors: CompetitorEntry[] = [];
    for (const url of parsed.data.urls.slice(0, 4)) {
      if (!isSafePublicHttpsUrl(url)) continue;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'ListLiftBot/1.0 (+https://listlift.com)' },
          redirect: 'error',
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const html = (await res.text()).slice(0, 250_000);
          const extracted = extractStructuredProductFromHtml(html, url);
          if (extracted) fetchedCompetitors.push(extracted);
        }
      } catch {
        // Respect timeouts/blocks gracefully
      }
    }

    return c.json({
      productName: parsed.data.productName,
      marketplace: parsed.data.marketplace,
      extractedCount: fetchedCompetitors.length,
      competitors: fetchedCompetitors,
    });
  });

  app.post('/api/v1/generate', async (c) => {
    let raw: Record<string, unknown>;
    try {
      raw = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }

    const ip = c.req.header('CF-Connecting-IP') ?? 'local';
    const token = typeof raw.turnstileToken === 'string' ? raw.turnstileToken : undefined;
    if (!(await verifyTurnstile(token, c.env?.TURNSTILE_SECRET_KEY, ip))) {
      return c.json({ error: 'Bot verification failed.' }, 403);
    }

    const isQuickTool = raw.sourceTool === 'title' || raw.sourceTool === 'description' || raw.sourceTool === 'tags';
    const toolBucket = isQuickTool ? 'free_tools' : 'studio';
    const dailyLimit = isQuickTool ? DAILY_FREE_TOOL_LIMIT : DAILY_STUDIO_LIMIT;

    const usage = await checkAndIncrementUsage(c.env?.DB, `ip:${ip}`, toolBucket, dailyLimit);
    if (!usage.allowed) {
      return c.json(
        {
          error: isQuickTool
            ? `You've used all ${dailyLimit} free quick-tool runs for today. Upgrade to Pro for unlimited photo-to-listing runs.`
            : `You've used all ${dailyLimit} free Studio runs for today. Upgrade to Pro for unlimited SKUs, all 8 marketplaces at once & Bulk CSV.`,
          limitReached: true,
          used: usage.count,
          limit: usage.limit,
          remaining: 0,
          upgradeUrl: '/pricing',
        },
        429,
      );
    }

    const parsed = StudioGenerateRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }

    // Enforce free-tier max marketplaces per run (1 for quick tools, 2 for Studio; prevents sourceTool limit spoofing)
    const maxMarkets = isQuickTool ? 1 : FREE_MAX_MARKETPLACES;
    const boundedReq = {
      ...parsed.data,
      marketplaces: parsed.data.marketplaces.slice(0, maxMarkets),
    };

    let imageDataUrl: string | undefined;
    if (typeof raw.imageDataUrl === 'string' && raw.imageDataUrl.length > 0) {
      if (raw.imageDataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
        return c.json({ error: 'Uploaded photo is too large. Please use an image under 300 KB.' }, 413);
      }
      if (!VALID_IMAGE_DATA_URL_RX.test(raw.imageDataUrl)) {
        return c.json({ error: 'Invalid image format. Only WebP, JPEG, or PNG photos are supported.' }, 400);
      }
      imageDataUrl = raw.imageDataUrl;
    }

    try {
      const result = await generateWithAutoFallback(
        boundedReq,
        {
          omnirouteBaseUrl: c.env?.OMNIROUTE_BASE_URL,
          omnirouteApiKey: c.env?.OMNIROUTE_API_KEY,
          omnirouteVisionModels: c.env?.OMNIROUTE_VISION_MODEL,
          omnirouteTextModels: c.env?.OMNIROUTE_TEXT_MODEL,
          geminiApiKey: c.env?.GEMINI_API_KEY,
          openrouterApiKey: c.env?.OPENROUTER_API_KEY,
          groqApiKey: c.env?.GROQ_API_KEY,
          geminiModels: c.env?.GEMINI_MODELS,
          openrouterModels: c.env?.OPENROUTER_MODELS,
          groqModels: c.env?.GROQ_MODELS,
        },
        { imageDataUrl },
      );
      return c.json({
        ...result,
        usage: { used: usage.count, limit: usage.limit, remaining: usage.remaining },
      });
    } catch (err) {
      console.error('[ListLift /api/v1/generate]', err);
      const message =
        err instanceof Error && !/(omniroute|gemini|openrouter|groq|api key)/i.test(err.message)
          ? err.message
          : 'Our listing engine is temporarily busy. Please try again in a few seconds.';
      return c.json({ error: message }, 503);
    }
  });

  app.post('/api/v1/score', async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }
    const parsed = ListingInputSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }
    return c.json(scoreListing(parsed.data));
  });

  app.post('/api/v1/title', async (c) => {
    let raw: Record<string, unknown>;
    try {
      raw = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }
    const ip = c.req.header('CF-Connecting-IP') ?? 'local';
    const token = typeof raw.turnstileToken === 'string' ? raw.turnstileToken : undefined;
    if (!(await verifyTurnstile(token, c.env?.TURNSTILE_SECRET_KEY, ip))) {
      return c.json({ error: 'Bot verification failed.' }, 403);
    }
    const parsed = TitleGenerateRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }
    return c.json(generateTitleOptions(parsed.data));
  });

  app.post('/api/v1/description', async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }
    const parsed = DescriptionGenerateRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }
    return c.json(generateDescriptionAndBullets(parsed.data));
  });

  app.post('/api/v1/tags', async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }
    const parsed = TagsGenerateRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }
    return c.json(generateTagsAndKeywords(parsed.data));
  });

  app.post('/api/v1/sku', async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }
    const parsed = SkuGenerateRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }
    return c.json(generateSkus(parsed.data));
  });

  app.post('/api/v1/compare', async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }
    const parsed = CompetitorCompareRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }
    return c.json(compareCompetitors(parsed.data));
  });

  app.post('/api/v1/share', async (c) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'local';
    const usage = await checkAndIncrementUsage(c.env?.DB, `ip:${ip}`, 'share', DAILY_SHARE_LIMIT);
    if (!usage.allowed) {
      return c.json({ error: 'Daily share link limit reached.', limitReached: true }, 429);
    }

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400);
    }
    const serializedLen = JSON.stringify(raw ?? {}).length;
    if (serializedLen > MAX_SHARE_PAYLOAD_CHARS) {
      return c.json({ error: 'Share payload too large.' }, 413);
    }
    const parsed = ShareCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed.', details: parsed.error.flatten() }, 400);
    }

    const slug = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const expiresAt =
      parsed.data.expiry === '24h'
        ? new Date(now + 24 * 3600 * 1000).toISOString()
        : parsed.data.expiry === '7d'
          ? new Date(now + 7 * 24 * 3600 * 1000).toISOString()
          : null;

    memoryShares.set(slug, { id: slug, slug, payload: parsed.data.listing, expiresAt });

    if (c.env?.DB) {
      try {
        await c.env.DB.prepare(
          `INSERT INTO listings (id, input_json, marketplace, output_json, score, share_slug, is_public)
           VALUES (?, '{}', 'multi', ?, 90, ?, 1)`,
        )
          .bind(slug, JSON.stringify(parsed.data.listing), slug)
          .run();
      } catch {
        // Fallback to memory store in local dev
      }
    }

    return c.json({
      slug,
      shareUrl: `/l/#${slug}`,
      expiresAt,
      noindex: true,
    });
  });

  app.get('/api/v1/listings/:id', async (c) => {
    const id = c.req.param('id');
    const mem = memoryShares.get(id);
    if (mem) return c.json(mem);

    if (c.env?.DB) {
      try {
        const row = await c.env.DB.prepare(
          `SELECT id, share_slug, output_json, created_at FROM listings WHERE id = ? OR share_slug = ?`,
        )
          .bind(id, id)
          .first<{ id: string; share_slug: string; output_json: string; created_at: string }>();
        if (row) {
          return c.json({
            id: row.id,
            slug: row.share_slug,
            payload: JSON.parse(row.output_json),
            createdAt: row.created_at,
          });
        }
      } catch {
        // ignore
      }
    }
    return c.json({ error: 'Shared listing not found or expired.' }, 404);
  });

  app.post('/api/webhooks/payments', async (c) => {
    // Signature verification placeholder until founder confirms Razorpay / Paddle / Lemon Squeezy / Dodo
    return c.json({ received: true, mode: 'test-stub' });
  });

  app.all('*', async (c) => {
    if (c.env?.ASSETS) {
      return c.env.ASSETS.fetch(c.req.raw);
    }
    return c.json({ error: 'Not found' }, 404);
  });

  return app;
}

const app = createApp();
export default app;
