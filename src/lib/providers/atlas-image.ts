/**
 * Atlas Cloud ImageProvider implementation.
 *
 * Wraps the existing submitRawGen('generateImage', ...) and pollOnce from src/lib/atlas.ts.
 * No existing code is modified — this is a clean adapter.
 */
import { submitRawGen, pollOnce } from '@/lib/atlas';
import type { ImageProvider } from './image';
import type { ProviderTask, ProviderResult, ImageGenOptions } from './types';

function buildPayload(opts: ImageGenOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = { model: opts.model };
  if (opts.prompt) payload.prompt = opts.prompt;
  const imgs = (opts.referenceImages || []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u));
  if (imgs.length) {
    const field = opts.imageField || 'images';
    payload[field] = field === 'images' ? imgs : imgs[0];
  }
  // Apply extra first so we can detect if caller specified image_size (nano-banana-2/edit)
  const extra = opts.extra || {};
  if (opts.ratio && !('image_size' in extra)) {
    payload.aspect_ratio = opts.ratio;
  }
  if (opts.resolution) payload.resolution = opts.resolution;
  Object.assign(payload, extra);
  return payload;
}

export const atlasImage: ImageProvider = {
  id: 'atlas',

  async generate(opts: ImageGenOptions): Promise<ProviderTask> {
    return submitRawGen('generateImage', buildPayload(opts));
  },

  async poll(task: ProviderTask): Promise<ProviderResult> {
    const r = await pollOnce(task.getUrl);
    return { status: r.status, outputs: r.outputs, error: r.error, raw: r.raw };
  },
};
