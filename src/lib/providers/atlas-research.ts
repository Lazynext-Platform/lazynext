/**
 * Atlas Cloud ResearchProvider implementation.
 *
 * Wraps the brand extraction logic (which uses atlasChat internally) behind
 * the ResearchProvider interface so that brand/product extraction can be
 * swapped via the provider registry in the future.
 */
import { extractBrand, extractProduct } from '@/lib/brand/extract';
import type { ResearchProvider } from './research';

export const atlasResearch: ResearchProvider = {
  id: 'atlas',

  async inspectUrl(url: string) {
    return extractBrand(url);
  },

  async extractProduct(url: string) {
    return extractProduct(url);
  },
};
