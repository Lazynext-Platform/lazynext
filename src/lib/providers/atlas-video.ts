/**
 * Atlas Cloud VideoProvider implementation.
 *
 * Wraps the existing submitRawGen('generateVideo', ...) and pollOnce from src/lib/atlas.ts.
 */
import { submitRawGen, pollOnce } from '@/lib/atlas';
import type { VideoProvider } from './video';
import type { ProviderTask, ProviderResult, VideoGenOptions } from './types';

function buildPayload(opts: VideoGenOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = { model: opts.model };
  if (opts.prompt) payload.prompt = opts.prompt;
  if (opts.image) payload.image = opts.image;
  if (opts.video) payload.video = opts.video;
  const refs = (opts.referenceImages || []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u));
  if (refs.length) payload.reference_images = refs.slice(0, 9);
  if (opts.ratio) payload.ratio = opts.ratio;
  if (opts.resolution) payload.resolution = opts.resolution;
  if (opts.duration != null) payload.duration = opts.duration;
  if (opts.generateAudio !== undefined) payload.generate_audio = opts.generateAudio;
  Object.assign(payload, opts.extra || {});
  return payload;
}

export const atlasVideo: VideoProvider = {
  id: 'atlas',

  async generate(opts: VideoGenOptions): Promise<ProviderTask> {
    return submitRawGen('generateVideo', buildPayload(opts));
  },

  async poll(task: ProviderTask): Promise<ProviderResult> {
    const r = await pollOnce(task.getUrl);
    return { status: r.status, outputs: r.outputs, error: r.error, raw: r.raw };
  },
};
