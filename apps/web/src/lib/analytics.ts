import type { MarketplaceId } from '@listlift/skills';

export type ListLiftEventName =
  | 'visit'
  | 'command_bar_focus'
  | 'photo_drop'
  | 'sample_click'
  | 'result_view'
  | 'copy'
  | 'autofill_click'
  | 'share'
  | 'csv_click'
  | 'limit_hit'
  | 'paywall_view'
  | 'upgrade_click'
  | 'checkout_start'
  | 'subscribe'
  | 'day2_return'
  | 'referral_sent';

export interface TrackedEvent {
  event: ListLiftEventName;
  ts: string;
  props?: Record<string, string | number | boolean | null | undefined>;
}

declare global {
  interface Window {
    __listliftEvents?: TrackedEvent[];
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(
  event: ListLiftEventName,
  props?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === 'undefined') return;
  const entry: TrackedEvent = {
    event,
    ts: new Date().toISOString(),
    props,
  };
  try {
    window.__listliftEvents = window.__listliftEvents || [];
    window.__listliftEvents.push(entry);
    window.dispatchEvent(new CustomEvent('listlift:track', { detail: entry }));
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: `listlift_${event}`, ...props });
    }
  } catch {
    // never block UI on analytics
  }
}

/** Detect if visitor timezone or browser locale is India (for smart marketplace chip ordering). */
export function isIndiaGeo(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = navigator.language || '';
    return tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta' || /-IN$/i.test(lang);
  } catch {
    return false;
  }
}

export const INDIA_MARKET_ORDER: readonly MarketplaceId[] = [
  'flipkart',
  'meesho',
  'amazon',
  'shopify',
  'custom',
  'etsy',
  'ebay',
  'walmart',
  'shopee',
];

export const GLOBAL_MARKET_ORDER: readonly MarketplaceId[] = [
  'etsy',
  'amazon',
  'ebay',
  'shopify',
  'walmart',
  'custom',
  'flipkart',
  'meesho',
  'shopee',
];

export function getGeoOrderedMarketIds(): readonly MarketplaceId[] {
  return isIndiaGeo() ? INDIA_MARKET_ORDER : GLOBAL_MARKET_ORDER;
}

/** Generates a crisp studio sample product photo (gold ribbed heart stud earrings) as a lightweight WebP data URL. */
export async function createSampleProductPhoto(): Promise<{
  dataUrl: string;
  name: string;
  width: number;
  height: number;
  sizeKb: number;
}> {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Clean alabaster studio backdrop
    ctx.fillStyle = '#FAF8F3';
    ctx.fillRect(0, 0, 512, 512);

    // Soft studio shadow under earrings
    const shadow = ctx.createRadialGradient(256, 395, 20, 256, 395, 175);
    shadow.addColorStop(0, 'rgba(17, 18, 20, 0.14)');
    shadow.addColorStop(1, 'rgba(17, 18, 20, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(256, 395, 175, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw pair of sculpted gold ribbed heart stud earrings
    const drawHeart = (cx: number, cy: number, scale: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      const grad = ctx.createLinearGradient(-70, -70, 70, 80);
      grad.addColorStop(0, '#FFF1A8');
      grad.addColorStop(0.35, '#F5C542');
      grad.addColorStop(0.7, '#C98A15');
      grad.addColorStop(1, '#F7D86A');

      ctx.beginPath();
      ctx.moveTo(0, 82);
      ctx.bezierCurveTo(-92, 18, -98, -68, -42, -74);
      ctx.bezierCurveTo(-10, -77, 0, -44, 0, -34);
      ctx.bezierCurveTo(0, -44, 10, -77, 42, -74);
      ctx.bezierCurveTo(98, -68, 92, 18, 0, 82);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#A86E08';
      ctx.stroke();

      // Ribbed sculptural grooves inside heart
      ctx.clip();
      ctx.strokeStyle = 'rgba(130, 82, 5, 0.42)';
      ctx.lineWidth = 5;
      for (let i = -95; i <= 95; i += 18) {
        ctx.beginPath();
        ctx.moveTo(i - 30, -90);
        ctx.quadraticCurveTo(i + 15, 0, i - 10, 95);
        ctx.stroke();
      }
      ctx.restore();
    };

    drawHeart(168, 250, 1.05);
    drawHeart(344, 250, 1.05);
  }

  const dataUrl = canvas.toDataURL('image/webp', 0.88);
  const sizeKb = Math.max(1, Math.round((dataUrl.length * 0.75) / 1024));
  return {
    dataUrl,
    name: 'sample-gold-heart-earrings.webp',
    width: 512,
    height: 512,
    sizeKb,
  };
}
