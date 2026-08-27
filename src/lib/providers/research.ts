/**
 * Research provider interface: URL → brand/product extraction.
 *
 * Used by the brand intelligence layer to extract structured data from
 * product pages and brand websites. Implementations use LLM analysis
 * of fetched page content.
 */
import type { BrandExtraction, ProductExtraction } from '@/lib/brand/types';

export interface ResearchProvider {
  /** Extract brand intelligence from a brand/homepage URL. */
  inspectUrl(url: string): Promise<BrandExtraction>;

  /** Extract structured product facts from a product page URL. */
  extractProduct(url: string): Promise<ProductExtraction>;

  /** Provider identifier. */
  readonly id: string;
}
