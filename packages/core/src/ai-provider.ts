import { requireMarketplaceSkill } from '@listlift/skills';
import { scoreListing } from './scorer.js';
import {
  generateStudioListings,
  type MarketplaceListingOutput,
  type StudioGenerateRequest,
  type StudioGenerateResult,
} from './studio.js';

export type AiProviderId = 'omniroute' | 'gemini' | 'openrouter' | 'groq' | 'openai';

export interface AiModelOption {
  id: string;
  label: string;
  supportsVision?: boolean;
  supportsWebSearch?: boolean;
  /** True ONLY when this model has a verified $0 / ₹0 Free Tier */
  isFreeTier?: boolean;
}

export const PROVIDER_MODELS: Record<AiProviderId, readonly AiModelOption[]> = {
  omniroute: [
    {
      id: 'auto',
      label: 'OmniRoute Auto Gateway (Priority #1 · Multi-Provider Free Pool)',
      supportsVision: true,
      isFreeTier: true,
    },
  ],
  gemini: [
    {
      id: 'gemini-3.5-flash-lite',
      label: 'Gemini 3.5 Flash-Lite (₹0 Free Tier · Vision + Fast)',
      supportsVision: true,
      supportsWebSearch: false,
      isFreeTier: true,
    },
    {
      id: 'gemini-3.8-flash',
      label: 'Gemini 3.8 Flash (₹0 Free Tier · Best Vision Quality)',
      supportsVision: true,
      supportsWebSearch: false,
      isFreeTier: true,
    },
    {
      id: 'gemini-3.6-flash',
      label: 'Gemini 3.6 Flash (₹0 Free Tier · Vision)',
      supportsVision: true,
      supportsWebSearch: false,
      isFreeTier: true,
    },
  ],
  openrouter: [
    {
      id: 'openrouter/free',
      label: 'OpenRouter Free Auto-Router (₹0 Free · Auto Vision)',
      supportsVision: true,
      isFreeTier: true,
    },
  ],
  groq: [
    {
      id: 'openai/gpt-oss-120b',
      label: 'OpenAI GPT OSS 120B (₹0 Free Tier · Text Only)',
      supportsVision: false,
      isFreeTier: true,
    },
    {
      id: 'openai/gpt-oss-20b',
      label: 'OpenAI GPT OSS 20B (₹0 Free Tier · Fast · Text Only)',
      supportsVision: false,
      isFreeTier: true,
    },
    {
      id: 'llama-3.1-8b-instant',
      label: 'Meta Llama 3.1 8B Instant (₹0 Free Tier · Text Only)',
      supportsVision: false,
      isFreeTier: true,
    },
    {
      id: 'llama-3.3-70b-versatile',
      label: 'Meta Llama 3.3 70B Versatile (Text Only)',
      supportsVision: false,
      isFreeTier: true,
    },
  ],
  openai: [
    {
      id: 'gpt-4o-mini',
      label: 'GPT-4o mini (PAID API — blocked in Free-Only mode)',
      supportsVision: true,
      isFreeTier: false,
    },
    {
      id: 'gpt-4.1-mini',
      label: 'GPT-4.1 mini (PAID API — blocked in Free-Only mode)',
      supportsVision: true,
      isFreeTier: false,
    },
  ],
};

export function getDefaultModelForProvider(provider: AiProviderId): string {
  return PROVIDER_MODELS[provider][0]?.id ?? 'gemini-3.5-flash-lite';
}

export function isModelFreeTierSafe(provider: AiProviderId, modelId: string): boolean {
  if (provider === 'omniroute') return true;
  if (provider === 'openai') return false;
  if (provider === 'openrouter') return modelId === 'openrouter/free' || modelId.endsWith(':free');
  if (provider === 'gemini') return /flash/i.test(modelId) && !/pro-exp-paid|ultra/i.test(modelId);
  if (provider === 'groq') return true;
  return false;
}

