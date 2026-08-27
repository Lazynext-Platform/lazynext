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
import { modelsByCapability } from './registry';

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

  // Plan tier filtering (future: mark models as pro/elite only)
  // For now, all models are available to all tiers

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
 * Get estimated cost for a model + duration.
 */
export function estimateCost(modelId: string, durationSec: number, resolution = '720p'): number {
  // Look up in registry
  const models = modelsByCapability('videoGeneration');
  const model = models.find(m => m.id === modelId);
  if (!model?.costPerSecondUsd) return 0;
  const perSec = model.costPerSecondUsd[resolution] || model.costPerSecondUsd['720p'] || 0;
  return perSec * durationSec;
}
