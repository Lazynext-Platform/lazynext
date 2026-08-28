/**
 * Creative Quality Scoring Engine.
 *
 * Goes beyond the basic `scoreCreative` function in intelligence.ts by scoring
 * creatives across six quality dimensions (attention, persuasion, brand fit,
 * emotional resonance, clarity, platform fit), computing grades, percentiles,
 * benchmark comparisons, estimated performance, and improvement potential.
 *
 * All AI calls use the existing atlasChat() from src/lib/atlas.ts.
 * Credit cost is defined per analysis and exported for the route layer.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

export const QUALITY_SCORING_COST = 5;

// ── Types ──

export type QualityDimension =
  | 'attention'
  | 'persuasion'
  | 'brand_fit'
  | 'emotional_resonance'
  | 'clarity'
  | 'platform_fit';

export type ScoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type BenchmarkType = 'industry_avg' | 'top_quartile' | 'user_history';

// ── Interfaces ──

export interface DimensionScore {
  dimension: QualityDimension;
  score: number; // 0-100
  grade: ScoreGrade;
  benchmark: number; // benchmark score for comparison
  benchmarkType: BenchmarkType;
  percentile: number; // 0-100, where this score ranks
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface QualityAssessment {
  overallScore: number;
  overallGrade: ScoreGrade;
  dimensionScores: DimensionScore[];
  topStrengths: string[];
  topWeaknesses: string[];
  priorityRecommendations: string[];
  estimatedPerformance: {
    predictedCtr: number;
    predictedCvr: number;
    predictedRoas: number;
    confidenceLevel: number; // 0-100
  };
  benchmarkComparison: {
    vsIndustryAvg: number; // delta
    vsTopQuartile: number; // delta
    vsUserHistory: number; // delta
  };
  improvementPotential: number; // 0-100, how much room for improvement
}

export interface QualityScoringResult {
  assessment: QualityAssessment;
  insights: string[];
  actionItems: string[];
}

// ── Constants ──

const CREATIVE_MODEL = process.env.CREATIVE_MODEL || getLLMModel();
const CREATIVE_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);
const CREATIVE_MAX_TOKENS = Number(process.env.CREATIVE_MAX_TOKENS || 6000);

const ALL_DIMENSIONS: QualityDimension[] = [
  'attention',
  'persuasion',
  'brand_fit',
  'emotional_resonance',
  'clarity',
  'platform_fit',
];

const ALL_GRADES: ScoreGrade[] = ['A', 'B', 'C', 'D', 'F'];

const ALL_BENCHMARK_TYPES: BenchmarkType[] = ['industry_avg', 'top_quartile', 'user_history'];

// Default benchmark scores per dimension for each benchmark type.
// These represent typical e-commerce ad creative performance baselines.
const BENCHMARK_SCORES: Record<BenchmarkType, Record<QualityDimension, number>> = {
  industry_avg: {
    attention: 55,
    persuasion: 50,
    brand_fit: 60,
    emotional_resonance: 48,
    clarity: 62,
    platform_fit: 58,
  },
  top_quartile: {
    attention: 80,
    persuasion: 78,
    brand_fit: 85,
    emotional_resonance: 76,
    clarity: 88,
    platform_fit: 82,
  },
  user_history: {
    attention: 60,
    persuasion: 58,
    brand_fit: 65,
    emotional_resonance: 55,
    clarity: 68,
    platform_fit: 62,
  },
};

// ── Helpers ──

function resolveCreativeModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_quality_scoring_output');
  return JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function asStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => asStr(x)).filter(Boolean).slice(0, 20) : [];
}

function asNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function asDimension(v: unknown): QualityDimension | undefined {
  const s = asStr(v);
  return (ALL_DIMENSIONS as string[]).includes(s) ? (s as QualityDimension) : undefined;
}

function asBenchmarkType(v: unknown): BenchmarkType {
  const s = asStr(v, 'industry_avg');
  return (ALL_BENCHMARK_TYPES as string[]).includes(s) ? (s as BenchmarkType) : 'industry_avg';
}

// ── Reference data getters ──

export function getQualityDimensions(): Array<{
  dimension: QualityDimension;
  name: string;
  description: string;
}> {
  return [
    {
      dimension: 'attention',
      name: 'Attention',
      description: 'Ability to capture and hold viewer attention in the first 3 seconds',
    },
    {
      dimension: 'persuasion',
      name: 'Persuasion',
      description: 'Effectiveness of persuasive techniques, value proposition, and call to action',
    },
    {
      dimension: 'brand_fit',
      name: 'Brand Fit',
      description: 'Alignment with brand voice, tone, visual style, and messaging pillars',
    },
    {
      dimension: 'emotional_resonance',
      name: 'Emotional Resonance',
      description: 'Emotional impact and ability to connect with the target audience',
    },
    {
      dimension: 'clarity',
      name: 'Clarity',
      description: 'Clarity of message, product positioning, and value communication',
    },
    {
      dimension: 'platform_fit',
      name: 'Platform Fit',
      description: 'Suitability for the target platform format, conventions, and audience expectations',
    },
  ];
}

export function getScoreGrades(): Array<{ grade: ScoreGrade; minScore: number; label: string }> {
  return [
    { grade: 'A', minScore: 90, label: 'Excellent' },
    { grade: 'B', minScore: 80, label: 'Good' },
    { grade: 'C', minScore: 70, label: 'Average' },
    { grade: 'D', minScore: 60, label: 'Below Average' },
    { grade: 'F', minScore: 0, label: 'Poor' },
  ];
}

// ── Scoring helpers ──

export function calculateGrade(score: number): ScoreGrade {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const grades = getScoreGrades();
  for (const g of grades) {
    if (clamped >= g.minScore) return g.grade;
  }
  return 'F';
}

/**
 * Calculate the percentile of a score relative to a benchmark.
 * Uses a normal-distribution-inspired model where the benchmark represents
 * the median (50th percentile). A score equal to the benchmark yields the
 * 50th percentile; higher scores climb toward 99, lower scores toward 1.
 */