export function isBillingOrQuotaError(message: string): boolean {
  return /\b(402|429|quota|billing|payment|credit|exceeded|resource_exhausted|insufficient_quota|rate_limit)\b/i.test(
    message,
  );
}

export function modelSupportsVision(provider: AiProviderId, modelId: string): boolean {
  if (provider === 'omniroute' || provider === 'gemini' || provider === 'openai' || provider === 'openrouter') return true;
  const known = PROVIDER_MODELS[provider].find((m) => m.id === modelId);
  if (known) return Boolean(known.supportsVision);
  return /vision|llama-4|scout|maverick/i.test(modelId);
}

export async function fetchLiveProviderModels(
  provider: AiProviderId,
  apiKey: string,
): Promise<AiModelOption[]> {
  if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    if (!res.ok) throw new Error(`Gemini models check failed (${res.status})`);
    const data = (await res.json()) as {
      models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
    };
    const filtered = (data.models ?? [])
      .filter(
        (m) =>
          m.supportedGenerationMethods?.includes('generateContent') &&
          /flash/i.test(m.name) &&
          !/tts|audio|image-gen|live/i.test(m.name),
      )
      .map((m) => {
        const id = m.name.replace(/^models\//, '');
        return { id, label: `${id} (Vision · Free Tier)`, supportsVision: true, isFreeTier: true };
      });
    return filtered.length > 0 ? filtered : [...PROVIDER_MODELS.gemini];
  }
  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Groq models check failed (${res.status})`);
    const data = (await res.json()) as { data?: Array<{ id: string; active?: boolean }> };
    const filtered = (data.data ?? [])
      .filter((m) => m.active !== false && !/whisper|guard|tts|playai/i.test(m.id))
      .map((m) => ({
        id: m.id,
        label: /llama-4|vision|scout|maverick/i.test(m.id) ? `${m.id} (Vision)` : m.id,
        supportsVision: /llama-4|vision|scout|maverick/i.test(m.id),
        isFreeTier: true,
      }));
    return filtered.length > 0 ? filtered : [...PROVIDER_MODELS.groq];
  }
  return [...PROVIDER_MODELS[provider]];
}

export interface AiProviderConfig {
  provider: AiProviderId;
  apiKey: string;
  model?: string;
  /** Optional OpenAI-compatible gateway base URL (used for OmniRoute, e.g. http://localhost:20128/v1) */
  baseUrl?: string;
  /** Optional request timeout in milliseconds (used to fail fast if OmniRoute is offline) */
  timeoutMs?: number;
  /** Base64 data URL (image/webp or image/jpeg) for vision inspection */
  imageDataUrl?: string;
  /** Enable paid Google Search grounding (ALWAYS disabled when strictFreeOnly is true!) */
  enableWebResearch?: boolean;
  /** Hard ₹0 / $0 billing guard — blocks paid models and paid grounding tools */
  strictFreeOnly?: boolean;
}

interface RawAiMarketplaceCopy {
  title?: string;
  alternateTitles?: string[];
  shortDescription?: string;
  longDescription?: string;
  bullets?: string[];
  tags?: string[];
  searchTerms?: string;
  seoTitle?: string;
  metaDescription?: string;
  attributes?: Array<{ key: string; value: string }>;
}

export interface SimilarProductInsight {
  title: string;
  marketplace: string;
  price?: string;
  takeaways: string[];
}

interface RawAiRoot {
  imageAnalysis?: string;
  imageTextMismatch?: string | null;
  competitorPriceBand?: { min?: number; median?: number; max?: number; currency?: string };
  keywordGaps?: string[];
  similarProducts?: SimilarProductInsight[];
  listings?: Record<string, RawAiMarketplaceCopy | undefined>;
}

/**
 * Compact, single-call batched prompt:
 * 1. Inspects image FIRST as ground truth.
 * 2. Compares any user text against the image and flags mismatches.
 * 3. Uses live web research (when enabled on Gemini) to find real competitor keywords & price bands.
 * 4. Fills ALL required listing fields concisely under strict token caps.
 */
function buildBatchedPrompt(
  req: StudioGenerateRequest,
  hasImage: boolean,
  hasWebSearch: boolean,
): string {
  const rulesBlock = req.marketplaces
    .map((id) => {
      const s = requireMarketplaceSkill(id);
      const tMax = s.fields.title.max ?? 140;
      const bMax = s.fields.bullets?.count_max ?? 5;
      const tagCnt = s.fields.tags?.count_max ?? 10;
      const tagLen = s.fields.tags?.each_max ?? 20;
      return `${id}: title<=${tMax}c, ${bMax} bullets, ${tagCnt} tags(<=${tagLen}c), banned:[${s.banned_patterns.slice(0, 5).join(',')}]`;
    })
    .join('\n');

  const facts: string[] = [];
  if (req.productName && req.productName !== 'Uploaded Product') {
    facts.push(`User text: ${req.productName}`);
  }
  if (req.brand) facts.push(`Brand: ${req.brand}`);
  if (req.category && req.category !== 'General') facts.push(`Category: ${req.category}`);
  if (req.material) facts.push(`Material: ${req.material}`);
  if (req.sizeOrQuantity) facts.push(`Size/Qty: ${req.sizeOrQuantity}`);
  if (req.audienceOrUseCase) facts.push(`Use: ${req.audienceOrUseCase}`);
  if ((req.hardFacts?.length ?? 0) > 0) facts.push(`Locked facts: ${req.hardFacts.join('; ')}`);
  if ((req.keywords?.length ?? 0) > 0) facts.push(`Keywords: ${req.keywords.join(', ')}`);

  return [
    `Return ONLY valid JSON (no markdown, no prose) with this exact structure:`,
    `{"imageAnalysis":"1-sentence visual description of the product in the image","imageTextMismatch":"string or null if user text matches image","competitorPriceBand":{"min":0,"median":0,"max":0,"currency":"USD"},"keywordGaps":["term1","term2"],"similarProducts":[{"title":"Comparable top-selling product title","marketplace":"${req.marketplaces[0] ?? 'amazon'}","price":"$19.99","takeaways":["keyword or angle borrowed","formatting pattern"]}],"listings":{"<marketplace>":{"title":"","alternateTitles":["",""],"shortDescription":"","longDescription":"","bullets":[""],"tags":[""],"searchTerms":"","seoTitle":"","metaDescription":"","attributes":[{"key":"","value":""}]}}}`,
    ``,
    `CRITICAL INSTRUCTIONS:`,
    hasImage
      ? `1. IMAGE IS PRIMARY SOURCE OF TRUTH. Inspect the attached photo first (exact product type, color, visible finish/material, pattern, shape, style).`
      : `1. Base all facts strictly on the user input.`,
    hasImage
      ? `2. COMPARE user text against the image. If user text names a DIFFERENT product than what is in the image, set "imageTextMismatch" explaining the conflict and generate ALL listing fields based on the IMAGE, NOT the conflicting text.`
      : `2. Set "imageTextMismatch": null.`,
    `3. WRITE LIKE A REAL HUMAN TOP SELLER — NOT AN AI. STRICTLY BAN buzzwords & AI clichés: never use "elevate", "seamless", "timeless elegance", "crafted with precision", "unparalleled", "game-changer", "must-have", "effortlessly", "sleek design", "upgrade your", "delve", "boasts", "stunning", or "ultimate".`,
    `4. REAL BUYER SEO & RELATABLE COPY: Front-load exact search terms real shoppers type (item type + shape/pattern + color/finish + style/occasion + recipient). Write concrete, practical bullets & descriptions buyers actually care about (look/texture, everyday comfort/use, gifting occasion, care/storage) with natural long-tail keywords and zero keyword stuffing.`,
    `5. In "similarProducts", include 3 realistic comparable listings in this exact product category on ${req.marketplaces.join('/')} and explain in "takeaways" what real buyer search keywords, angles, and price positioning were drawn from them. Populate realistic global USD "competitorPriceBand" (min/median/max) and high-intent "keywordGaps".`,
    `6. Fill EVERY field completely (title, 2 alternateTitles, shortDescription, longDescription <=110 words, all bullets, all tags, searchTerms, seoTitle<=60c, metaDescription<=160c, attributes). NEVER invent unverified certifications, purity stamps (e.g. 24K/925), or medical claims.`,
    `Tone: ${req.tone} | Language: ${req.language}`,
    `MARKETPLACE LIMITS:\n${rulesBlock}`,
    facts.length > 0 ? `USER INPUT:\n${facts.join('\n')}` : `USER INPUT: None — identify everything directly from the attached product photo.`,
  ].join('\n');
}

function extractJsonRoot(rawText: string): RawAiRoot {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('AI response did not contain valid JSON.');
  }
  return JSON.parse(candidate.slice(start, end + 1)) as RawAiRoot;
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m?.[1] || !m?.[2]) return null;
  return { mimeType: m[1], base64: m[2] };
}

interface ProviderCallOutput {
  text: string;
  webSources: Array<{ title: string; url: string }>;
  searchQueries: string[];
}

async function callProviderBatched(
  prompt: string,
  config: AiProviderConfig,
  marketplaceCount: number,
): Promise<ProviderCallOutput> {
  const modelId = config.model || getDefaultModelForProvider(config.provider);
  const strictFree = config.strictFreeOnly !== false;

  // HARD ₹0 / $0 BILLING GUARD: refuse paid models & paid Google Search grounding in Free-Only mode
  if (strictFree && !isModelFreeTierSafe(config.provider, modelId)) {
    throw new Error(
      `FREE_GUARD_BLOCKED: Model "${modelId}" on "${config.provider}" is a paid API model. Blocked to guarantee ₹0 spend.`,
    );
  }

  const maxTokens = Math.min(2600, Math.max(1200, marketplaceCount * 800));
  const img = config.imageDataUrl ? parseDataUrl(config.imageDataUrl) : null;
  // Google Search Grounding is NOT available on Gemini Free Tier ($14/1k on paid tier) — ALWAYS OFF in strictFree mode!
  const useWebSearch = !strictFree && config.provider === 'gemini' && config.enableWebResearch === true;

  if (config.provider === 'gemini') {
    const model = config.model || getDefaultModelForProvider('gemini');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const parts: Array<Record<string, unknown>> = [];
    if (img) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
    }
    parts.push({ text: prompt });

    const body: Record<string, unknown> = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens,
        ...(useWebSearch ? {} : { responseMimeType: 'application/json' }),
      },
      ...(useWebSearch ? { tools: [{ google_search: {} }] } : {}),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 180)}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        groundingMetadata?: {
          webSearchQueries?: string[];
          groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
        };
      }>;
    };
    const cand = data.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('Gemini returned an empty response.');

    const webSources = (cand?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web)
      .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
      .map((w) => ({ title: w.title || w.uri, url: w.uri }));
    const searchQueries = cand?.groundingMetadata?.webSearchQueries ?? [];

    return { text, webSources, searchQueries };
  }

  const endpoint =
    config.provider === 'omniroute'
      ? `${(config.baseUrl || 'http://localhost:20128/v1').replace(/\/+$/, '')}/chat/completions`
      : config.provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : config.provider === 'openrouter'
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';
  const model = config.model || getDefaultModelForProvider(config.provider);
  const canSeeImage = modelSupportsVision(config.provider, model);

  // OpenRouter & OmniRoute recommend placing text part BEFORE image_url part
  const userContent =
    canSeeImage && config.imageDataUrl
      ? [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: config.imageDataUrl,
              ...(config.provider === 'openai' ? { detail: 'low' } : {}),
            },
          },
        ]
      : prompt;

  const extraHeaders: Record<string, string> =
    config.provider === 'openrouter'
      ? { 'HTTP-Referer': 'https://listlift.com', 'X-Title': 'ListLift' }
      : {};

  const authHeaders: Record<string, string> = config.apiKey
    ? { Authorization: `Bearer ${config.apiKey}` }
    : {};

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...extraHeaders,
    },
    ...(config.timeoutMs ? { signal: AbortSignal.timeout(config.timeoutMs) } : {}),
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0.3,
      max_tokens: maxTokens,
      ...(config.provider === 'omniroute' || config.provider === 'openrouter'
        ? { reasoning_effort: 'low' }
        : { response_format: { type: 'json_object' } }),
      messages: [
        { role: 'system', content: 'Return strict compact JSON only. Be concise.' },
        { role: 'user', content: userContent },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${config.provider} API error (${res.status}): ${errText.slice(0, 180)}`);
  }
  const rawBody = await res.text();
  let text = '';

  if (rawBody.trimStart().startsWith('data:')) {
    // Some gateways (e.g. OmniRoute combos) return SSE streams even when stream:false
    for (const line of rawBody.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
        };
        const piece = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? '';
        if (piece) text += piece;
      } catch {
        // ignore non-JSON SSE control frames
      }
    }
  } else {
    const data = JSON.parse(rawBody) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    text = data.choices?.[0]?.message?.content ?? '';
  }

  if (!text) throw new Error(`${config.provider} returned an empty response.`);
  return { text, webSources: [], searchQueries: [] };
}

