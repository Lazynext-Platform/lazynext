/**
 * Quality Service — facade for the anti-slop quality layer.
 *
 * Combines the deterministic copy de-slop scanner (stop-slop + no-ai-slop)
 * and the design/UI slop scanner (kill-ai-slop) into a single API.
 *
 * Deterministic checks are distinct from LLM-based quality scoring
 * (src/lib/creative/quality-scoring.ts). This module does NOT call any
 * LLM — it is pure string/regex analysis, fast, and free.
 *
 * @see src/lib/quality/copy-rules.ts
 * @see src/lib/quality/design-rules.ts
 */

export { scanCopy, scoreCopy, COPY_DESLOP_CREDIT_COST } from './copy-rules';
export type {
  SlopHit,
  SlopCategory,
  CopySlopReport,
  CopySlopScore,
} from './copy-rules';

export { scanMarkup, DESIGN_AUDIT_CREDIT_COST } from './design-rules';
export type {
  DesignSlopHit,
  DesignSlopReport,
} from './design-rules';

import { scanCopy, type CopySlopReport } from './copy-rules';
import { scanMarkup, type DesignSlopReport } from './design-rules';

// ── Combined report ──

export interface QualityScanResult {
  copy: CopySlopReport;
  design: DesignSlopReport;
  passed: boolean;
  /** Overall quality gate: copy score >= 35 AND design hits == 0. */
  gate: 'pass' | 'revise';
}

/**
 * Run both copy and design slop scanners on a single input.
 * The input is treated as prose for the copy scanner and as markup
 * for the design scanner.
 */
export function scanQuality(
  text: string,
  markup: string,
  sourceLabel = 'input',
): QualityScanResult {
  const copy = scanCopy(text);
  const design = scanMarkup(markup, sourceLabel);
  const gate: 'pass' | 'revise' =
    copy.score.total >= 35 && design.totalHits === 0 ? 'pass' : 'revise';
  return { copy, design, passed: gate === 'pass', gate };
}

// ── Validation (for creative registry integration) ──

export interface CopyDeslopInput {
  text: string;
}

export interface DesignAuditInput {
  markup: string;
  sourceLabel?: string;
}

export function validateCopyDeslopInput(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const b = body as Record<string, unknown>;
  if (typeof b.text !== 'string' || b.text.trim().length === 0) {
    errors.push('text is required and must be a non-empty string');
  }
  if (typeof b.text === 'string' && b.text.length > 50_000) {
    errors.push('text must be under 50,000 characters');
  }
  return { valid: errors.length === 0, errors };
}

export function validateDesignAuditInput(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const b = body as Record<string, unknown>;
  if (typeof b.markup !== 'string' || b.markup.trim().length === 0) {
    errors.push('markup is required and must be a non-empty string');
  }
  if (typeof b.markup === 'string' && b.markup.length > 200_000) {
    errors.push('markup must be under 200,000 characters');
  }
  return { valid: errors.length === 0, errors };
}

// ── Generation handlers (for creative registry) ──

export async function generateCopyDeslop(
  input: CopyDeslopInput,
): Promise<{ report: CopySlopReport }> {
  return { report: scanCopy(input.text) };
}

export async function generateDesignAudit(
  input: DesignAuditInput,
): Promise<{ report: DesignSlopReport }> {
  return { report: scanMarkup(input.markup, input.sourceLabel ?? 'input') };
}
