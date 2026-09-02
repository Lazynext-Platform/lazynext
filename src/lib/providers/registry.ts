/**
 * Model capability registry — maps models to capabilities and metadata.
 *
 * This is the foundation for a future model router that can select providers
 * based on quality, cost, speed, user plan, and task requirements.
 *
 * Currently, LazyNext hard-codes model IDs in each workflow file (workflow.ts,
 * ad-reference.ts, ad-skit.ts, drama/prompt.ts). This registry centralizes
 * that metadata without changing existing code.
 */
import type { Capability, ModelInfo } from './types';

// ── Registered models (metadata only — no behavior change) ──

const MODELS: ModelInfo[] = [
  // ── Image generation ──
  {
    id: 'google/nano-banana-2/text-to-image',
    provider: 'atlas',
    capabilities: ['imageGeneration'],
    supportedRatios: ['9:16', '16:9', '1:1', '4:3', '3:4'],
  },
  {
    id: 'google/nano-banana/edit',
    provider: 'atlas',
    capabilities: ['imageGeneration', 'imageEditing'],
    supportedRatios: ['9:16', '16:9', '1:1', '4:3', '3:4'],
  },
  {
    id: 'openai/gpt-image-2/text-to-image',
    provider: 'atlas',
    capabilities: ['imageGeneration'],
    supportedRatios: ['1:1', '16:9', '9:16'],
  },
  {
    id: 'openai/gpt-image-2/edit',
    provider: 'atlas',
    capabilities: ['imageGeneration', 'imageEditing'],
    supportedRatios: ['1:1', '16:9', '9:16'],
  },

  // ── Video generation ──
  {
    id: 'bytedance/seedance-2.0/image-to-video',
    provider: 'atlas',
    capabilities: ['videoGeneration'],
    costPerSecondUsd: { '480p': 0.112, '720p': 0.242, '1080p': 0.544, '4k': 1.24 },
    maxDurationSec: 15,
    supportedRatios: ['9:16', '16:9', '1:1', '4:3', '3:4', '21:9', 'adaptive'],
    supportedResolutions: ['480p', '720p', '720p-SR', '1080p', '1080p-SR', '1440p-SR', '4k'],
  },
  {
    id: 'bytedance/seedance-2.0/reference-to-video',
    provider: 'atlas',
    capabilities: ['videoGeneration'],
    costPerSecondUsd: { '480p': 0.112, '720p': 0.242, '1080p': 0.544, '4k': 1.24, '720p-SR': 0.202, '1080p-SR': 0.435, '1440p-SR': 0.774 },
    maxDurationSec: 15,
    supportedRatios: ['9:16', '16:9', '1:1', '4:3', '3:4', '21:9', 'adaptive'],
    supportedResolutions: ['480p', '720p', '720p-SR', '1080p', '1080p-SR', '1440p-SR', '4k'],
  },
  {
    id: 'google/gemini-omni-flash/video-edit',
    provider: 'atlas',
    capabilities: ['videoEditing', 'videoGeneration'],
    costPerSecondUsd: { '*': 0.14 },
    maxDurationSec: 30,
    supportedResolutions: ['720p'],
  },
  {
    id: 'kwaivgi/kling-v2.6-pro/motion-control',
    provider: 'atlas',
    capabilities: ['videoGeneration'],
    costPerSecondUsd: { '*': 0.112 },
  },
  {
    id: 'google/veo3.1/reference-to-video',
    provider: 'atlas',
    capabilities: ['videoGeneration'],
    costPerSecondUsd: { '720p': 0.4, '1080p': 0.4, '4k': 0.6 },
  },

  // ── Audio / TTS ──
  {
    id: 'elevenlabs/v3/text-to-speech',
    provider: 'atlas',
    capabilities: ['speechSynthesis'],
  },
  {
    id: 'veed/lipsync',
    provider: 'atlas',
    capabilities: ['lipsync'],
    costPerSecondUsd: { '*': 0.0132 },
  },

  // ── LLM / Chat ──
  {
    id: 'bytedance/doubao-seed-2.1-turbo-260628',
    provider: 'atlas',
    capabilities: ['text', 'reasoning'],
  },
  {
    id: 'openai/gpt-5.5',
    provider: 'atlas',
    capabilities: ['text', 'reasoning', 'vision'],
  },
  {
    id: 'google/gemini-2.5-flash',
    provider: 'atlas',
    capabilities: ['text', 'reasoning', 'vision'],
  },
  {
    id: 'deepseek-ai/deepseek-v4-pro',
    provider: 'atlas',
    capabilities: ['text', 'reasoning'],
  },
  {
    id: 'zai-org/glm-5.2',
    provider: 'atlas',
    capabilities: ['text', 'reasoning'],
  },

  // ── ASR (speech recognition) ──
  {
    id: 'openai/whisper-large-v3',
    provider: 'atlas',
    capabilities: ['speechRecognition'],
    languageSupport: ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'vi', 'th', 'id'],
  },

  // ── OCR (text extraction from images) ──
  {
    id: 'firered/firered-ocr',
    provider: 'service-boundary',
    capabilities: ['ocr'],
    languageSupport: ['en', 'zh', 'ja', 'ko'],
  },
];

// ── Registry API ──

const MODEL_MAP = new Map(MODELS.map((m) => [m.id, m]));

/** Get model metadata by ID. */
export function getModel(id: string): ModelInfo | undefined {
  return MODEL_MAP.get(id);
}

/** Find all models that support a given capability. */
export function modelsByCapability(cap: Capability): ModelInfo[] {
  return MODELS.filter((m) => m.capabilities.includes(cap));
}

/** Check if a model supports a capability. */
export function supportsCapability(modelId: string, cap: Capability): boolean {
  const m = getModel(modelId);
  return !!m && m.capabilities.includes(cap);
}

/** All registered models. */
export function allModels(): readonly ModelInfo[] {
  return MODELS;
}
