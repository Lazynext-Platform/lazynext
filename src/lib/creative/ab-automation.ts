/**
 * AI A/B Test Automation — closed-loop optimization agent.
 *
 * Orchestrates the full A/B testing lifecycle:
 *   1. PLAN — AI generates variant hypotheses (hook, CTA, angle changes)
 *   2. LAUNCH — Creates A/B test campaigns with equal budget allocation
 *   3. MONITOR — Checks results periodically, calculates statistical significance
 *   4. PROMOTE — Pauses losing variants, increases winner's budget
 *
 * The automation state is tracked via AdCampaign metadata (JSON field) with
 * a special `__automation` key containing job state. This avoids adding a
 * new Prisma model while keeping the automation state persistent.
 *
 * Each automation job has:
 *   - jobId: unique identifier (stored in campaign name prefix)
 *   - status: planning | launching | monitoring | completed | failed
 *   - variants: array of { creationId, label, score }
 *   - winner: the creationId of the winning variant (once determined)
 *   - metrics: aggregated performance data
 */

export type AutomationStatus = 'planning' | 'launching' | 'monitoring' | 'completed' | 'failed';

export interface AutomationVariant {
  creationId: string;
  label: string; // "A", "B", "C"
  score?: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  roas: number;
}

export interface AutomationJob {
  jobId: string;
  status: AutomationStatus;
  testName: string;
  platform: string;
  primaryMetric: string; // "roas" | "ctr" | "cvr"
  variants: AutomationVariant[];
  winner?: string; // creationId of winner
  confidenceLevel: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export const AUTOMATION_PREFIX = '[AUTO]';
export const AUTOMATION_COST = 10;

/**
 * Generate a unique job ID.
 */
export function generateJobId(): string {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Parse automation metadata from a campaign's metrics JSON field.
 */
export function parseAutomationMetadata(metrics: unknown): Record<string, unknown> | null {
  if (!metrics || typeof metrics !== 'object') return null;
  const m = metrics as Record<string, unknown>;
  return (m.__automation as Record<string, unknown>) || null;
}

/**
 * Build automation metadata to embed in a campaign's metrics field.
 */
export function buildAutomationMetadata(job: Partial<AutomationJob>): Record<string, unknown> {
  return { __automation: job };
}

/**
 * Calculate statistical significance using a simple z-test approximation.
 * Returns confidence level (0-1) that the winner is actually better.
 *
 * For small samples this is a rough approximation — not a rigorous test.
 * We use a simple conversion-rate comparison with normal approximation.
 */
export function calculateSignificance(
  variantA: { impressions: number; conversions: number },
  variantB: { impressions: number; conversions: number },
): number {
  const crA = variantA.impressions > 0 ? variantA.conversions / variantA.impressions : 0;
  const crB = variantB.impressions > 0 ? variantB.conversions / variantB.impressions : 0;
  const pooledCR = (variantA.conversions + variantB.conversions) / (variantA.impressions + variantB.impressions);
  const se = Math.sqrt(pooledCR * (1 - pooledCR) * (1 / variantA.impressions + 1 / variantB.impressions));
  if (se === 0) return 0;
  const z = Math.abs(crA - crB) / se;
  // Two-tailed confidence that there IS a difference: 2 * CDF(|z|) - 1
  // When z=0 (no difference), confidence=0. When z is large, confidence→1.
  const confidence = 2 * normalCDF(z) - 1;
  return Math.max(0, Math.min(confidence, 1));
}

/**
 * Approximate normal CDF using the error function.
 */
function normalCDF(x: number): number {
  // Abramowitz & Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Determine the winner from a set of variants based on the primary metric.
 * Returns the creationId of the winner, or null if no clear winner yet.
 *
 * A winner is declared when:
 *   1. All variants have at least minImpressions impressions
 *   2. The top variant has a significance > minConfidence vs the second-best
 */
export function determineWinner(
  variants: AutomationVariant[],
  primaryMetric: string,
  minImpressions = 1000,
  minConfidence = 0.90,
): string | null {
  if (variants.length < 2) return null;

  // Check minimum impressions
  if (variants.some(v => v.impressions < minImpressions)) return null;

  // Sort by primary metric
  const sorted = [...variants].sort((a, b) => {
    switch (primaryMetric) {
      case 'roas': return b.roas - a.roas;
      case 'ctr': return b.ctr - a.ctr;
      case 'cvr': return b.cvr - a.cvr;
      default: return b.roas - a.roas;
    }
  });

  const top = sorted[0];
  const second = sorted[1];

  // Calculate significance between top and second
  const significance = calculateSignificance(
    { impressions: top.impressions, conversions: top.conversions },
    { impressions: second.impressions, conversions: second.conversions },
  );

  if (significance >= minConfidence) {
    return top.creationId;
  }

  return null;
}

/**
 * Build the automation job summary for display.
 */
export function summarizeJob(job: AutomationJob): string {
  const variantCount = job.variants.length;
  const totalImpressions = job.variants.reduce((s, v) => s + v.impressions, 0);
  const totalSpend = job.variants.reduce((s, v) => s + v.spend, 0);
  const totalRevenue = job.variants.reduce((s, v) => s + v.revenue, 0);

  if (job.status === 'completed' && job.winner) {
    const winner = job.variants.find(v => v.creationId === job.winner);
    return `Winner: Variant ${winner?.label || '?'}. ${variantCount} variants tested, ${totalImpressions.toLocaleString()} impressions, $${totalSpend.toFixed(2)} spend, $${totalRevenue.toFixed(2)} revenue.`;
  }
  if (job.status === 'monitoring') {
    return `Testing ${variantCount} variants. ${totalImpressions.toLocaleString()} impressions so far. Waiting for statistical significance.`;
  }
  if (job.status === 'planning') {
    return `Planning A/B test with ${variantCount} variants on ${job.platform}.`;
  }
  if (job.status === 'launching') {
    return `Launching ${variantCount} variants on ${job.platform}.`;
  }
  if (job.status === 'failed') {
    return `Failed: ${job.error || 'unknown error'}`;
  }
  return `${variantCount} variants on ${job.platform}.`;
}
