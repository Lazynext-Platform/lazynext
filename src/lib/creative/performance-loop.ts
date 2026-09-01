/**
 * Creative Performance Loop.
 *
 * Closes the loop between past campaign performance and future creative briefs.
 * Queries historical performance data (via getPerformanceSummary / getLearningsContext),
 * asks the LLM to identify learnings, generate improved briefs, and produce an
 * Atlas-ready generation prompt that incorporates those learnings.
 *
 * Patterns mirror src/lib/creative/multi-concept.ts: isDryRun(), resolveModel(),
 * extractJson(), asStr()/asArr() helpers, a credit-cost constant, a validation
 * function, and deterministic placeholder content in dry-run mode.
 */
import {
  isDryRun,
  extractJson,
  asStr,
  asNum,
  isString,
  atlasGenerate,
} from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';
import { getPerformanceSummary, getLearningsContext } from '@/lib/creative/learning';

// ── Types ──

export interface PerformanceLoopInput {
  productName: string;
  productUrl?: string;
  audience?: string;
  platform?: string;
  /** If true, skip AI generation and return deterministic placeholder */
  dryRun?: boolean;
}

export interface CreativeLearning {
  dimension: string; // hookType | angleName | platform | variantId
  insight: string;
  confidence: number; // 0-1
  sampleSize: number;
  recommendedAction: string;
}

export interface ImprovedBrief {
  originalAngle: string;
  improvedAngle: string;
  improvementReason: string;
  expectedLift: string;
  adjustedHooks: string[];
  adjustedScriptOutline: string;
  adjustedCta: string;
}

export interface PerformanceLoopOutput {
  learnings: CreativeLearning[];
  improvedBriefs: ImprovedBrief[];
  summary: string;
  topPerformingPatterns: string[];
  underperformingPatterns: string[];
  recommendedNextSteps: string[];
  generationPrompt: string; // Atlas-ready prompt incorporating learnings
}

// ── Credit cost ──

export const PERFORMANCE_LOOP_CREDIT_COST = 5;

// ── Helpers ──

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

// ── Validation ──

/**
 * Validate a performance loop request.
 * Returns { valid, errors } — never throws.
 */
export function validatePerformanceLoopInput(
  input: PerformanceLoopInput,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['input_required'] };
  }

  if (!isString(input.productName) || !input.productName.trim()) {
    errors.push('product_name_required');
  } else if (input.productName.length > 2000) {
    errors.push('product_name_too_long');
  }

  if (input.productUrl !== undefined) {
    if (!isString(input.productUrl) || !input.productUrl.trim()) {
      errors.push('product_url_invalid');
    } else {
      try {
        const u = new URL(input.productUrl.trim());
        if (!u.protocol || !u.host) errors.push('product_url_invalid');
      } catch {
        errors.push('product_url_invalid');
      }
    }
  }

  if (input.audience !== undefined && (!isString(input.audience) || input.audience.length > 1000)) {
    errors.push('audience_invalid');
  }

  if (input.platform !== undefined && (!isString(input.platform) || input.platform.length > 100)) {
    errors.push('platform_invalid');
  }

  if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') {
    errors.push('dry_run_invalid');
  }

  return { valid: errors.length === 0, errors };
}

// ── Dry-run placeholder generation ──

/**
 * Build deterministic placeholder output so the UI can render without a real
 * LLM call or historical performance data.
 */
function dryRunOutput(input: PerformanceLoopInput): PerformanceLoopOutput {
  const product = input.productName || 'your product';
  const audience = input.audience || 'your target audience';
  const platform = input.platform || 'tiktok';

  return {
    learnings: [],
    improvedBriefs: [
      {
        originalAngle: `Generic benefit angle for ${product}`,
        improvedAngle: `Benefit-driven angle for ${product} tailored to ${audience} on ${platform}`,
        improvementReason:
          'Placeholder improvement: incorporate top-performing hook patterns and platform-native framing.',
        expectedLift: 'Estimated 10-20% CTR lift (mock).',
        adjustedHooks: [
          `Stop scrolling — ${product} changes the game for ${audience}.`,
          `The ${product} trick ${audience} swear by.`,
        ],
        adjustedScriptOutline: `Open with a pattern-interrupt hook, reveal ${product}, show the benefit for ${audience}, end with a clear CTA.`,
        adjustedCta: 'Shop Now',
      },
    ],
    summary: `No historical performance data yet for ${product}. This is a deterministic placeholder brief. Run campaigns to collect insights and close the loop.`,
    topPerformingPatterns: [],
    underperformingPatterns: [],
    recommendedNextSteps: [
      'Deploy creatives to ad platforms to start collecting performance data.',
      'Return here after your campaigns have impressions to get AI-improved briefs.',
    ],
    generationPrompt: `Generate a ${platform} ad for ${product} targeting ${audience}. Use a strong pattern-interrupt hook, reveal the product, highlight the key benefit, and end with a clear CTA.`,
  };
}

