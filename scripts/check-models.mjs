#!/usr/bin/env node
/**
 * ListLift — Live Free-Tier API Key & Available Models Inspector
 * Run: npm run check-models
 *
 * Reads keys strictly from local .env / .env.local / apps/web/.dev.vars
 * and queries each provider's live /models endpoint so you can verify keys
 * and pick exact model IDs for GEMINI_MODELS, OPENROUTER_MODELS, GROQ_MODELS.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadEnv() {
  const vars = {};
  const loadedFiles = [];
  const candidates = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.join(rootDir, 'apps', 'web', '.dev.vars'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    loadedFiles.push(path.relative(rootDir, file));
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
  for (const k of [
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
  ]) {
    if (process.env[k]) vars[k] = process.env[k];
  }
  return { vars, loadedFiles };
}

function maskKey(key) {
  if (!key) return '(not set)';
  if (key.length <= 10) return `${key.slice(0, 3)}***`;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function isPlaceholder(key) {
  return !key || /^(your_|paste_|replace_|xxx|changeme)/i.test(key.trim());
}

async function checkOmniRoute(baseUrl, apiKey) {
  console.log('\n── 0. OmniRoute Gateway (PRIORITY #1 · Multi-Provider Pool) ──');
  console.log(`   URL: ${baseUrl || '(not set)'}`);
  if (!baseUrl) {
    console.log('   Status: NOT CONFIGURED (set OMNIROUTE_BASE_URL=http://localhost:20128/v1 or your 24/7 VPS URL in .env)');
    return;
  }
  const url = `${baseUrl.replace(/\/+$/, '')}/models`;
  try {
    const headers = apiKey && !isPlaceholder(apiKey) ? { Authorization: `Bearer ${apiKey}` } : {};
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      const txt = await res.text();
      console.log(`   Status: ERROR (${res.status}) -> ${txt.slice(0, 180)}`);
      return;
    }
    const data = await res.json();
    const models = (data.data || []).map((m) => m.id).filter(Boolean);
    console.log(`   Status: ONLINE (${models.length} models/combos available — ListLift will use this FIRST)`);
    for (const m of models.slice(0, 15)) {
      console.log(`     - ${m}`);
    }
  } catch (err) {
    console.log(`   Status: OFFLINE / UNREACHABLE (${err.message}) -> ListLift will auto-fallback to direct providers below.`);
  }
}

async function checkGemini(apiKey) {
  console.log('\n── 1. Google Gemini (Vision + Text · Free Tier) ──');
  console.log(`   Key: ${maskKey(apiKey)}`);
  if (!apiKey || isPlaceholder(apiKey)) {
    console.log('   Status: NOT CONFIGURED (paste a real key from https://aistudio.google.com/apikey into .env)');
    return;
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) {
      const txt = await res.text();
      console.log(`   Status: INVALID / ERROR (${res.status}) -> ${txt.slice(0, 180)}`);
      return;
    }
    const data = await res.json();
    const models = (data.models || [])
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((name) => /gemini/i.test(name) && !/embedding|aqa|imagen|veo|tts/i.test(name));

    console.log(`   Status: VALID KEY (${models.length} generateContent Gemini models available)`);
    console.log('   Recommended Flash models (copy into GEMINI_MODELS in .env):');
    const flash = models.filter((m) => /flash/i.test(m));
    for (const m of (flash.length ? flash : models).slice(0, 15)) {
      console.log(`     - ${m}`);
    }
  } catch (err) {
    console.log(`   Status: NETWORK ERROR -> ${err.message}`);
  }
}

async function checkOpenRouter(apiKey) {
  console.log('\n── 2. OpenRouter (Free Vision + Text · $0 models) ──');
  console.log(`   Key: ${maskKey(apiKey)}`);
  if (!apiKey || isPlaceholder(apiKey)) {
    console.log('   Status: NOT CONFIGURED (get a free key at https://openrouter.ai/keys and paste into .env)');
    return;
  }
  try {
    const authRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!authRes.ok) {
      const txt = await authRes.text();
      console.log(`   Status: INVALID / ERROR (${authRes.status}) -> ${txt.slice(0, 180)}`);
      return;
    }
    console.log('   Status: VALID KEY');
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (res.ok) {
      const data = await res.json();
      const freeModels = (data.data || []).filter((m) => {
        const p = m.pricing || {};
        return String(p.prompt) === '0' && String(p.completion) === '0';
      });
      const freeVision = freeModels.filter((m) => {
        const mods = m.architecture?.input_modalities || [];
        return mods.includes('image') || /vision|vl|gemini|llama-4|pixtral|qwen.*vl|gemma-3/i.test(m.id);
      });
      console.log(`   Found ${freeModels.length} total $0 free models (${freeVision.length} with Vision):`);
      console.log('     - openrouter/free   (recommended auto-router)');
      for (const m of freeVision.slice(0, 12)) {
        console.log(`     - ${m.id}`);
      }
    }
  } catch (err) {
    console.log(`   Status: NETWORK ERROR -> ${err.message}`);
  }
}

async function checkGroq(apiKey) {
  console.log('\n── 3. Groq (Fast Text Fallback · Free Tier) ──');
  console.log(`   Key: ${maskKey(apiKey)}`);
  if (!apiKey || isPlaceholder(apiKey)) {
    console.log('   Status: NOT CONFIGURED (get a free key at https://console.groq.com/keys and paste into .env)');
    return;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const txt = await res.text();
      console.log(`   Status: INVALID / ERROR (${res.status}) -> ${txt.slice(0, 180)}`);
      return;
    }
    const data = await res.json();
    const models = (data.data || [])
      .map((m) => m.id)
      .filter((id) => !/whisper|guard|tts|playai/i.test(id))
      .sort();
    console.log(`   Status: VALID KEY (${models.length} text/chat models available):`);
    for (const m of models.slice(0, 15)) {
      console.log(`     - ${m}`);
    }
  } catch (err) {
    console.log(`   Status: NETWORK ERROR -> ${err.message}`);
  }
}

async function main() {
  const { vars, loadedFiles } = loadEnv();
  console.log('ListLift AI Key & Model Inspector');
  console.log('Loaded env files:', loadedFiles.length ? loadedFiles.join(', ') : '(none found — create .env in project root)');
  console.log('Current model overrides in .env:');
  console.log(`  OMNIROUTE_BASE_URL     = ${vars.OMNIROUTE_BASE_URL || '(not set)'}`);
  console.log(`  OMNIROUTE_VISION_MODEL = ${vars.OMNIROUTE_VISION_MODEL || '(default: auto)'}`);
  console.log(`  OMNIROUTE_TEXT_MODEL   = ${vars.OMNIROUTE_TEXT_MODEL || '(default: auto)'}`);
  console.log(`  GEMINI_MODELS          = ${vars.GEMINI_MODELS || '(default: gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.6-flash)'}`);
  console.log(`  OPENROUTER_MODELS      = ${vars.OPENROUTER_MODELS || '(default: google/gemma-4-31b-it:free,nvidia/nemotron-3.5-super-vl:free,openrouter/free)'}`);
  console.log(`  GROQ_MODELS            = ${vars.GROQ_MODELS || '(default: openai/gpt-oss-120b,llama-3.1-8b-instant)'}`);

  await checkOmniRoute(vars.OMNIROUTE_BASE_URL, vars.OMNIROUTE_API_KEY);
  await checkGemini(vars.GEMINI_API_KEY);
  await checkOpenRouter(vars.OPENROUTER_API_KEY);
  await checkGroq(vars.GROQ_API_KEY);

  console.log('\nTip: To change models, add GEMINI_MODELS, OPENROUTER_MODELS, or GROQ_MODELS (comma-separated) in .env and restart `npm run dev`.\n');
}

main();