export interface LiveStudioGenerateResult extends StudioGenerateResult {
  engine: string;
  imageAnalysis?: string;
  imageTextMismatch?: string | null;
  similarProducts?: SimilarProductInsight[];
  liveWebResearchUsed: boolean;
}

export interface ServerAiKeys {
  /** Priority #1: OmniRoute self-hosted/local AI gateway (e.g. http://localhost:20128/v1 or https://your-omniroute-vps/v1) */
  omnirouteBaseUrl?: string;
  omnirouteApiKey?: string;
  omnirouteVisionModels?: string[] | string;
  omnirouteTextModels?: string[] | string;
  /** Direct fallback free-tier API keys */
  geminiApiKey?: string;
  openrouterApiKey?: string;
  groqApiKey?: string;
  /** Optional comma-separated or array overrides from .env (GEMINI_MODELS, OPENROUTER_MODELS, GROQ_MODELS) */
  geminiModels?: string[] | string;
  openrouterModels?: string[] | string;
  groqModels?: string[] | string;
}

function parseModelList(input: string[] | string | undefined, defaults: string[]): string[] {
  if (!input) return defaults;
  const list = (Array.isArray(input) ? input : input.split(','))
    .map((m) => m.trim())
    .filter(Boolean);
  return list.length > 0 ? list : defaults;
}

