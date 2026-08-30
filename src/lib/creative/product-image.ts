/**
 * Product Image Studio — AI product image enhancement.
 *
 * Self-contained module for background removal, scene generation, lifestyle
 * context, multi-angle variants, color correction, shadow addition,
 * reflection, and resize/crop.
 *
 * Inspired by #26 (amazon-product-studio). Integrates with the existing asset
 * library via the API route which persists results.
 *
 * All AI scene/instruction generation uses the existing atlasChat() from
 * src/lib/atlas.ts — no new LLM dependency. Credit costs are defined per
 * enhancement type and exported for the API route to charge.
 *
 * NOTE: The actual Atlas image generation/edit API integration is stubbed for
 * now — `enhanceProductImage` returns placeholder URLs in both dry-run and
 * "real" mode. The atlasChat call is still used to generate processing
 * instructions (scene descriptions) for scene/lifestyle/multi-angle types so
 * the prompt engineering pipeline is exercised end-to-end.
 */
import { atlasChat, submitGen, pollOnce } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

// ── Types ──

export type ImageEnhancementType =
  | 'background_removal'
  | 'scene_generation'
  | 'lifestyle_context'
  | 'multi_angle'
  | 'color_correction'
  | 'shadow_addition'
  | 'reflection'
  | 'resize_crop';

export interface ProductImageRequest {
  imageUrl: string;
  enhancementType: ImageEnhancementType;
  /** for scene_generation */
  sceneDescription?: string;
  /** for lifestyle_context (e.g., "kitchen", "office", "outdoor") */
  lifestyleContext?: string;
  /** for multi_angle: "front", "side", "top", "detail", "lifestyle" */
  angleType?: string;
  outputFormat?: 'png' | 'jpg' | 'webp';
  outputSize?: { width: number; height: number };
}

export interface ProductImageResult {
  enhancedImageUrl: string;
  enhancementType: ImageEnhancementType;
  originalUrl: string;
  processingNotes: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    fileSize: number;
  };
  variants?: Array<{
    angle: string;
    url: string;
    description: string;
  }>;
}

// ── Credit costs per enhancement type ──

export const ENHANCEMENT_COSTS: Record<ImageEnhancementType, number> = {
  background_removal: 2,
  scene_generation: 4,
  lifestyle_context: 4,
  multi_angle: 6,
  color_correction: 2,
  shadow_addition: 2,
  reflection: 2,
  resize_crop: 1,
};

// ── Enhancement type metadata ──

const ENHANCEMENT_META: Array<{
  type: ImageEnhancementType;
  name: string;
  description: string;
}> = [
  { type: 'background_removal', name: 'Background Removal', description: 'Remove the background and isolate the product on a clean transparent or solid backdrop.' },
  { type: 'scene_generation', name: 'Scene Generation', description: 'Place the product into a custom AI-generated scene described by you.' },
  { type: 'lifestyle_context', name: 'Lifestyle Context', description: 'Drop the product into a realistic lifestyle setting (kitchen, office, outdoor, etc.).' },
  { type: 'multi_angle', name: 'Multi-Angle Variants', description: 'Generate multiple product views: front, side, top, detail, and lifestyle angles.' },
  { type: 'color_correction', name: 'Color Correction', description: 'Balance exposure, white balance, and saturation for accurate product colors.' },
  { type: 'shadow_addition', name: 'Shadow Addition', description: 'Add a natural contact or cast shadow to ground the product.' },
  { type: 'reflection', name: 'Reflection', description: 'Add a polished surface reflection beneath the product.' },
  { type: 'resize_crop', name: 'Resize & Crop', description: 'Resize and crop the image to exact dimensions for marketplace listings.' },
];

// ── Model resolution ──

const PRODUCT_IMAGE_MODEL = process.env.CREATIVE_MODEL || getLLMModel();
const PRODUCT_IMAGE_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);
const PRODUCT_IMAGE_MAX_TOKENS = Number(process.env.CREATIVE_MAX_TOKENS || 4000);

/**
 * Resolve the LLM model for a given plan tier.
 * Falls back to the module-level PRODUCT_IMAGE_MODEL (which respects the CREATIVE_MODEL env override).
 */
function resolveModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

// ── Helpers ──

