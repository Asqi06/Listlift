import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

function loadEnvVars() {
  const vars = {};
  const candidates = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.join(__dirname, '.dev.vars'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && val) vars[key] = val;
    }
  }
  for (const key of [
    'OMNIROUTE_BASE_URL',
    'OMNIROUTE_API_KEY',
    'OMNIROUTE_VISION_MODEL',
    'OMNIROUTE_TEXT_MODEL',
    'GEMINI_API_KEY',
    'OPENROUTER_API_KEY',
    'GROQ_API_KEY',
    'GEMINI_MODELS',
    'OPENROUTER_MODELS',
    'GROQ_MODELS',
    'TURNSTILE_SECRET_KEY',
    'APP_ENV',
  ]) {
    if (process.env[key]) vars[key] = process.env[key];
  }
  return vars;
}

/**
 * Mounts the Hono Worker API on /api/* during `astro dev` so frontend tools call
 * real server-side AI endpoints reading keys strictly from .env / .dev.vars
 * (zero API keys ever exposed to the browser).
 */
function devHonoApiPlugin() {
  return {
    name: 'listlift-dev-hono-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        try {
          const mod = await server.ssrLoadModule('/src/worker/index.ts');
          const app = mod.createApp();
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
          const url = new URL(req.url, `http://${req.headers.host || 'localhost:4321'}`);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v);
          }
          const webReq = new Request(url, {
            method: req.method || 'GET',
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          });
          const webRes = await app.fetch(webReq, loadEnvVars());
          res.statusCode = webRes.status;
          webRes.headers.forEach((v, k) => res.setHeader(k, v));
          const buf = Buffer.from(await webRes.arrayBuffer());
          res.end(buf);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Dev API error' }));
        }
      });
    },
  };
}

export default defineConfig({
  site: 'https://listlift.com',
  output: 'static',
  integrations: [preact()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [devHonoApiPlugin()],
  },
});