function isUsableKey(key: string | undefined): key is string {
  if (!key) return false;
  const k = key.trim();
  if (!k) return false;
  if (/^(your_|paste_|replace_|xxx|changeme|local-)/i.test(k)) return false;
  return true;
}

// Per-UTC-day circuit breaker: if a provider+model hits 429/402/quota, cut it immediately for the rest of the day
const exhaustedToday = new Map<string, string>();
// Short 2-minute cooldown when OmniRoute is unreachable/offline so fallback is instant and auto-recovers
let omnirouteOfflineUntil = 0;

function isCircuitOpen(key: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return exhaustedToday.get(key) === today;
}

function tripCircuit(key: string): void {
  const today = new Date().toISOString().slice(0, 10);
  exhaustedToday.set(key, today);
}

/**
 * Automatic multi-provider ₹0 Free-Tier router with instant circuit-breaker failover:
 * - Priority #1 (when OMNIROUTE_BASE_URL is set): OmniRoute Gateway (works 24/7 on VPS or locally)
 * - Automatic Fallback (if OmniRoute is offline/rate-limited):
 *   - Image attached (Vision-first): Gemini Flash -> OpenRouter Free Vision
 *   - Text-only: Groq -> Gemini Flash -> OpenRouter Free
 * Never uses paid models or paid tools (strictFreeOnly = true).
 */
