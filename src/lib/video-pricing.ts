/**
 * Dynamic media billing: video/edit/lip-sync charges credits based on real cost of "seconds × resolution" (no longer fixed COST).
 * Per-second unit price comes from production Grafana `kubedl.model.price` (verified 2026-07-16).
 * Fixed COST for image/text/audio is unchanged (they aren't loss-making); this module only handles video types that float by duration/resolution.
 *
 * Credits = ⌈ per-second unit price[resolution] × seconds × ACCOUNT_MARKUP × MARGIN / CREDIT_USD ⌉
 */

// Atlas per-second unit price (USD, excluding account markup), from Grafana kubedl.model.price sku+formula
const PER_SEC_USD: Record<string, Partial<Record<string, number>>> = {
  // seedance: by resolution × seconds; '*' won't match, all resolutions listed
  'bytedance/seedance-2.0/reference-to-video': { '480p': 0.112, '720p': 0.242, '1080p': 0.544, '4k': 1.24, '720p-SR': 0.202, '1080p-SR': 0.435, '1440p-SR': 0.774 },
  'bytedance/seedance-2.0/image-to-video':     { '480p': 0.112, '720p': 0.242, '1080p': 0.544, '4k': 1.24 },
  'bytedance/seedance-2.0-fast/reference-to-video': { '480p': 0.112, '720p': 0.242, '1080p': 0.544 },
  'google/gemini-omni-flash/video-edit':  { '*': 0.14 },   // by reference video seconds (3–30s)
  'kwaivgi/kling-v2.6-pro/motion-control': { '*': 0.112 }, // by driving video seconds
  'google/veo3.1/reference-to-video':      { '720p': 0.4, '1080p': 0.4, '4k': 0.6 }, // includes audio 0.2/s
  'veed/lipsync':                          { '*': 0.0132 }, // by audio/output duration
};

export const ACCOUNT_MARKUP = 1.2; // our account is marked up 20% by Atlas (model_discount, production 96.6% account is at this tier)
export const MARGIN = 1.5;         // target margin: selling price = real cost × 1.5 (≈50% margin)
export const CREDIT_USD = 0.065;   // Pro tier: 1 credit ≈ $0.065 selling price
const MIN_VIDEO_CREDITS = 2;

function rateForModel(model: string, resolution?: string): number {
  const table = PER_SEC_USD[model];
  if (!table) return 0.25; // conservative per-second fallback for unknown models
  const nums = Object.values(table).filter((v): v is number => typeof v === 'number');
  return table[resolution || ''] ?? table['*'] ?? Math.max(...nums);
}

/** Video/edit/lip-sync: compute credits to deduct by seconds × resolution. seconds = duration (e.g. shot duration / reference video duration / audio duration). */
export function videoCredits(model: string, resolution: string | undefined, seconds: number): number {
  const sec = Math.max(1, Math.ceil(seconds || 0));
  const costUsd = rateForModel(model, resolution) * sec * ACCOUNT_MARKUP;
  return Math.max(MIN_VIDEO_CREDITS, Math.ceil((costUsd * MARGIN) / CREDIT_USD));
}

/** Frontend estimate of the same (displays "estimated X credits"). */
export const estimateVideoCredits = videoCredits;
