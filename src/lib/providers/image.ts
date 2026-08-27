/**
 * Image generation/editing provider interface.
 *
 * The Atlas Cloud implementation wraps the existing submitRawGen('generateImage', ...)
 * from src/lib/atlas.ts. No existing code is changed — this is an additive interface.
 */
import type { ProviderTask, ProviderResult, ImageGenOptions } from './types';

export interface ImageProvider {
  /** Generate an image from text or edit from reference images. */
  generate(opts: ImageGenOptions): Promise<ProviderTask>;

  /** Poll a submitted task once (safe for serverless — one HTTP request). */
  poll(task: ProviderTask): Promise<ProviderResult>;

  /** Provider identifier (e.g. 'atlas'). */
  readonly id: string;
}
