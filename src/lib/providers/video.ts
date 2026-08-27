/**
 * Video generation/editing provider interface.
 *
 * The Atlas Cloud implementation wraps the existing submitRawGen('generateVideo', ...)
 * from src/lib/atlas.ts.
 */
import type { ProviderTask, ProviderResult, VideoGenOptions } from './types';

export interface VideoProvider {
  /** Generate or edit a video. */
  generate(opts: VideoGenOptions): Promise<ProviderTask>;

  /** Poll a submitted task once. */
  poll(task: ProviderTask): Promise<ProviderResult>;

  /** Provider identifier. */
  readonly id: string;
}
