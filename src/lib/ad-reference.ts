import { submitRawGen } from '@/lib/atlas';

/**
 * Viral Ad Replica (Ad Reference): upload a reference ad video, replace the person/product/voice/lines with your own.
 * Core = google/gemini-omni-flash/video-edit swaps both the on-screen person and product in one step (edits the original footage, preserves camera motion/pacing/native audio),
 * optional elevenlabs new voiceover + veed/lipsync for lip-sync (swap voice and lines).
 * 2026-07-16: Wan-2.2/animate-mix person-swap quality is poor and doesn't replicate the original footage's actions (re-encodes camera motion/composition/wardrobe), reverted to pure omni —
 * one video-edit swaps person + product (scratchpad/e2e-swap tests show it crushes seedance regeneration);
 * omni person-swap occasionally fails async (1010002), covered by frontend submit+poll auto-retry fallback.
 */

export const AD_REF_EDIT_MODEL = 'google/gemini-omni-flash/video-edit';
// Person-swap has been merged into edit (same omni video-edit swaps person + product). This constant is only for backward compat with the old /character endpoint, also uses omni.
export const AD_REF_CHARACTER_MODEL = 'google/gemini-omni-flash/video-edit';
export const AD_REF_TTS_MODEL = 'elevenlabs/v3/text-to-speech';
export const AD_REF_LIPSYNC_MODEL = 'veed/lipsync';
// Fallback person-swap: when omni swapping a real person hits deepfake (1010002), switch to kling motion transfer — on-screen person image + original video as motion source,
// letting your person perform the original footage's actions (driving your own image, not tampering with the original video's real person, avoiding 1010002). kling input image/video ≤10MB.
export const AD_REF_MOTION_MODEL = 'kwaivgi/kling-v2.6-pro/motion-control';

// in-app credit cost: roughly proportional to Atlas real-time cost + SaaS margin pricing.
export const AD_REF_EDIT_COST = 15;
export const AD_REF_CHARACTER_COST = 15;
export const AD_REF_VOICE_COST = 10;
export const AD_REF_LIPSYNC_COST = 2;
export const AD_REF_MOTION_COST = 15;

// gemini-omni video-edit input limits: ≤100MB / ≤30s; fallback upper bound for uploads to our own R2
export const AD_REF_MAX_VIDEO_BYTES = 60_000_000;
export const AD_REF_MAX_IMAGE_BYTES = 10_000_000;

// elevenlabs v3 multilingual voice whitelist (ids from model schema enum)
export const AD_REF_VOICES = [
  { id: 'hpp4J3VqNfWAUOO0d1Us', label: '女声 · 清亮' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: '女声 · 温柔 (Bella)' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', label: '男声 · 松弛' },
] as const;
export function isValidVoice(v: unknown): v is string {
  return typeof v === 'string' && AD_REF_VOICES.some((x) => x.id === v);
}

export function cleanRefText(v: unknown, fallback = '', max = 1200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) || fallback : fallback;
}

/**
 * Assemble the video-edit instruction from structured input (English, tested template):
 * Reference images are numbered dynamically: avatars first then products, referenced in the prompt as "reference image N".
 */
export function buildEditRequest({
  videoUrl,
  avatarUrl,
  productUrl,
  productNote,
  extraNote,
}: {
  videoUrl: string;
  avatarUrl?: string;
  productUrl?: string;
  productNote?: string;
  extraNote?: string;
}) {
  const images: string[] = [];
  const parts: string[] = [
    'Keep the SAME scene, background, lighting, camera framing, camera motion, cuts, pacing and overall energy of the source video.',
  ];
  if (avatarUrl) {
    images.push(avatarUrl);
    parts.push(
      `Replace the presenter/person in the video with the person shown in reference image ${images.length} — use their exact face, hair and identity, keep the same head and hand motion, gestures and expressiveness. If the original person is talking, the new person talks the same way.`,
    );
  }
  if (productUrl) {
    images.push(productUrl);
    parts.push(
      `Replace only the product held/shown in the video with the exact product shown in reference image ${images.length}. Keep its exact shape, colors, materials, cap/lid, packaging, label layout, logos, visible text, typography, color blocks and small details${productNote ? ` (${productNote})` : ''}. If the product has a printed label or brand text, keep that label front-facing and legible whenever the original product faces camera. Do not simplify it into a generic product, do not remove or blur the label, and do not change the presenter/person, hand pose, scene, lighting, camera motion or pacing.`,
    );
  }
  if (extraNote) parts.push(extraNote);
  parts.push('Photorealistic, natural, no added on-screen text, no watermark.');
  return {
    prompt: parts.join(' '),
    images,
  };
}

/** Output: gemini-omni-flash directly edits the original video (native audio). */
export async function submitAdRefEdit(videoUrl: string, prompt: string, images: string[]) {
  return submitRawGen('generateVideo', {
    model: AD_REF_EDIT_MODEL,
    video: videoUrl,
    prompt,
    ...(images.length ? { images: images.slice(0, 3) } : {}),
    resolution: '720p',
    thinking_level: 'high',
    seed: -1,
  });
}

/** Swap on-screen person (backward compat with old /character endpoint): omni video-edit swaps only the person, preserving scene/product/camera motion/native audio. */
export async function submitAdRefCharacter(videoUrl: string, imageUrl: string) {
  const prompt = [
    'Keep the SAME scene, background, product, outfit, lighting, camera framing, camera motion, cuts, pacing and overall energy of the source video.',
    'Replace ONLY the presenter/person with the person shown in reference image 1 — use their exact face, hair and identity, and keep the same head and hand motion, gestures, expressions and the way they talk. Do not change the product, the scene or the camera work.',
    'Photorealistic, natural, no added on-screen text, no watermark.',
  ].join(' ');
  return submitRawGen('generateVideo', {
    model: AD_REF_CHARACTER_MODEL,
    video: videoUrl,
    prompt,
    images: [imageUrl],
    resolution: '720p',
    thinking_level: 'high',
    seed: -1,
  });
}

/** Fallback person-swap: kling motion transfer — on-screen person image (image) + original video (motion source video) → your person performs the original footage's actions (real person doesn't hit 1010002). */
export async function submitAdRefMotion(imageUrl: string, videoUrl: string) {
  return submitRawGen('generateVideo', {
    model: AD_REF_MOTION_MODEL,
    image: imageUrl,
    video: videoUrl,
    character_orientation: 'video',
    keep_original_sound: false,
  });
}

/** New voiceover (swap voice + swap lines). */
export async function submitAdRefVoice(text: string, voice: string) {
  return submitRawGen('generateAudio', {
    model: AD_REF_TTS_MODEL,
    text,
    voice,
    stability: 0.4,
  });
}

/** Lip-sync the new voiceover onto the final video's mouth (overwrites original audio). */
export async function submitAdRefLipsync(videoUrl: string, audioUrl: string) {
  return submitRawGen('generateVideo', {
    model: AD_REF_LIPSYNC_MODEL,
    video_url: videoUrl,
    audio_url: audioUrl,
  });
}