export function calculatePercentile(score: number, benchmark: number): number {
  const s = Math.max(0, Math.min(100, score));
  const b = Math.max(0, Math.min(100, benchmark));
  if (b <= 0) return s >= 50 ? 99 : 1;
  // Use a logistic-style mapping centered at the benchmark (50th percentile).
  // A score of 100 maps near 99; a score of 0 maps near 1.
  const diff = s - b;
  // Steepness: a 20-point swing roughly moves ~30 percentile points.
  const percentile = 50 + (diff / (diff >= 0 ? 20 : 25)) * 30;
  return Math.max(1, Math.min(99, Math.round(percentile)));
}

export function calculateOverallGrade(dimensions: DimensionScore[]): ScoreGrade {
  if (dimensions.length === 0) return 'F';
  const overall = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;
  return calculateGrade(overall);
}

/**
 * Calculate improvement potential (0-100).
 * Represents how much room exists for improvement — 100 means all dimensions
 * are at the minimum (lots of room), 0 means all dimensions are perfect.
 */
export function calculateImprovementPotential(dimensions: DimensionScore[]): number {
  if (dimensions.length === 0) return 100;
  const totalGap = dimensions.reduce((sum, d) => sum + (100 - d.score), 0);
  return Math.round(totalGap / dimensions.length);
}

export function getBenchmarkScores(
  benchmarkType: BenchmarkType,
): Record<QualityDimension, number> {
  return { ...BENCHMARK_SCORES[benchmarkType] };
}

// ── Validation ──

