/**
 * Model router — selects the best model for a given capability based on
 * cost, quality, speed, and user plan.
 *
 * Currently a simple priority-based router. The registry provides metadata;
 * this router applies selection logic.
 *
 * Future: integrate with user plan tier, latency metrics, and A/B testing.
 */
import type { Capability, ModelInfo } from './types';
import { modelsByCapability, getModel } from './registry';

export interface RouteOptions {
  /** User plan tier — higher tiers get access to premium models. */
  planTier?: 'free' | 'starter' | 'pro' | 'elite';
  /** Prefer cheaper models (for cost-sensitive operations). */
  preferCheap?: boolean;
  /** Prefer faster models (for real-time operations). */
  preferFast?: boolean;
  /** Preferred resolution for video models. */
  resolution?: string;
  /** Preferred aspect ratio. */
  ratio?: string;
}

/**
 * Route a capability to the best available model.
 * Returns the model ID or null if no model matches.
 */
export function routeModel(capability: Capability, opts: RouteOptions = {}): string | null {
  const models = modelsByCapability(capability);
  if (models.length === 0) return null;

  // Filter by ratio if specified
  let candidates = models;
  if (opts.ratio) {
    const ratioMatch = models.filter(m => m.supportedRatios?.includes(opts.ratio!));
    if (ratioMatch.length > 0) candidates = ratioMatch;
  }

  // Filter by resolution if specified
  if (opts.resolution) {
    const resMatch = candidates.filter(m => m.supportedResolutions?.includes(opts.resolution!));
    if (resMatch.length > 0) candidates = resMatch;
  }

  // Plan tier filtering — exclude models whose capabilities require a higher tier
  if (opts.planTier) {
    candidates = candidates.filter(m =>
      m.capabilities.some(cap => tierHasAccess(opts.planTier!, cap))
    );
    if (candidates.length === 0) return null;
  }

  // Sort by preference
  if (opts.preferCheap) {
    candidates = [...candidates].sort((a, b) => {
      const aCost = Math.min(...Object.values(a.costPerSecondUsd || { d: 999 }));
      const bCost = Math.min(...Object.values(b.costPerSecondUsd || { d: 999 }));
      return aCost - bCost;
    });
  } else if (opts.preferFast) {
    // Prefer models with lower max duration (faster generation)
    candidates = [...candidates].sort((a, b) => (a.maxDurationSec || 15) - (b.maxDurationSec || 15));
  } else {
    // Default: prefer the first registered model (stable order)
  }

  return candidates[0]?.id || null;
}

/**
 * Get estimated cost for a model + duration (video) or per-call (image/audio).
 */
export function estimateCost(modelId: string, durationSec: number, resolution = '720p'): number {
  const model = getModel(modelId);
  if (!model?.costPerSecondUsd) return 0;

  if (model.capabilities.includes('videoGeneration') || model.capabilities.includes('videoEditing')) {
    // Per-second cost for video
    const perSec = model.costPerSecondUsd[resolution] || model.costPerSecondUsd['720p'] || model.costPerSecondUsd['*'] || 0;
    return perSec * durationSec;
  }

  if (model.capabilities.includes('imageGeneration') || model.capabilities.includes('imageEditing')) {
    // Per-call cost for image (use '*' or first rate)
    const perCall = model.costPerSecondUsd['*'] || Object.values(model.costPerSecondUsd)[0] || 0;
    return perCall;
  }

  if (model.capabilities.includes('speechSynthesis') || model.capabilities.includes('lipsync')) {
    // Per-second cost for audio
    const perSec = model.costPerSecondUsd['*'] || Object.values(model.costPerSecondUsd)[0] || 0;
    return perSec * durationSec;
  }

  return 0;
}

/** Plan tier access levels — determines which models are available. */
const TIER_ACCESS: Record<string, string[]> = {
  free: ['text', 'reasoning', 'imageGeneration', 'speechSynthesis'],
  starter: ['text', 'reasoning', 'imageGeneration', 'imageEditing', 'speechSynthesis', 'videoGeneration', 'speechRecognition'],
  pro: ['text', 'reasoning', 'imageGeneration', 'imageEditing', 'speechSynthesis', 'videoGeneration', 'videoEditing', 'speechRecognition', 'lipsync', 'music', 'soundEffects'],
  elite: ['text', 'reasoning', 'imageGeneration', 'imageEditing', 'speechSynthesis', 'videoGeneration', 'videoEditing', 'speechRecognition', 'lipsync', 'music', 'soundEffects', 'ocr', 'embeddings', 'ranking'],
};

/**
 * Check if a plan tier has access to a capability.
 */
export function tierHasAccess(tier: string, capability: Capability): boolean {
  const allowed = TIER_ACCESS[tier];
  return !!allowed && allowed.includes(capability);
}

/**
 * Filter models by plan tier access.
 */
export function modelsForTier(models: ModelInfo[], tier: string): ModelInfo[] {
  return models.filter(m =>
    m.capabilities.some(cap => tierHasAccess(tier, cap))
  );
}
