/**
 * Ad analysis provider interface: reference video → structured creative analysis.
 *
 * Inspired by RemixKit's evidence-extraction → creative-analysis → remix-brief pipeline.
 * The analysis produces a structured ReferenceCreativeAnalysis object that can drive
 * original adaptation generation (NOT copying).
 */
import type { ReferenceCreativeAnalysis } from '@/lib/creative/types';

export interface AdAnalysisProvider {
  /** Analyze a reference video/creative into a structured analysis object. */
  analyzeVideo(videoUrl: string, opts?: { transcript?: string }): Promise<ReferenceCreativeAnalysis>;

  /** Provider identifier. */
  readonly id: string;
}