export function validateQualityScoringRequest(
  request: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (
    !request.creativeContent ||
    typeof request.creativeContent !== 'string' ||
    !request.creativeContent.trim()
  ) {
    errors.push('creativeContent is required');
  }

  if (
    request.creativeType !== undefined &&
    typeof request.creativeType !== 'string'
  ) {
    errors.push('creativeType must be a string');
  }

  if (request.platform !== undefined && typeof request.platform !== 'string') {
    errors.push('platform must be a string');
  }

  if (
    request.targetAudience !== undefined &&
    typeof request.targetAudience !== 'string'
  ) {
    errors.push('targetAudience must be a string');
  }

  if (
    request.brandContext !== undefined &&
    typeof request.brandContext !== 'string'
  ) {
    errors.push('brandContext must be a string');
  }

  if (request.benchmarkType !== undefined) {
    const bt = asStr(request.benchmarkType);
    if (!(ALL_BENCHMARK_TYPES as string[]).includes(bt)) {
      errors.push(`benchmarkType must be one of: ${ALL_BENCHMARK_TYPES.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Deterministic fallback ──

/**
 * Build a deterministic fallback result when the LLM fails.
 * Returns reasonable default scores derived from simple content heuristics
 * so the caller always gets a usable assessment.
 */
function buildFallbackAssessment(
  creativeContent: string,
  benchmarkType: BenchmarkType,
): QualityScoringResult {
  const content = creativeContent || '';
  const lower = content.toLowerCase();
  const len = content.length;

  // Heuristic scoring based on content length and keyword presence
  const hasHook = /\b(stop|wait|did you know|imagine|what if|never|secret)\b/.test(lower);
  const hasCta = /\b(buy|shop|order|click|get|try|subscribe|follow|swipe|tap)\b/.test(lower);
  const hasSocialProof = /\b(reviews?|rated|customers?|loved|trusted|bestseller|thousands)\b/.test(lower);
  const hasEmotion = /\b(love|amazing|incredible|wow|finally|transform|dream|happy)\b/.test(lower);
  const hasClarity = len > 50 && len < 2000;
  const hasUrgency = /\b(now|today|limited|hurry|ends? soon|last chance|only)\b/.test(lower);

  const baseScores: Record<QualityDimension, number> = {
    attention: 50 + (hasHook ? 15 : 0) + (hasUrgency ? 10 : 0),
    persuasion: 50 + (hasCta ? 15 : 0) + (hasSocialProof ? 10 : 0),
    brand_fit: 55 + (hasClarity ? 10 : 0),
    emotional_resonance: 48 + (hasEmotion ? 18 : 0),
    clarity: 55 + (hasClarity ? 12 : 0) + (len > 0 ? 5 : 0),
    platform_fit: 52 + (hasHook ? 10 : 0) + (hasCta ? 8 : 0),
  };

  const benchmarks = getBenchmarkScores(benchmarkType);

  const dimensionScores: DimensionScore[] = ALL_DIMENSIONS.map((dim) => {
    const score = Math.max(0, Math.min(100, Math.round(baseScores[dim])));
    const benchmark = benchmarks[dim];
    return {
      dimension: dim,
      score,
      grade: calculateGrade(score),
      benchmark,
      benchmarkType,
      percentile: calculatePercentile(score, benchmark),
      strengths: score >= benchmark ? ['Performs above benchmark'] : [],
      weaknesses: score < benchmark ? ['Performs below benchmark'] : [],
      recommendations:
        score < benchmark ? ['Improve this dimension to meet benchmark performance'] : [],
    };
  });

  const overallScore = Math.round(
    dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length,
  );
  const overallGrade = calculateGrade(overallScore);
  const improvementPotential = calculateImprovementPotential(dimensionScores);

  const topStrengths = dimensionScores
    .filter((d) => d.strengths.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) => `${d.dimension.replace(/_/g, ' ')}: ${d.strengths[0]}`);

  const topWeaknesses = dimensionScores
    .filter((d) => d.weaknesses.length > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((d) => `${d.dimension.replace(/_/g, ' ')}: ${d.weaknesses[0]}`);

  const priorityRecommendations = dimensionScores
    .filter((d) => d.recommendations.length > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((d) => d.recommendations[0]);

  const industryAvg = getBenchmarkScores('industry_avg');
  const topQuartile = getBenchmarkScores('top_quartile');
  const userHistory = getBenchmarkScores('user_history');

  const avgBenchmark = (b: Record<QualityDimension, number>) =>
    ALL_DIMENSIONS.reduce((sum, dim) => sum + b[dim], 0) / ALL_DIMENSIONS.length;

  const benchmarkComparison = {
    vsIndustryAvg: Math.round(overallScore - avgBenchmark(industryAvg)),
    vsTopQuartile: Math.round(overallScore - avgBenchmark(topQuartile)),
    vsUserHistory: Math.round(overallScore - avgBenchmark(userHistory)),
  };

  // Estimated performance derived from overall score
  const predictedCtr = Math.round((overallScore / 100) * 4.5 * 100) / 100; // 0-4.5%
  const predictedCvr = Math.round((overallScore / 100) * 3.2 * 100) / 100; // 0-3.2%
  const predictedRoas = Math.round((overallScore / 100) * 5 * 100) / 100; // 0-5x
  const confidenceLevel = Math.max(20, Math.min(70, Math.round(overallScore * 0.6)));

  return {
    assessment: {
      overallScore,
      overallGrade,
      dimensionScores,
      topStrengths,
      topWeaknesses,
      priorityRecommendations,
      estimatedPerformance: {
        predictedCtr,
        predictedCvr,
        predictedRoas,
        confidenceLevel,
      },
      benchmarkComparison,
      improvementPotential,
    },
    insights: [
      `Overall quality score is ${overallScore}/100 (grade ${overallGrade}).`,
      improvementPotential > 40
        ? `Significant improvement potential (${improvementPotential}/100) — focus on the lowest-scoring dimensions.`
        : `Limited improvement potential (${improvementPotential}/100) — creative is near its quality ceiling.`,
    ],
    actionItems: priorityRecommendations.length > 0
      ? priorityRecommendations
      : ['Review the creative against the dimension scores and refine weak areas.'],
  };
}

// ── Main scoring function ──

export async function scoreCreativeQuality(params: {
  creativeContent: string;
  creativeType?: string;
  platform?: string;
  targetAudience?: string;
  brandContext?: string;
  benchmarkType?: BenchmarkType;
  planTier: PlanTier;
}): Promise<QualityScoringResult> {
  const {
    creativeContent,
    creativeType = '',
    platform = '',
    targetAudience = '',
    brandContext = '',
    benchmarkType = 'industry_avg',
    planTier,
  } = params;

  const benchmarks = getBenchmarkScores(benchmarkType);

  // Build the system prompt asking the LLM to score across all 6 dimensions
  const systemPrompt = `You are an expert creative quality analyst for e-commerce advertising. Score the provided creative across six quality dimensions (0-100 each) and return ONLY valid JSON — no markdown, no explanation.

The six dimensions are:
1. attention — Ability to capture and hold viewer attention in the first 3 seconds
2. persuasion — Effectiveness of persuasive techniques, value proposition, and call to action
3. brand_fit — Alignment with brand voice, tone, visual style, and messaging pillars
4. emotional_resonance — Emotional impact and ability to connect with the target audience
5. clarity — Clarity of message, product positioning, and value communication
6. platform_fit — Suitability for the target platform format, conventions, and audience expectations

Return JSON with this exact schema:
{
  "dimensions": [
    {
      "dimension": "attention|persuasion|brand_fit|emotional_resonance|clarity|platform_fit",
      "score": 0-100,
      "strengths": ["string", ...],
      "weaknesses": ["string", ...],
      "recommendations": ["string", ...]
    }
  ],
  "estimatedPerformance": {
    "predictedCtr": 0-5,
    "predictedCvr": 0-5,
    "predictedRoas": 0-6,
    "confidenceLevel": 0-100
  },
  "insights": ["string", ...],
  "actionItems": ["string", ...]
}

All text fields must be in English. Output ONLY the JSON object.`;

  const userParts: string[] = [
    `Creative content to score:`,
    creativeContent.slice(0, 5000),
  ];
  if (creativeType) userParts.push(`Creative type: ${creativeType}`);
  if (platform) userParts.push(`Platform: ${platform}`);
  if (targetAudience) userParts.push(`Target audience: ${targetAudience}`);
  if (brandContext) userParts.push(`Brand context: ${brandContext}`);
  userParts.push(`Benchmark type for comparison: ${benchmarkType}`);
  userParts.push('Output the quality scoring JSON now.');

  let aiData: Record<string, unknown> = {};
  try {
    const raw = await atlasChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userParts.join('\n') },
      ],
      resolveCreativeModel(planTier),
      CREATIVE_MAX_TOKENS,
      CREATIVE_TIMEOUT_MS,
    );
    aiData = extractJson(raw);
  } catch {
    // Fall through to deterministic fallback
    return buildFallbackAssessment(creativeContent, benchmarkType);
  }

  try {
    // Parse dimension scores from the LLM response
    const rawDims = Array.isArray(aiData.dimensions) ? aiData.dimensions : [];
    const dimMap = new Map<string, Record<string, unknown>>();
    for (const item of rawDims) {
      const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const dim = asDimension(o.dimension);
      if (dim) dimMap.set(dim, o);
    }

    const dimensionScores: DimensionScore[] = ALL_DIMENSIONS.map((dim) => {
      const o = dimMap.get(dim) || {};
      const score = asNum(o.score, benchmarks[dim], 0, 100);
      const benchmark = benchmarks[dim];
      return {
        dimension: dim,
        score,
        grade: calculateGrade(score),
        benchmark,
        benchmarkType,
        percentile: calculatePercentile(score, benchmark),
        strengths: asStrArr(o.strengths),
        weaknesses: asStrArr(o.weaknesses),
        recommendations: asStrArr(o.recommendations),
      };
    });

    const overallScore = Math.round(
      dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length,
    );
    const overallGrade = calculateGrade(overallScore);
    const improvementPotential = calculateImprovementPotential(dimensionScores);

    // Aggregate top strengths and weaknesses across dimensions
    const allStrengths = dimensionScores
      .flatMap((d) => d.strengths.map((s) => ({ dim: d.dimension, s, score: d.score })))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.s);

    const allWeaknesses = dimensionScores
      .flatMap((d) => d.weaknesses.map((s) => ({ dim: d.dimension, s, score: d.score })))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map((x) => x.s);

    const priorityRecommendations = dimensionScores
      .filter((d) => d.recommendations.length > 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .flatMap((d) => d.recommendations)
      .slice(0, 5);

    // Estimated performance
    const ep = (aiData.estimatedPerformance && typeof aiData.estimatedPerformance === 'object'
      ? aiData.estimatedPerformance
      : {}) as Record<string, unknown>;
    const predictedCtr = asNum(ep.predictedCtr, Math.round((overallScore / 100) * 4.5 * 100) / 100, 0, 5);
    const predictedCvr = asNum(ep.predictedCvr, Math.round((overallScore / 100) * 3.2 * 100) / 100, 0, 5);
    const predictedRoas = asNum(ep.predictedRoas, Math.round((overallScore / 100) * 5 * 100) / 100, 0, 6);
    const confidenceLevel = asNum(ep.confidenceLevel, Math.max(20, Math.min(85, Math.round(overallScore * 0.7))), 0, 100);

    // Benchmark comparisons
    const industryAvg = getBenchmarkScores('industry_avg');
    const topQuartile = getBenchmarkScores('top_quartile');
    const userHistory = getBenchmarkScores('user_history');
    const avgBenchmark = (b: Record<QualityDimension, number>) =>
      ALL_DIMENSIONS.reduce((sum, dim) => sum + b[dim], 0) / ALL_DIMENSIONS.length;

    const benchmarkComparison = {
      vsIndustryAvg: Math.round(overallScore - avgBenchmark(industryAvg)),
      vsTopQuartile: Math.round(overallScore - avgBenchmark(topQuartile)),
      vsUserHistory: Math.round(overallScore - avgBenchmark(userHistory)),
    };

    const insights = asStrArr(aiData.insights);
    const actionItems = asStrArr(aiData.actionItems);

    // Ensure non-empty insights/actionItems with sensible defaults
    const finalInsights = insights.length > 0
      ? insights
      : [
          `Overall quality score is ${overallScore}/100 (grade ${overallGrade}).`,
          improvementPotential > 40
            ? `Significant improvement potential (${improvementPotential}/100) — focus on the lowest-scoring dimensions.`
            : `Limited improvement potential (${improvementPotential}/100) — creative is near its quality ceiling.`,
        ];

    const finalActionItems = actionItems.length > 0
      ? actionItems
      : priorityRecommendations.length > 0
        ? priorityRecommendations
        : ['Review the creative against the dimension scores and refine weak areas.'];

    return {
      assessment: {
        overallScore,
        overallGrade,
        dimensionScores,
        topStrengths: allStrengths,
        topWeaknesses: allWeaknesses,
        priorityRecommendations,
        estimatedPerformance: {
          predictedCtr,
          predictedCvr,
          predictedRoas,
          confidenceLevel,
        },
        benchmarkComparison,
        improvementPotential,
      },
      insights: finalInsights,
      actionItems: finalActionItems,
    };
  } catch {
    // If parsing fails, fall back to deterministic assessment
    return buildFallbackAssessment(creativeContent, benchmarkType);
  }
}