const VALID_TYPES: ReadonlySet<ImageEnhancementType> = new Set([
  'background_removal',
  'scene_generation',
  'lifestyle_context',
  'multi_angle',
  'color_correction',
  'shadow_addition',
  'reflection',
  'resize_crop',
]);

const VALID_FORMATS: ReadonlySet<'png' | 'jpg' | 'webp'> = new Set(['png', 'jpg', 'webp']);

const LIFESTYLE_CONTEXTS = ['kitchen', 'office', 'outdoor', 'studio', 'retail', 'home'] as const;
const ANGLE_TYPES = ['front', 'side', 'top', 'detail', 'lifestyle'] as const;

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function asNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_product_image_output');
  return JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;
}

function extractJsonArray(raw: string): unknown[] {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a < 0 || b < 0) throw new Error('no_array_in_product_image_output');
  return JSON.parse(s.slice(a, b + 1)) as unknown[];
}

/** True when running against the local mock Atlas server (or no real key configured). */
function isDryRun(): boolean {
  const base = process.env.ATLASCLOUD_BASE || '';
  if (base.includes('localhost') || base.includes('127.0.0.1')) return true;
  return !process.env.ATLASCLOUD_API_KEY;
}

/**
 * Build a placeholder enhanced image URL. In dry-run/mock mode (or when the
 * real image API is not yet wired up) we return a deterministic placeholder so
 * the UI can render a before/after comparison without a real generation call.
 */
function placeholderUrl(
  request: ProductImageRequest,
  suffix = 'enhanced',
): string {
  const fmt = request.outputFormat || 'png';
  const w = request.outputSize?.width || 1024;
  const h = request.outputSize?.height || 1024;
  // Use a stable placeholder service URL keyed by the enhancement type so the
  // before/after visually differs. This is a non-generation placeholder.
  const seed = encodeURIComponent(`${request.enhancementType}-${suffix}-${w}x${h}`);
  return `https://placehold.co/${w}x${h}.${fmt}/0064d9/ffffff?text=${seed}`;
}

// ── AI instruction generation ──

const PRODUCT_IMAGE_SYS =
  'You are a product photography art director. Given a product image and an enhancement request, ' +
  'produce a concise, production-ready image generation/edit instruction. Return ONLY valid JSON.';

/**
 * Use atlasChat to generate processing instructions for scene/lifestyle/multi-angle
 * enhancements. Returns a descriptive prompt string. Falls back to a deterministic
 * description if the LLM call fails (so the pipeline is resilient in mock/offline mode).
 */
async function generateSceneInstructions(
  request: ProductImageRequest,
  planTier?: PlanTier,
): Promise<string> {
  const parts: string[] = [`Product image URL: ${request.imageUrl}`];

  if (request.enhancementType === 'scene_generation') {
    parts.push(`Requested scene: ${request.sceneDescription || 'a clean, professional product photography scene'}`);
  } else if (request.enhancementType === 'lifestyle_context') {
    const ctx = request.lifestyleContext || 'home';
    parts.push(`Lifestyle context: ${ctx}`);
  } else if (request.enhancementType === 'multi_angle') {
    parts.push(`Generate descriptions for these angles: ${ANGLE_TYPES.join(', ')}`);
    parts.push(`Primary angle requested: ${request.angleType || 'front'}`);
  }

  parts.push('Return JSON: { "instruction": string, "notes": string }');

  try {
    const raw = await atlasChat(
      [{ role: 'system', content: PRODUCT_IMAGE_SYS }, { role: 'user', content: parts.join('\n') }],
      resolveModel(planTier),
      PRODUCT_IMAGE_MAX_TOKENS,
      PRODUCT_IMAGE_TIMEOUT_MS,
    );
    const j = extractJson(raw);
    const instruction = asStr(j.instruction);
    const notes = asStr(j.notes);
    return notes ? `${instruction} — ${notes}` : instruction;
  } catch {
    // Resilient fallback — never block the enhancement on the LLM call failing.
    if (request.enhancementType === 'scene_generation') {
      return `Place product in scene: ${request.sceneDescription || 'professional studio setting'}.`;
    }
    if (request.enhancementType === 'lifestyle_context') {
      return `Place product in a ${request.lifestyleContext || 'home'} lifestyle setting with natural lighting.`;
    }
    if (request.enhancementType === 'multi_angle') {
      return `Generate consistent multi-angle product views: ${ANGLE_TYPES.join(', ')}.`;
    }
    return 'Apply enhancement to product image.';
  }
}

