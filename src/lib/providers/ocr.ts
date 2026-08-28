/**
 * OCR provider interface: extract text from images (product packaging, labels, etc.).
 *
 * Inspired by FireRed-OCR (#72): high-quality OCR with structured output.
 * Real implementation requires a SERVICE_BOUNDARY (GPU or cloud OCR API).
 * Dry-run mode returns empty results for safe testing.
 */
import type { ProviderTask, ProviderResult } from './types';

/** OCR options. */
export interface OCROptions {
  /** Image URL to extract text from. */
  imageUrl: string;
  /** Language hint (optional). */
  language?: string;
  /** If true, return structured output (bounding boxes, confidence). */
  structured?: boolean;
  extra?: Record<string, unknown>;
}

/** OCR result — extracted text and optional structured data. */
export interface OCRResult {
  text: string;
  /** Structured regions with bounding boxes (if structured=true). */
  regions?: Array<{
    text: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }>;
  language?: string;
}

export interface OCRProvider {
  /** Extract text from an image. */
  extract(opts: OCROptions): Promise<OCRResult>;
  /** Provider identifier. */
  readonly id: string;
}

/**
 * Dry-run OCR provider — returns empty results for testing.
 * Real implementation would call a cloud OCR API or GPU service.
 */
export const dryRunOCR: OCRProvider = {
  id: 'dryrun',

  async extract(opts: OCROptions): Promise<OCRResult> {
    return {
      text: '',
      regions: [],
      language: opts.language || 'en',
    };
  },
};
