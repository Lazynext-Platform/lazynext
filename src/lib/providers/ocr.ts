/**
 * OCR provider interface: extract text from images (product packaging, labels, etc.).
 *
 * Inspired by FireRed-OCR (#72): high-quality OCR with structured output.
 * Two implementations:
 *   1. VisionLLMOCR — uses Atlas Cloud's vision-capable LLM (atlasChat with image_url)
 *   2. dryRunOCR — returns empty results for safe testing
 *
 * The vision LLM approach sends the image to a multimodal model with a prompt
 * to extract all visible text. This is more flexible than traditional OCR
 * because it can understand context, layout, and multi-language content.
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

/**
 * Vision LLM OCR provider — uses Atlas Cloud's vision-capable LLM to extract text.
 *
 * This provider sends the image to the atlasChat endpoint with an image_url
 * content part and a system prompt instructing the model to extract all visible
 * text. It supports both plain text and structured JSON output.
 *
 * The model is configured via the OCR_VISION_MODEL env var, defaulting to
 * the same model used for chat completions.
 */
export const visionLLMOCR: OCRProvider = {
  id: 'vision-llm',

  async extract(opts: OCROptions): Promise<OCRResult> {
    // Lazy import to avoid pulling atlas.ts into the dry-run path
    const { atlasChat } = await import('@/lib/atlas');

    const systemPrompt = opts.structured
      ? `You are an OCR engine. Extract all visible text from the image. Return a JSON array of regions, each with "text" (string), "confidence" (0-1), and "bbox" ({x, y, width, height} in pixels relative to the image). Return ONLY the JSON array, no explanation.`
      : `You are an OCR engine. Extract ALL visible text from the image exactly as it appears. Return only the extracted text, preserving line breaks. Do not add commentary or explanations.`;

    const userContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
      { type: 'text', text: opts.language ? `Extract text in ${opts.language}.` : 'Extract all visible text.' },
      { type: 'image_url', image_url: { url: opts.imageUrl } },
    ];

    const response = await atlasChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      undefined, // use default chat model (vision-capable)
      2000, // generous token limit for text extraction
    );

    if (opts.structured) {
      // Try to parse the response as JSON array of regions
      try {
        const cleaned = response.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const regions = JSON.parse(cleaned) as Array<{
          text: string;
          confidence: number;
          bbox?: { x: number; y: number; width: number; height: number };
        }>;
        const text = regions.map(r => r.text).join('\n');
        return {
          text,
          regions,
          language: opts.language || 'en',
        };
      } catch {
        // If JSON parsing fails, return the raw text
        return {
          text: response,
          regions: [],
          language: opts.language || 'en',
        };
      }
    }

    return {
      text: response.trim(),
      regions: [],
      language: opts.language || 'en',
    };
  },
};

/**
 * Returns the appropriate OCR provider based on environment configuration.
 * Falls back to dry-run if no Atlas Cloud API key is available.
 */
export function getOCRProvider(): OCRProvider {
  const hasApiKey = !!process.env.ATLASCLOUD_API_KEY;
  return hasApiKey ? visionLLMOCR : dryRunOCR;
}