export async function generateWithAutoFallback(
  req: StudioGenerateRequest,
  keys: ServerAiKeys,
  options?: { imageDataUrl?: string },
): Promise<LiveStudioGenerateResult> {
  const hasImage = Boolean(options?.imageDataUrl);
  const chain: Array<{
    provider: AiProviderId;
    apiKey: string;
    model: string;
    baseUrl?: string;
    timeoutMs?: number;
  }> = [];

  const omnirouteUrl = keys.omnirouteBaseUrl?.trim();
  if (omnirouteUrl && /^https?:\/\//i.test(omnirouteUrl)) {
    const omniModels = hasImage
      ? parseModelList(keys.omnirouteVisionModels, ['auto/best-vision', 'auto'])
      : parseModelList(keys.omnirouteTextModels, ['auto/best-fast', 'auto']);
    if (hasImage && !omniModels.includes('auto/best-vision')) {
      omniModels.push('auto/best-vision');
    }
    for (const model of omniModels) {
      chain.push({
        provider: 'omniroute',
        apiKey: isUsableKey(keys.omnirouteApiKey) ? keys.omnirouteApiKey.trim() : '',
        model,
        baseUrl: omnirouteUrl,
        timeoutMs: hasImage ? 30000 : 20000,
      });
    }
  }

  const geminiVisionModels = parseModelList(keys.geminiModels, [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
  ]);
  const geminiTextModels = parseModelList(keys.geminiModels, [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
  ]);
  const openrouterModels = parseModelList(keys.openrouterModels, [
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3.5-super-vl:free',
    'openrouter/free',
  ]);
  const groqModels = parseModelList(keys.groqModels, ['openai/gpt-oss-120b', 'llama-3.1-8b-instant']);

  if (hasImage) {
    // Vision-capable ₹0 Free-Tier chain
    if (isUsableKey(keys.geminiApiKey)) {
      for (const model of geminiVisionModels) {
        chain.push({ provider: 'gemini', apiKey: keys.geminiApiKey.trim(), model });
      }
    }
    if (isUsableKey(keys.openrouterApiKey)) {
      for (const model of openrouterModels) {
        chain.push({ provider: 'openrouter', apiKey: keys.openrouterApiKey.trim(), model });
      }
    }
  } else {
    // Text-only ₹0 Free-Tier chain: Groq first (fast & separate quota), then Gemini, then OpenRouter
    if (isUsableKey(keys.groqApiKey)) {
      for (const model of groqModels) {
        chain.push({ provider: 'groq', apiKey: keys.groqApiKey.trim(), model });
      }
    }
    if (isUsableKey(keys.geminiApiKey)) {
      for (const model of geminiTextModels) {
        chain.push({ provider: 'gemini', apiKey: keys.geminiApiKey.trim(), model });
      }
    }
    if (isUsableKey(keys.openrouterApiKey)) {
      for (const model of openrouterModels) {
        chain.push({ provider: 'openrouter', apiKey: keys.openrouterApiKey.trim(), model });
      }
    }
  }

  const errors: string[] = [];
  const invalidProvidersThisRun = new Set<AiProviderId>();

  for (const step of chain) {
    const circuitKey = `${step.provider}:${step.model}`;
    if (invalidProvidersThisRun.has(step.provider)) {
      continue;
    }
    if (step.provider === 'omniroute' && Date.now() < omnirouteOfflineUntil) {
      errors.push(`${circuitKey} skipped (OmniRoute offline cooldown — falling back directly)`);
      continue;
    }
    if (isCircuitOpen(circuitKey)) {
      errors.push(`${circuitKey} skipped (daily free quota circuit-broken)`);
      continue;
    }

    try {
      return await generateStudioListingsWithAi(req, {
        provider: step.provider,
        apiKey: step.apiKey,
        model: step.model,
        baseUrl: step.baseUrl,
        timeoutMs: step.timeoutMs,
        imageDataUrl: options?.imageDataUrl,
        enableWebResearch: false,
        strictFreeOnly: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${circuitKey}: ${msg}`);
      if (step.provider === 'omniroute') {
        // Only trigger offline cooldown on connection refusal/unreachable (not slow model timeout)
        if (/fetch failed|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH/i.test(msg)) {
          omnirouteOfflineUntil = Date.now() + 2 * 60 * 1000;
        }
      } else {
        if (/API key not valid|INVALID_ARGUMENT|\b401\b/i.test(msg)) {
          invalidProvidersThisRun.add(step.provider);
          tripCircuit(circuitKey);
        } else if (isBillingOrQuotaError(msg) || /\b404\b/.test(msg)) {
          tripCircuit(circuitKey);
        }
      }
    }
  }

  if (errors.length > 0) {
    // Log detailed upstream diagnostics strictly on the server — NEVER expose provider/model names to users
    console.error('[ListLift AI Router]', errors.join(' | '));
  }

  if (hasImage && (!req.productName || req.productName === 'Uploaded Product')) {
    throw new Error(
      'Our visual listing engine is temporarily busy. Please try again in a few seconds, or add a short product line below.',
    );
  }

  // Graceful deterministic fallback ONLY when user supplied text
  const baseline = generateStudioListings(req);
  return {
    ...baseline,
    engine: 'ListLift Rules Engine',
    liveWebResearchUsed: false,
  };
}

export async function generateStudioListingsWithAi(
  req: StudioGenerateRequest,
  config: AiProviderConfig,
): Promise<LiveStudioGenerateResult> {
  const baseline = generateStudioListings(req);
  const model = config.model || getDefaultModelForProvider(config.provider);
  const strictFree = config.strictFreeOnly !== false;
  const hasImage = Boolean(config.imageDataUrl && modelSupportsVision(config.provider, model));
  const hasWebSearch = !strictFree && config.provider === 'gemini' && config.enableWebResearch === true;

  const prompt = buildBatchedPrompt(req, hasImage, hasWebSearch);
  const callOut = await callProviderBatched(prompt, config, req.marketplaces.length);
  const root = extractJsonRoot(callOut.text);
  const mapObj = (root.listings ?? {}) as Record<string, RawAiMarketplaceCopy | undefined>;

  const enrichedListings: MarketplaceListingOutput[] = baseline.listings.map((baseItem) => {
    const ai = mapObj[baseItem.marketplace] ?? {};
    const title = (ai.title || baseItem.title).trim();
    const alternateTitles =
      Array.isArray(ai.alternateTitles) && ai.alternateTitles.length > 0
        ? ai.alternateTitles.map((s) => String(s).trim()).filter(Boolean).slice(0, 2)
        : baseItem.alternateTitles;
    const shortDescription = (ai.shortDescription || baseItem.shortDescription).trim();
    const longDescription = (ai.longDescription || baseItem.longDescription).trim();
    const bullets =
      Array.isArray(ai.bullets) && ai.bullets.length > 0
        ? ai.bullets.map((s) => String(s).trim()).filter(Boolean)
        : baseItem.bullets;
    const tags =
      Array.isArray(ai.tags) && ai.tags.length > 0
        ? ai.tags.map((s) => String(s).trim()).filter(Boolean)
        : baseItem.tags;
    const searchTerms = (ai.searchTerms || baseItem.searchTerms).trim();
    const seoTitle = (ai.seoTitle || baseItem.seoMeta.seoTitle).trim();
    const metaDescription = (ai.metaDescription || baseItem.seoMeta.metaDescription).trim();

    const attributes =
      Array.isArray(ai.attributes) && ai.attributes.length > 0
        ? ai.attributes
            .filter((a) => a?.key && a?.value)
            .map((a) => ({
              key: String(a.key).trim(),
              value: String(a.value).trim(),
              source: 'inferred' as const,
            }))
        : baseItem.attributes;

    const score = scoreListing({
      marketplace: baseItem.marketplace as StudioGenerateRequest['marketplaces'][number],
      title,
      description: longDescription,
      bullets,
      tags,
      search_terms: searchTerms,
      seo_title: seoTitle,
      meta_description: metaDescription,
      target_keywords: req.keywords,
    });

    const formattedCopyAll = [
      `=== ${baseItem.marketplaceName.toUpperCase()} LISTING (SKU: ${baseItem.sku}) ===`,
      `TITLE:\n${title}`,
      '',
      `SHORT DESCRIPTION:\n${shortDescription}`,
      '',
      `BULLETS:\n${bullets.map((b) => `- ${b}`).join('\n')}`,
      '',
      `DESCRIPTION:\n${longDescription}`,
      '',
      `TAGS:\n${tags.join(', ')}`,
      '',
      `SEO TITLE: ${seoTitle}`,
      `SEO META: ${metaDescription}`,
    ].join('\n');

    return {
      ...baseItem,
      title,
      alternateTitles,
      shortDescription,
      longDescription,
      bullets,
      tags,
      searchTerms,
      attributes,
      seoMeta: { seoTitle, metaDescription },
      score,
      formattedCopyAll,
    };
  });

  // Replace synthetic evidence with REAL live web research whenever Gemini grounding returns sources
  const liveWebResearchUsed = callOut.webSources.length > 0;
  const aiBand = root.competitorPriceBand;
  const priceBand =
    aiBand && Number(aiBand.median) > 0
      ? {
          min: Number(aiBand.min || aiBand.median),
          median: Number(aiBand.median),
          max: Number(aiBand.max || aiBand.median),
          currency: aiBand.currency || 'USD',
          sampleSize: Math.max(callOut.webSources.length, 3),
        }
      : baseline.evidence.priceBand;

  const evidence = {
    ...baseline.evidence,
    queriesPlanned:
      callOut.searchQueries.length > 0 ? callOut.searchQueries : baseline.evidence.queriesPlanned,
    sources: liveWebResearchUsed
      ? callOut.webSources.slice(0, 8).map((s) => ({
          label: s.url,
          title: s.title,
          currency: priceBand?.currency ?? 'USD',
        }))
      : baseline.evidence.sources,
    keywordGaps:
      Array.isArray(root.keywordGaps) && root.keywordGaps.length > 0
        ? root.keywordGaps.map(String)
        : baseline.evidence.keywordGaps,
    priceBand,
  };

  const similarProducts: SimilarProductInsight[] =
    Array.isArray(root.similarProducts) && root.similarProducts.length > 0
      ? root.similarProducts
          .filter((p) => p && typeof p.title === 'string' && p.title.trim())
          .slice(0, 4)
          .map((p) => ({
            title: String(p.title).trim(),
            marketplace: String(p.marketplace || req.marketplaces[0] || 'amazon').trim(),
            price: p.price ? String(p.price).trim() : undefined,
            takeaways: Array.isArray(p.takeaways)
              ? p.takeaways.map((t) => String(t).trim()).filter(Boolean).slice(0, 3)
              : [],
          }))
      : enrichedListings[0]
        ? [
            {
              title: `${enrichedListings[0].title.slice(0, 62)} — Top Seller Pattern`,
              marketplace: enrichedListings[0].marketplaceName,
              price: priceBand ? `${priceBand.currency} ${priceBand.median}` : undefined,
              takeaways: ['Front-loaded buyer search phrase', 'Claim-safe material & finish cues'],
            },
          ]
        : [];

  return {
    ...baseline,
    evidence,
    listings: enrichedListings,
    // Brand-safe engine label — never exposes underlying AI vendor or model ID
    engine: hasImage ? 'ListLift Vision Engine' : 'ListLift Smart Engine',
    imageAnalysis: root.imageAnalysis,
    imageTextMismatch: root.imageTextMismatch || null,
    similarProducts,
    liveWebResearchUsed,
  };
}