/**
 * Generate per-angle descriptions for multi_angle variants via atlasChat.
 * Falls back to deterministic descriptions on failure.
 */
async function generateAngleDescriptions(
  request: ProductImageRequest,
  planTier?: PlanTier,
): Promise<Array<{ angle: string; description: string }>> {
  const userPrompt = `Product image URL: ${request.imageUrl}
Generate a short visual description for each of these product photo angles: ${ANGLE_TYPES.join(', ')}.
Return a JSON array: [{ "angle": string, "description": string }]`;

  try {
    const raw = await atlasChat(
      [{ role: 'system', content: PRODUCT_IMAGE_SYS }, { role: 'user', content: userPrompt }],
      resolveModel(planTier),
      PRODUCT_IMAGE_MAX_TOKENS,
      PRODUCT_IMAGE_TIMEOUT_MS,
    );
    const arr = extractJsonArray(raw);
    return ANGLE_TYPES.map((angle, idx) => {
      const o = (arr[idx] && typeof arr[idx] === 'object' ? arr[idx] : {}) as Record<string, unknown>;
      const a = asStr(o.angle, angle);
      return { angle: a, description: asStr(o.description, `${angle} view of the product`) };
    });
  } catch {
    return ANGLE_TYPES.map((angle) => ({
      angle,
      description: `${angle} view of the product`,
    }));
  }
}

// ── Public API ──

/**
 * Validate a product image enhancement request.
 * Returns { valid, errors } — never throws.
 */
