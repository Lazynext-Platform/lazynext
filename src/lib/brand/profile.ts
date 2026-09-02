/**
 * Build a normalized BrandProfile from a BrandExtraction.
 *
 * This converts the raw LLM extraction output into a normalized profile
 * that can be stored and used by the creative intelligence layer.
 */
import type { BrandExtraction } from './types';

/** Normalized brand profile for creative intelligence. */
export interface BrandProfile {
  company: string;
  domain: string;
  industry: string;
  positioning: string;
  audience: string;
  tone: string;
  visualStyle: string;
  colors: string[];
  fonts: string[];
  prohibitedClaims: string[];
  brandVocabulary: string[];
  sourceUrls: string[];
  extractionTimestamp: string;
}

/**
 * Convert a BrandExtraction into a normalized BrandProfile.
 * Filters empty values, deduplicates arrays, and ensures required fields.
 */
export function buildProfile(extraction: BrandExtraction): BrandProfile {
  const dedup = (arr: string[]): string[] => [...new Set(arr.filter(Boolean))];

  return {
    company: extraction.company.trim(),
    domain: extraction.domain.trim(),
    industry: extraction.industry.trim(),
    positioning: extraction.positioning.trim(),
    audience: extraction.audience.trim(),
    tone: extraction.tone.trim() || 'professional',
    visualStyle: extraction.visualStyle.trim() || 'clean, modern',
    colors: dedup(extraction.colors).slice(0, 10),
    fonts: dedup(extraction.fonts).slice(0, 5),
    prohibitedClaims: dedup(extraction.prohibitedClaims).slice(0, 20),
    brandVocabulary: dedup(extraction.brandVocabulary).slice(0, 30),
    sourceUrls: dedup(extraction.sourceUrls).slice(0, 10),
    extractionTimestamp: new Date().toISOString(),
  };
}
