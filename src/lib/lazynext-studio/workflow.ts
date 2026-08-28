import { atlasImage } from '@/lib/providers/atlas-image';
import { atlasVideo } from '@/lib/providers/atlas-video';
import { emitProviderCalled, emitProviderCompleted } from '@/lib/observability/events';
import { getImageModel, getVideoModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';
import type { MarketingPlan, AdShot } from './schema';

/** in-app credit cost */
export const MK_PLAN_COST = 3;
export const MK_IMAGE_COST = 5; // per-shot image, priced at nano-banana-2's current ~$0.08
export const MK_VIDEO_COST = 12; // per-shot Seedance 2.0 i2v, priced at current ~$0.09 + SaaS margin

/** Resolve the shot image model, respecting env override and plan-tier routing. */
export function getShotImageModel(planTier?: PlanTier): string {
  return process.env.MK_SHOT_IMAGE_MODEL || getImageModel(planTier);
}
// ⚠️ Uses the old nano-banana/edit, not nano-banana-2/edit: testing shows the latter intermittently returns 400
// "Request parameters are invalid" (4 out of 6 times, ~50-75%), drama first frame almost always fails; old version tested with no 400, ~15s per image, quality sufficient for UGC/short drama.
export function getShotImageEditModel(planTier?: PlanTier): string {
  return process.env.MK_SHOT_IMAGE_EDIT_MODEL || getImageModel(planTier);
}
export function getShotVideoModel(planTier?: PlanTier): string {
  return process.env.MK_SHOT_VIDEO_MODEL || getVideoModel(planTier);
}
// Replica/generation video model: seedance-2.0/image-to-video — prompt includes dialogue + generate_audio for lip-synced speech,
// single step, cheapest (saves vs veo3.1), and respects user-selected duration. Testing shows prompt dialogue alone produces video with voiceover audio track, no TTS/reference_audios needed.
export function getReplicaVideoModel(planTier?: PlanTier): string {
  return process.env.MK_REPLICA_VIDEO_MODEL || getVideoModel(planTier);
}
// drama per-shot: feeds product image + character costume photo + scene image all at once to reference-to-video to directly produce video,
// prompt binds @image1.. in reference_images order; saves one lossy step vs "edit composite first frame → i2v", consistency locked by multi-reference.
export function getShotRefVideoModel(planTier?: PlanTier): string {
  return process.env.MK_SHOT_REF_VIDEO_MODEL || getVideoModel(planTier);
}

const RATIOS = new Set(['9:16', '16:9', '1:1', '4:3', '3:4']);
const VIDEO_RATIOS = new Set(['9:16', '16:9', '1:1', '4:3', '3:4', '21:9', 'adaptive']);
const VIDEO_RESOLUTIONS = new Set(['480p', '720p', '720p-SR', '1080p', '1080p-SR', '1440p-SR', '4k']);
const VIDEO_DURATIONS = new Set([-1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

export function normalizeRatio(v: unknown): string {
  return typeof v === 'string' && RATIOS.has(v) ? v : '9:16';
}
export function normalizeVideoRatio(v: unknown): string {
  return typeof v === 'string' && VIDEO_RATIOS.has(v) ? v : '9:16';
}
export function normalizeVideoResolution(v: unknown): string {
  return typeof v === 'string' && VIDEO_RESOLUTIONS.has(v) ? v : '720p';
}
export function normalizeVideoDuration(v: unknown): number {
  const n = Number(v);
  return VIDEO_DURATIONS.has(n) ? n : 15;
}
export function cleanText(v: unknown, fallback = '', max = 2000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) || fallback : fallback;
}
export function normalizeShotCount(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(2, Math.min(6, Math.round(n))) : 4;
}

/** Per-shot image prompt (no uploaded image): relies on text description to lock the product */
export function buildShotImagePrompt(plan: MarketingPlan, shot: AdShot): string {
  const text = `${plan.scene} ${shot.shot} ${shot.prompt}`.toLowerCase();
  const sceneOnly = text.includes('no presenter') || text.includes('no human') || text.includes('cinematic product scene');
  return [
    `ENGLISH ${plan.ratio} photo, ultra-photorealistic ${sceneOnly ? 'cinematic product advertising' : 'UGC social-media'} style, natural daylight, no filter.`,
    plan.character ? `Person: ${plan.character}.` : '',
    `Product (must look identical in every shot): ${plan.product}.`,
    plan.scene ? `Scene: ${plan.scene}.` : '',
    `Shot: ${shot.shot || 'medium selfie shot holding the product toward the camera'}.`,
    shot.prompt ? `Action and motion intent: ${shot.prompt}.` : '',
    sceneOnly
      ? 'Photorealistic environment, realistic physics, cinematic lighting, no text no watermark no logo.'
      : 'True-to-life skin tone, handheld selfie feel, upper body, no text no watermark no logo.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Per-shot image prompt (with uploaded real image): uses the real product/person from the input image, strongest consistency */
export function buildShotImageEditPrompt(plan: MarketingPlan, shot: AdShot, hasProduct: boolean, hasAvatar: boolean): string {
  const text = `${plan.scene} ${shot.shot} ${shot.prompt}`.toLowerCase();
  const wantsPresenter = hasAvatar || !!plan.character;
  const sceneOnly = text.includes('no presenter') || text.includes('no human') || text.includes('cinematic product scene');
  return [
    `ENGLISH ${plan.ratio} ultra-photorealistic UGC social-media photo, natural daylight, no filter.`,
    hasProduct
      ? 'Use the EXACT product shown in the provided product image — keep its shape, color, materials, logo and text pixel-identical, do not redesign it.'
      : `Product: ${plan.product}.`,
    wantsPresenter
      ? (hasAvatar
        ? 'Use the person shown in the provided avatar image as the presenter — keep the same face and identity.'
        : `Presenter: ${plan.character}.`)
      : '',
    wantsPresenter && !sceneOnly
      ? 'Compose them together: the presenter is holding / showing / using this exact product.'
      : 'Place the exact product naturally inside the requested cinematic scene; no presenter or human unless the request explicitly asks for one.',
    plan.scene ? `Scene: ${plan.scene}.` : '',
    `Shot: ${shot.shot || 'medium selfie shot holding the product toward the camera'}.`,
    shot.prompt ? `Action and motion intent: ${shot.prompt}.` : '',
    sceneOnly && !wantsPresenter
      ? 'Photorealistic environment, realistic physics, cinematic lighting, no added text no watermark no logo.'
      : 'Handheld selfie feel, true-to-life skin, upper body, no added text no watermark no logo.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** nano-banana image generation: with reference images uses edit (consumes real images), otherwise text-to-image */
export async function submitShotImage(prompt: string, ratio: string, refImages?: string[], planTier?: PlanTier) {
  const imgs = (refImages || []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 4);
  const imageModel = imgs.length ? getShotImageEditModel(planTier) : getShotImageModel(planTier);
  const t0 = Date.now();
  emitProviderCalled('', 'atlas-image', imageModel, { ratio, hasRef: imgs.length > 0 });
  try {
    if (imgs.length) {
      // ⚠️ nano-banana-2/edit's aspect ratio parameter is named image_size (value like '9:16'), not aspect_ratio.
      // Passing aspect_ratio or omitting the ratio param entirely, the submit returns 200 but GET prediction returns 400
      // "Request parameters are invalid" (drama first frame edit always reproduces; marketing replica avoided exposure via promptOverride fallback to t2i).
      // Tested: image_size:'9:16' → completed.
      return await atlasImage.generate({
        model: imageModel,
        prompt,
        referenceImages: imgs,
        imageField: 'images',
        extra: { image_size: ratio },
      });
    }
    return await atlasImage.generate({
      model: imageModel,
      prompt,
      ratio,
      extra: { resolution: '2k' },
    });
  } finally {
    emitProviderCompleted('', 'atlas-image', imageModel, Date.now() - t0);
  }
}

/** Seedance 2.0 image-to-video: first frame field is image, can natively generate dialogue/sound effects. */
export async function submitShotVideo(
  imageUrl: string,
  prompt: string,
  opts: { ratio?: unknown; resolution?: unknown; duration?: unknown; model?: string; planTier?: PlanTier } = {},
) {
  const model = typeof opts.model === 'string' && opts.model ? opts.model : getShotVideoModel(opts.planTier);
  const extra: Record<string, unknown> = {};
  if (model.includes('seedance-2.0')) {
    Object.assign(extra, {
      duration: normalizeVideoDuration(opts.duration),
      resolution: normalizeVideoResolution(opts.resolution),
      ratio: normalizeVideoRatio(opts.ratio),
      bitrate_mode: 'standard',
      generate_audio: true,
      watermark: false,
      return_last_frame: false,
    });
  }
  // Other models (veo3.1-fast etc.): only pass model/image/prompt, native audio + default duration, no seedance-specific fields.
  return atlasVideo.generate({ model, prompt, image: imageUrl, extra });
}

/** Seedance 2.0 reference-to-video: multiple reference images (product image/character costume photo/scene image) directly produce video.
 *  The prompt uses @image1, @image2… (in reference_images order) to bind each reference image, generate_audio produces dialogue. */
export async function submitShotRefVideo(
  referenceImages: string[],
  prompt: string,
  opts: { ratio?: unknown; resolution?: unknown; duration?: unknown; planTier?: PlanTier } = {},
) {
  const imgs = referenceImages.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 9);
  return atlasVideo.generate({
    model: getShotRefVideoModel(opts.planTier),
    prompt,
    referenceImages: imgs,
    extra: {
      duration: normalizeVideoDuration(opts.duration),
      resolution: normalizeVideoResolution(opts.resolution),
      ratio: normalizeVideoRatio(opts.ratio),
      bitrate_mode: 'standard',
      generate_audio: true,
      watermark: false,
      return_last_frame: false,
    },
  });
}
