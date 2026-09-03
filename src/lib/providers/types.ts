/**
 * Provider abstraction layer — shared types.
 *
 * All provider interfaces return ProviderTask (async: id + getUrl for polling),
 * matching Lazynext's existing submit→poll architecture. Credits are NOT handled
 * here — that's the workflow layer's job.
 */

/** A submitted async generation task (same shape as atlas.ts SubmitResult). */
export interface ProviderTask {
  id: string;
  getUrl: string;
}

/** A completed generation result. */
export interface ProviderResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputs: string[];
  error?: string;
  raw?: unknown;
}

/** Model capability categories for the registry. */
export type Capability =
  | 'text'
  | 'reasoning'
  | 'vision'
  | 'imageGeneration'
  | 'imageEditing'
  | 'videoGeneration'
  | 'videoEditing'
  | 'audioGeneration'
  | 'speechRecognition'
  | 'speechSynthesis'
  | 'lipsync'
  | 'music'
  | 'soundEffects'
  | 'ocr'
  | 'embeddings'
  | 'ranking';

/** Metadata for a registered model/provider combination. */
export interface ModelInfo {
  id: string; // e.g. 'bytedance/seedance-2.0/image-to-video'
  provider: string; // e.g. 'atlas'
  capabilities: Capability[];
  costPerSecondUsd?: Record<string, number>; // by resolution, or { '*': rate }
  maxDurationSec?: number;
  supportedRatios?: string[];
  supportedResolutions?: string[];
  languageSupport?: string[];
  reliability?: number; // 0-1, historical success rate
}

/** Image generation options. */
export interface ImageGenOptions {
  model: string;
  prompt: string;
  ratio?: string;
  resolution?: string;
  /** Reference images for editing (http URLs). */
  referenceImages?: string[];
  /** Which payload key the model expects input images under. */
  imageField?: 'image' | 'images';
  extra?: Record<string, unknown>;
}

/** Video generation options. */
export interface VideoGenOptions {
  model: string;
  prompt?: string;
  /** Input image URL (for image-to-video). */
  image?: string;
  /** Input video URL (for video editing). */
  video?: string;
  /** Reference images (for reference-to-video). */
  referenceImages?: string[];
  ratio?: string;
  resolution?: string;
  duration?: number;
  generateAudio?: boolean;
  extra?: Record<string, unknown>;
}

/** TTS options. */
export interface TTSOptions {
  model: string;
  text: string;
  voice?: string;
  extra?: Record<string, unknown>;
}

/** ASR (speech recognition) options. */
export interface ASROptions {
  model: string;
  /** Audio/video URL to transcribe. */
  url: string;
  /** Source language hint (optional). */
  language?: string;
  extra?: Record<string, unknown>;
}

/** ASR result (transcription). */
export interface ASRResult {
  text: string;
  segments?: Array<{ start: number; end: number; text: string }>;
  language?: string;
  duration?: number;
}

/** Chat/LLM options (matches atlas.ts atlasChat signature). */
export interface ChatOptions {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  timeoutMs?: number;
}