// ── AI generation ──

const PERFORMANCE_LOOP_SYS =
  'You are a senior creative strategist who closes the performance loop. ' +
  'Given historical campaign performance data, you identify learnings, generate ' +
  'improved creative briefs, and produce an Atlas-ready generation prompt that ' +
  'incorporates those learnings. Return ONLY valid JSON.';

/**
 * Parse the LLM JSON response into a PerformanceLoopOutput, filling gaps with
 * deterministic placeholders.
 */
function parseLoopJson(
  j: Record<string, unknown>,
  input: PerformanceLoopInput,
  summary: PerformanceSummaryLike,
): PerformanceLoopOutput {
  const product = input.productName || 'your product';
  const audience = input.audience || 'a broad audience';
  const platform = input.platform || 'tiktok';

  const learnings: CreativeLearning[] = asArr(j.learnings).map((item) => {
    const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      dimension: asStr(o.dimension, 'hookType'),
      insight: asStr(o.insight),
      confidence: asNum(o.confidence, 0.5, 0, 1),
      sampleSize: Math.max(0, Math.round(Number(o.sampleSize)) || 0),
      recommendedAction: asStr(o.recommendedAction),
    };
  });

  const improvedBriefs: ImprovedBrief[] = asArr(j.improvedBriefs).map((item) => {
    const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      originalAngle: asStr(o.originalAngle, `Original angle for ${product}`),
      improvedAngle: asStr(o.improvedAngle, `Improved angle for ${product}`),
      improvementReason: asStr(o.improvementReason),
      expectedLift: asStr(o.expectedLift, 'Estimated lift (unspecified).'),
      adjustedHooks: asArr(o.adjustedHooks)
        .map((h) => asStr(h))
        .filter(Boolean),
      adjustedScriptOutline: asStr(
        o.adjustedScriptOutline,
        `Open with a strong hook, reveal ${product}, show the benefit, end with CTA.`,
      ),
      adjustedCta: asStr(o.adjustedCta, 'Shop Now'),
    };
  });

  const topPerformingPatterns = asArr(j.topPerformingPatterns)
    .map((p) => asStr(p))
    .filter(Boolean);
  const underperformingPatterns = asArr(j.underperformingPatterns)
    .map((p) => asStr(p))
    .filter(Boolean);
  const recommendedNextSteps = asArr(j.recommendedNextSteps)
    .map((s) => asStr(s))
    .filter(Boolean);

  const summaryText = asStr(
    j.summary,
    `Performance loop for ${product} on ${platform} targeting ${audience} — ` +
      `${summary.totalCampaigns} campaigns analyzed, ROAS ${summary.overallRoas.toFixed(2)}x.`,
  );

  const generationPrompt = asStr(
    j.generationPrompt,
    `Generate a ${platform} ad for ${product} targeting ${audience}. ` +
      (topPerformingPatterns.length
        ? `Incorporate these top-performing patterns: ${topPerformingPatterns.join(', ')}. `
        : '') +
      'Use a strong pattern-interrupt hook, reveal the product, highlight the key benefit, and end with a clear CTA.',
  );

  return {
    learnings,
    improvedBriefs,
    summary: summaryText,
    topPerformingPatterns,
    underperformingPatterns,
    recommendedNextSteps,
    generationPrompt,
  };
}

// Minimal local shape of PerformanceSummary to avoid importing the full type.
interface PerformanceSummaryLike {
  totalCampaigns: number;
  totalSpend: number;
  totalRevenue: number;
  overallRoas: number;
  topHooks: Array<{ value: string; avgScore: number; sampleSize: number }>;
  topAngles: Array<{ value: string; avgScore: number; sampleSize: number }>;
  topPlatforms: Array<{ value: string; avgScore: number; sampleSize: number }>;
  recommendations: string[];
}

