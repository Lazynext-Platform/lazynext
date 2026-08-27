/**
 * Atlas Cloud TTSProvider and ASRProvider implementation.
 *
 * Wraps the existing submitRawGen('generateAudio', ...) and pollOnce.
 */
import { submitRawGen, pollOnce } from '@/lib/atlas';
import type { TTSProvider, ASRProvider } from './audio';
import type { ProviderTask, ProviderResult, TTSOptions, ASROptions } from './types';

export const atlasTTS: TTSProvider = {
  id: 'atlas',

  async synthesize(opts: TTSOptions): Promise<ProviderTask> {
    const payload: Record<string, unknown> = { model: opts.model, text: opts.text };
    if (opts.voice) payload.voice = opts.voice;
    Object.assign(payload, opts.extra || {});
    return submitRawGen('generateAudio', payload);
  },

  async poll(task: ProviderTask): Promise<ProviderResult> {
    const r = await pollOnce(task.getUrl);
    return { status: r.status, outputs: r.outputs, error: r.error, raw: r.raw };
  },
};

// Default ASR model — Atlas Cloud's speech recognition endpoint.
export const ATLAS_ASR_MODEL = process.env.ATLAS_ASR_MODEL || 'openai/whisper-large-v3';

export const atlasASR: ASRProvider = {
  id: 'atlas',

  async transcribe(opts: ASROptions): Promise<ProviderTask> {
    const payload: Record<string, unknown> = {
      model: opts.model,
      audio: opts.url,
    };
    if (opts.language) payload.language = opts.language;
    Object.assign(payload, opts.extra || {});
    return submitRawGen('generateAudio', payload);
  },

  async poll(task: ProviderTask): Promise<ProviderResult> {
    const r = await pollOnce(task.getUrl);
    return { status: r.status, outputs: r.outputs, error: r.error, raw: r.raw };
  },
};
