/**
 * Convenience helpers that wrap routeModel() for common use cases.
 *
 * These keep a hard-coded fallback model ID in case the router returns null
 * (e.g. when no model is registered for the requested capability).
 */
import { routeModel, type RouteOptions } from './router';

/** Get the best LLM (text/reasoning) model for a user's plan tier. */
export function getLLMModel(planTier?: string): string {
  const modelId = routeModel('text', { planTier: planTier as RouteOptions['planTier'] });
  return modelId || 'bytedance/doubao-seed-2.1-turbo-260628'; // fallback to default
}

/** Get the best image generation model for a user's plan tier. */
export function getImageModel(planTier?: string, ratio?: string): string {
  const modelId = routeModel('imageGeneration', {
    planTier: planTier as RouteOptions['planTier'],
    ratio,
  });
  return modelId || 'google/nano-banana-2/text-to-image'; // fallback
}

/** Get the best video generation model for a user's plan tier. */
export function getVideoModel(planTier?: string, ratio?: string, resolution?: string): string {
  const modelId = routeModel('videoGeneration', {
    planTier: planTier as RouteOptions['planTier'],
    ratio,
    resolution,
  });
  return modelId || 'bytedance/seedance-2.0/image-to-video'; // fallback
}