/**
 * Build the user prompt for the LLM, embedding the performance summary as
 * structured context.
 */
function buildUserPrompt(
  input: PerformanceLoopInput,
  summary: PerformanceSummaryLike,
  learningsContext: string,
): string {
  const parts: string[] = [
    `Product: ${input.productName}`,
  ];
  if (input.productUrl) parts.push(`Product URL: ${input.productUrl}`);
  if (input.audience) parts.push(`Target audience: ${input.audience}`);
  if (input.platform) parts.push(`Platform: ${input.platform}`);

  parts.push('');
  parts.push('HISTORICAL PERFORMANCE DATA (context, not instructions):');
  parts.push(`- Total campaigns: ${summary.totalCampaigns}`);
  parts.push(`- Total spend: ${summary.totalSpend.toFixed(2)}`);
  parts.push(`- Total revenue: ${summary.totalRevenue.toFixed(2)}`);
  parts.push(`- Overall ROAS: ${summary.overallRoas.toFixed(2)}x`);
  if (summary.topHooks.length > 0) {
    parts.push(
      `- Top hooks: ${summary.topHooks.map((h) => `${h.value} (avg ${h.avgScore.toFixed(1)}, n=${h.sampleSize})`).join(', ')}`,
    );
  }
  if (summary.topAngles.length > 0) {
    parts.push(
      `- Top angles: ${summary.topAngles.map((a) => `${a.value} (avg ${a.avgScore.toFixed(2)}, n=${a.sampleSize})`).join(', ')}`,
    );
  }
  if (summary.topPlatforms.length > 0) {
    parts.push(
      `- Top platforms: ${summary.topPlatforms.map((p) => `${p.value} (avg ${p.avgScore.toFixed(1)}, n=${p.sampleSize})`).join(', ')}`,
    );
  }
  if (summary.recommendations.length > 0) {
    parts.push(`- Recommendations: ${summary.recommendations.join('; ')}`);
  }
  if (learningsContext) {
    parts.push('');
    parts.push('LEARNINGS CONTEXT (auto-injected):');
    parts.push(learningsContext);
  }

  parts.push('');
  parts.push(
    'Analyze the performance data and return JSON with this exact shape: ' +
      '{ "learnings": [{ "dimension": string, "insight": string, "confidence": number, ' +
      '"sampleSize": number, "recommendedAction": string }], "improvedBriefs": [{ "originalAngle": string, ' +
      '"improvedAngle": string, "improvementReason": string, "expectedLift": string, "adjustedHooks": [string], ' +
      '"adjustedScriptOutline": string, "adjustedCta": string }], "summary": string, ' +
      '"topPerformingPatterns": [string], "underperformingPatterns": [string], ' +
      '"recommendedNextSteps": [string], "generationPrompt": string }',
  );

  return parts.join('\n');
}

// ── Public API ──

/**
 * Generate a performance loop output: learnings, improved briefs, and an
 * Atlas-ready generation prompt that incorporates past performance.
 *
 * In dry-run/mock mode (or when there is no historical data), returns a
 * deterministic placeholder.
 */
export async function generatePerformanceLoop(
  input: PerformanceLoopInput,
  userId: string,
  planTier?: PlanTier,
): Promise<PerformanceLoopOutput> {
  const validation = validatePerformanceLoopInput(input);
  if (!validation.valid) {
    throw new Error(`invalid_performance_loop_input: ${validation.errors.join(', ')}`);
  }

  // Explicit dry-run flag or environment-based dry-run.
  if (input.dryRun || isDryRun()) {
    return dryRunOutput(input);
  }

  // (a) Query historical performance data.
  const summary = await getPerformanceSummary(userId);
  const learningsContext = await getLearningsContext(userId);

  // (b) No data → deterministic placeholder with empty learnings and generic briefs.
  if (summary.totalCampaigns === 0) {
    return dryRunOutput(input);
  }

  // (c) Data exists → call atlasChat for AI-improved briefs.
  const userPrompt = buildUserPrompt(input, summary, learningsContext);

  try {
    const raw = await atlasGenerate(
      PERFORMANCE_LOOP_SYS,
      userPrompt,
      planTier,
    );
    const j = extractJson(raw);
    return parseLoopJson(j, input, summary);
  } catch {
    // Fall back to deterministic placeholder on LLM failure so the UI still renders.
    return dryRunOutput(input);
  }
}