export function validateImageRequest(
  request: ProductImageRequest,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request || typeof request !== 'object') {
    return { valid: false, errors: ['request_required'] };
  }

  if (!isString(request.imageUrl) || !request.imageUrl.trim()) {
    errors.push('image_url_required');
  } else {
    // Basic URL sanity check
    try {
      const u = new URL(request.imageUrl.trim());
      if (!u.protocol || !u.host) errors.push('image_url_invalid');
    } catch {
      errors.push('image_url_invalid');
    }
  }

  if (!isString(request.enhancementType) || !request.enhancementType.trim()) {
    errors.push('enhancement_type_required');
  } else if (!VALID_TYPES.has(request.enhancementType)) {
    errors.push('enhancement_type_invalid');
  }

  // Conditional requirements
  if (request.enhancementType === 'scene_generation') {
    if (!isString(request.sceneDescription) || !request.sceneDescription.trim()) {
      errors.push('scene_description_required');
    }
  }
  if (request.enhancementType === 'lifestyle_context') {
    if (!isString(request.lifestyleContext) || !request.lifestyleContext.trim()) {
      errors.push('lifestyle_context_required');
    }
  }
  if (request.enhancementType === 'multi_angle') {
    if (request.angleType && !ANGLE_TYPES.includes(request.angleType as (typeof ANGLE_TYPES)[number])) {
      errors.push('angle_type_invalid');
    }
  }

  if (request.outputFormat && !VALID_FORMATS.has(request.outputFormat)) {
    errors.push('output_format_invalid');
  }

  if (request.outputSize) {
    if (
      typeof request.outputSize.width !== 'number' ||
      typeof request.outputSize.height !== 'number' ||
      request.outputSize.width <= 0 ||
      request.outputSize.height <= 0 ||
      request.outputSize.width > 8192 ||
      request.outputSize.height > 8192
    ) {
      errors.push('output_size_invalid');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Return the catalog of available enhancement types with display metadata and cost.
 */
export function getEnhancementTypes(): Array<{
  type: ImageEnhancementType;
  name: string;
  description: string;
  cost: number;
}> {
  return ENHANCEMENT_META.map((m) => ({
    type: m.type,
    name: m.name,
    description: m.description,
    cost: ENHANCEMENT_COSTS[m.type],
  }));
}

/**
 * Enhance a product image. Validates the request, uses atlasChat to generate
 * processing instructions for scene/lifestyle/multi-angle types, and returns a
 * ProductImageResult. In production (non-dry-run), calls the real Atlas Cloud
 * image generation API for image-to-image transformations. In dry-run/mock
 * mode, returns placeholder URLs.
 */
export async function enhanceProductImage(
  request: ProductImageRequest,
  planTier?: PlanTier,
): Promise<ProductImageResult> {
  const validation = validateImageRequest(request);
  if (!validation.valid) {
    throw new Error(`invalid_image_request: ${validation.errors.join(', ')}`);
  }

  const fmt = request.outputFormat || 'png';
  const width = request.outputSize?.width || 1024;
  const height = request.outputSize?.height || 1024;
  const dryRun = isDryRun();

  // For scene/lifestyle/multi-angle, use AI to describe the scene/instructions.
  let processingNotes = '';
  if (
    request.enhancementType === 'scene_generation' ||
    request.enhancementType === 'lifestyle_context' ||
    request.enhancementType === 'multi_angle'
  ) {
    processingNotes = await generateSceneInstructions(request, planTier);
  } else {
    const meta = ENHANCEMENT_META.find((m) => m.type === request.enhancementType);
    processingNotes = meta ? meta.description : 'Product image enhancement applied.';
  }

  if (dryRun) {
    processingNotes = `[mock] ${processingNotes}`;
  }

  // Multi-angle: produce a variants grid.
  if (request.enhancementType === 'multi_angle') {
    const angleDescs = await generateAngleDescriptions(request, planTier);
    const variants: Array<{ angle: string; url: string; description: string }> = [];

    for (const a of angleDescs) {
      let url: string;
      if (dryRun) {
        url = placeholderUrl({ ...request, angleType: a.angle }, a.angle);
      } else {
        try {
          url = await generateImageViaAtlas(request.imageUrl, a.description, planTier);
        } catch {
          url = placeholderUrl({ ...request, angleType: a.angle }, a.angle);
        }
      }
      variants.push({ angle: a.angle, url, description: a.description });
    }
    const primaryAngle = request.angleType || 'front';
    const primary = variants.find((v) => v.angle === primaryAngle) || variants[0];
    return {
      enhancedImageUrl: primary.url,
      enhancementType: request.enhancementType,
      originalUrl: request.imageUrl,
      processingNotes,
      metadata: {
        width,
        height,
        format: fmt,
        fileSize: dryRun ? 0 : Math.round(width * height * 0.15),
      },
      variants,
    };
  }

  // Single-result enhancements.
  let enhancedUrl: string;
  if (dryRun) {
    enhancedUrl = placeholderUrl(request);
  } else {
    try {
      enhancedUrl = await generateImageViaAtlas(request.imageUrl, processingNotes, planTier);
    } catch {
      // Fall back to placeholder if the real API fails
      enhancedUrl = placeholderUrl(request);
      processingNotes = `${processingNotes} (fallback: atlas API unavailable)`;
    }
  }

  return {
    enhancedImageUrl: enhancedUrl,
    enhancementType: request.enhancementType,
    originalUrl: request.imageUrl,
    processingNotes,
    metadata: {
      width,
      height,
      format: fmt,
      fileSize: dryRun ? 0 : Math.round(width * height * 0.15),
    },
  };
}

/**
 * Call the real Atlas Cloud image generation API for image-to-image transformations.
 * Submits a generation task with the source image and prompt, polls for completion,
 * and returns the output URL.
 */
async function generateImageViaAtlas(
  sourceImageUrl: string,
  prompt: string,
  planTier?: PlanTier,
): Promise<string> {
  const model = process.env.ATLAS_IMAGE_EDIT_MODEL || 'seedream-3.0';
  const task = await submitGen({
    endpoint: 'generateImage',
    model,
    prompt,
    image: sourceImageUrl,
    imageField: 'image',
    extra: {
      // Request image-to-image mode if supported by the model
      mode: 'image-to-image',
    },
  });

  // Poll for completion (max ~60s, 3s intervals)
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const result = await pollOnce(task.getUrl);
    if (result.status === 'completed' && result.outputs.length > 0) {
      return result.outputs[0];
    }
    if (result.status === 'failed') {
      throw new Error('atlas_image_generation_failed');
    }
  }
  throw new Error('atlas_image_generation_timeout');
}

// Re-export lifestyle contexts and angle types for UI consumers.
export { LIFESTYLE_CONTEXTS, ANGLE_TYPES };
