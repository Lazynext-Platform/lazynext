/**
 * Audio provider interfaces: TTS (text-to-speech) and ASR (speech recognition).
 */
import type { ProviderTask, ProviderResult, TTSOptions, ASROptions } from './types';

export interface TTSProvider {
  synthesize(opts: TTSOptions): Promise<ProviderTask>;
  poll(task: ProviderTask): Promise<ProviderResult>;
  readonly id: string;
}

export interface ASRProvider {
  /** Submit an async transcription task. Returns ProviderTask for polling. */
  transcribe(opts: ASROptions): Promise<ProviderTask>;
  poll(task: ProviderTask): Promise<ProviderResult>;
  readonly id: string;
}
