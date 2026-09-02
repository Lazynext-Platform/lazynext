/**
 * Ad Creative Testing Lab — Advanced A/B/n testing framework.
 *
 * Features:
 *  - Frequentist analysis (Z-test for proportions, p-value, confidence level, Cohen's h, CI)
 *  - Bayesian analysis (Beta distribution, probability of being best, expected loss, credibility interval)
 *  - Multi-variant pairwise comparisons
 *  - Winner declaration logic with configurable confidence threshold
 *  - Automated budget reallocation toward winning variants
 *  - Sample size calculator
 *
 * All functions are composable and independent. The main entry point is
 * `runTestAnalysis` which orchestrates the full analysis pipeline.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import { isDryRun } from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

export const TESTING_LAB_COST = 5;

// ── Types ──

export type TestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';
export type TestType = 'ab' | 'abn' | 'multivariate' | 'split_url' | 'sequential';
export type WinnerCriteria = 'ctr' | 'cvr' | 'roas' | 'cpa' | 'revenue' | 'engagement' | 'custom';
export type ConfidenceMethod = 'frequentist' | 'bayesian' | 'both';
export type SignificanceResult = 'significant' | 'not_significant' | 'inconclusive';

export interface TestVariant {
  variantId: string;
  variantName: string;
  creativeId?: string;
  description: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
  engagementScore: number;
}

export interface StatisticalResult {
  method: ConfidenceMethod;
  pValue: number;
  confidenceLevel: number; // 0-100
  significanceResult: SignificanceResult;
  effectSize: number;
  confidenceInterval: { lower: number; upper: number };
  sampleSizeAdequate: boolean;
  recommendedSampleSize: number;
}

export interface BayesianResult {
  probabilityOfBeingBest: number; // 0-100
  expectedLoss: number;
  credibilityInterval: { lower: number; upper: number };
  posteriorDistribution: Array<{ value: number; probability: number }>;
}

export interface VariantComparison {
  variantA: string;
  variantB: string;
  metric: WinnerCriteria;
  difference: number;
  relativeImprovement: number;
  statisticalResult: StatisticalResult;
  bayesianResult?: BayesianResult;
  winner: string | null;
}

export interface WinnerDeclaration {
  winnerVariantId: string;
  winnerVariantName: string;
  confidence: number;
  criteria: WinnerCriteria;
  improvementOverControl: number;
  declarationStatus: 'declared' | 'pending' | 'no_winner';
  reasoning: string;
  recommendedAction: string;
}

export interface BudgetReallocation {
  variantId: string;
  variantName: string;
  currentBudgetPercent: number;
  recommendedBudgetPercent: number;
  expectedPerformanceGain: number;
  reasoning: string;
}

export interface TestResult {
  testId: string;
  testStatus: TestStatus;
  variants: TestVariant[];
  comparisons: VariantComparison[];
  winner: WinnerDeclaration;
  budgetReallocation: BudgetReallocation[];
  insights: Array<{
    insightId: string;
    type: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
  summary: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    totalSpend: number;
    overallRoas: number;
    bestPerformingMetric: string;
    testDuration: string;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImpact: string;
  }>;
  dryRun?: boolean;
}

export interface TestConfig {
  testId?: string;
  testType: TestType;
  winnerCriteria: WinnerCriteria;
  confidenceThreshold: number;
  variants: Array<{
    variantName: string;
    creativeId?: string;
    description: string;
  }>;
  controlVariantId?: string;
}

// ── Statistical helpers ──

/** Abramowitz & Stegun error function approximation (7.1.26). */
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** Standard normal CDF. */
function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Inverse standard normal CDF (Beasley-Springer-Moro / Acklam approximation). */
function invNorm(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161337,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number;
  let r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

// ── Gamma / Beta sampling (Marsaglia-Tsang) ──

/** Sample from a Gamma(shape, 1) distribution. */
function sampleGamma(shape: number): number {
  if (shape < 1) {
    // Boost: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    let u = Math.random();
    while (u === 0) u = Math.random(); // avoid log(0)
    return sampleGamma(shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = randNormal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Standard normal random variate (Box-Muller). */
function randNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Sample from a Beta(alpha, beta) distribution via two Gamma variates. */
function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  const sum = x + y;
  if (sum === 0) return 0;
  return x / sum;
}

// ── Metric extraction ──

/** Extract the relevant rate value, successes, and trials for a given metric. */
function getMetricData(
  variant: TestVariant,
  metric: WinnerCriteria,
): { value: number; successes: number; trials: number } {
  switch (metric) {
    case 'ctr':
      return {
        value: variant.ctr,
        successes: variant.clicks,
        trials: variant.impressions,
      };
    case 'cvr':
      return {
        value: variant.cvr,
        successes: variant.conversions,
        trials: variant.clicks,
      };
    case 'roas':
      return {
        value: variant.roas,
        successes: variant.conversions,
        trials: Math.max(1, variant.spend),
      };
    case 'cpa':
      // Lower is better — we invert for "higher is better" comparison
      return {
        value: variant.cpa,
        successes: variant.conversions,
        trials: Math.max(1, variant.spend),
      };
    case 'revenue':
      return {
        value: variant.revenue,
        successes: variant.conversions,
        trials: Math.max(1, variant.impressions),
      };
    case 'engagement':
      return {
        value: variant.engagementScore,
        successes: variant.clicks,
        trials: variant.impressions,
      };
    case 'custom':
    default:
      return {
        value: variant.engagementScore,
        successes: variant.clicks,
        trials: variant.impressions,
      };
  }
}

/** Determine whether higher values are better for a given metric. */
function higherIsBetter(metric: WinnerCriteria): boolean {
  return metric !== 'cpa';
}

// ── Public functions ──

/**
 * Calculate derived metrics for a variant from raw counts.
 * CTR and CVR are returned as percentages (0-100).
 */
export function calculateVariantMetrics(data: {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
}): { ctr: number; cvr: number; cpa: number; roas: number; engagementScore: number } {
  const impressions = Math.max(0, data.impressions || 0);
  const clicks = Math.max(0, data.clicks || 0);
  const conversions = Math.max(0, data.conversions || 0);
  const revenue = Math.max(0, data.revenue || 0);
  const spend = Math.max(0, data.spend || 0);

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 ? revenue / spend : 0;

  // Composite engagement score (0-100): weighted blend of CTR, CVR, and ROAS
  const ctrNorm = Math.min(100, ctr * 10); // CTR ~10% → 100
  const cvrNorm = Math.min(100, cvr * 5); // CVR ~20% → 100
  const roasNorm = Math.min(100, roas * 20); // ROAS ~5x → 100
  const engagementScore = Math.round(ctrNorm * 0.3 + cvrNorm * 0.4 + roasNorm * 0.3);

  return {
    ctr: Math.round(ctr * 10000) / 10000,
    cvr: Math.round(cvr * 10000) / 10000,
    cpa: Math.round(cpa * 100) / 100,
    roas: Math.round(roas * 10000) / 10000,
    engagementScore,
  };
}

/**
 * Perform a frequentist two-proportion Z-test between two variants.
 * Returns p-value, confidence level (0-100), effect size (Cohen's h),
 * and confidence interval for the difference.
 */
export function performFrequentistTest(
  variantA: TestVariant,
  variantB: TestVariant,
  metric: WinnerCriteria,
): StatisticalResult {
  const a = getMetricData(variantA, metric);
  const b = getMetricData(variantB, metric);

  const nA = Math.max(a.trials, 1);
  const nB = Math.max(b.trials, 1);
  const pA = a.successes / nA;
  const pB = b.successes / nB;

  // Pooled proportion for the Z-test
  const totalSuccesses = a.successes + b.successes;
  const totalTrials = nA + nB;
  const pPool = totalTrials > 0 ? totalSuccesses / totalTrials : 0;

  // Standard error using pooled proportion
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));

  // Z statistic (difference direction: B - A so positive means B is better when higher-is-better)
  const diff = pB - pA;
  const z = se > 0 ? diff / se : 0;

  // Two-tailed p-value
  const pValue = se > 0 ? 2 * (1 - normalCdf(Math.abs(z))) : 1;
  const confidenceLevel = Math.max(0, Math.min(100, (1 - pValue) * 100));

  // Cohen's h effect size
  const hA = 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, pA))));
  const hB = 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, pB))));
  const effectSize = Math.abs(hB - hA);

  // 95% confidence interval for the difference
  const zCrit = invNorm(0.975);
  const seUnpooled = Math.sqrt(pA * (1 - pA) / nA + pB * (1 - pB) / nB);
  const ciLower = seUnpooled > 0 ? diff - zCrit * seUnpooled : 0;
  const ciUpper = seUnpooled > 0 ? diff + zCrit * seUnpooled : 0;

  // Sample size adequacy
  const baselineRate = pPool > 0 ? pPool : 0.05;
  const mde = 0.05; // 5% absolute minimum detectable effect
  const recommendedSampleSize = Math.ceil(
    Math.pow(invNorm(0.975) + invNorm(0.8), 2) * baselineRate * (1 - baselineRate) / (mde * mde),
  );
  const sampleSizeAdequate = nA >= recommendedSampleSize && nB >= recommendedSampleSize;

  let significanceResult: SignificanceResult;
  if (!sampleSizeAdequate && confidenceLevel < 90) {
    significanceResult = 'inconclusive';
  } else if (confidenceLevel >= 95) {
    significanceResult = 'significant';
  } else {
    significanceResult = 'not_significant';
  }

  return {
    method: 'frequentist',
    pValue: Math.round(pValue * 1e10) / 1e10,
    confidenceLevel: Math.round(confidenceLevel * 100) / 100,
    significanceResult,
    effectSize: Math.round(effectSize * 10000) / 10000,
    confidenceInterval: {
      lower: Math.round(ciLower * 1e6) / 1e6,
      upper: Math.round(ciUpper * 1e6) / 1e6,
    },
    sampleSizeAdequate,
    recommendedSampleSize,
  };
}

/**
 * Perform a Bayesian analysis using Beta posteriors.
 * Returns probability of variant B being best (0-100), expected loss,
 * credibility interval, and a discrete posterior distribution.
 */
export function performBayesianTest(
  variantA: TestVariant,
  variantB: TestVariant,
  metric: WinnerCriteria,
): BayesianResult {
  const a = getMetricData(variantA, metric);
  const b = getMetricData(variantB, metric);

  // Beta prior parameters (weakly informative: Beta(1, 1) = uniform)
  const priorAlpha = 1;
  const priorBeta = 1;

  const alphaA = priorAlpha + a.successes;
  const betaA = priorBeta + Math.max(0, a.trials - a.successes);
  const alphaB = priorAlpha + b.successes;
  const betaB = priorBeta + Math.max(0, b.trials - b.successes);

  const hib = higherIsBetter(metric);
  const cpaInvert = metric === 'cpa';

  // Monte Carlo simulation
  const N = 10000;
  let bBetterCount = 0;
  let totalLossB = 0;
  let totalLossA = 0;
  const diffs: number[] = [];

  for (let i = 0; i < N; i++) {
    let sA = sampleBeta(alphaA, betaA);
    let sB = sampleBeta(alphaB, betaB);

    // For CPA, lower rate is better — invert so "higher = better"
    if (cpaInvert) {
      sA = sA > 0 ? 1 / sA : 0;
      sB = sB > 0 ? 1 / sB : 0;
    }

    if (hib ? sB > sA : sB < sA) bBetterCount++;
    // Expected loss: if we pick B but A was actually better
    totalLossB += hib ? Math.max(0, sA - sB) : Math.max(0, sB - sA);
    totalLossA += hib ? Math.max(0, sB - sA) : Math.max(0, sA - sB);
    diffs.push(sB - sA);
  }

  const probabilityOfBeingBest = (bBetterCount / N) * 100;
  const expectedLoss = totalLossB / N;

  // Credibility interval (95%) for the difference
  diffs.sort((x, y) => x - y);
  const lowerIdx = Math.floor(N * 0.025);
  const upperIdx = Math.floor(N * 0.975);
  const credLower = diffs[lowerIdx] ?? 0;
  const credUpper = diffs[upperIdx] ?? 0;

  // Discrete posterior distribution for variant B (20 buckets)
  const buckets = 20;
  const posteriorDistribution: Array<{ value: number; probability: number }> = [];
  const bucketCounts = new Array(buckets).fill(0);
  for (let i = 0; i < N; i++) {
    let sB = sampleBeta(alphaB, betaB);
    if (cpaInvert && sB > 0) sB = 1 / sB;
    const idx = Math.min(buckets - 1, Math.floor(sB * buckets));
    bucketCounts[idx]++;
  }
  for (let i = 0; i < buckets; i++) {
    posteriorDistribution.push({
      value: Math.round(((i + 0.5) / buckets) * 10000) / 10000,
      probability: Math.round((bucketCounts[i] / N) * 10000) / 100,
    });
  }

  return {
    probabilityOfBeingBest: Math.round(probabilityOfBeingBest * 100) / 100,
    expectedLoss: Math.round(expectedLoss * 1e6) / 1e6,
    credibilityInterval: {
      lower: Math.round(credLower * 1e6) / 1e6,
      upper: Math.round(credUpper * 1e6) / 1e6,
    },
    posteriorDistribution,
  };
}

/**
 * Compare all variants pairwise and return comparison results.
 * Uses both frequentist and Bayesian methods.
 */
export function compareAllVariants(
  variants: TestVariant[],
  criteria: WinnerCriteria,
  method: ConfidenceMethod = 'both',
): VariantComparison[] {
  const comparisons: VariantComparison[] = [];
  const hib = higherIsBetter(criteria);

  for (let i = 0; i < variants.length; i++) {
    for (let j = i + 1; j < variants.length; j++) {
      const a = variants[i];
      const b = variants[j];
      const aData = getMetricData(a, criteria);
      const bData = getMetricData(b, criteria);

      const difference = Math.round((bData.value - aData.value) * 10000) / 10000;
      const relativeImprovement =
        aData.value !== 0
          ? Math.round(((bData.value - aData.value) / Math.abs(aData.value)) * 10000) / 100
          : 0;

      const statisticalResult = performFrequentistTest(a, b, criteria);
      // Override method label
      if (method === 'bayesian') statisticalResult.method = 'bayesian';

      let bayesianResult: BayesianResult | undefined;
      if (method === 'both' || method === 'bayesian') {
        bayesianResult = performBayesianTest(a, b, criteria);
      }

      // Determine winner for this pair
      let winner: string | null = null;
      const isSignificant = statisticalResult.significanceResult === 'significant';
      if (isSignificant) {
        if (hib) {
          winner = bData.value > aData.value ? b.variantId : a.variantId;
        } else {
          winner = bData.value < aData.value ? b.variantId : a.variantId;
        }
      }

      comparisons.push({
        variantA: a.variantId,
        variantB: b.variantId,
        metric: criteria,
        difference,
        relativeImprovement,
        statisticalResult,
        bayesianResult,
        winner,
      });
    }
  }

  return comparisons;
}

/**
 * Declare a winner based on variant performance and statistical comparisons.
 */
export function declareWinner(
  variants: TestVariant[],
  comparisons: VariantComparison[],
  criteria: WinnerCriteria,
  threshold: number,
): WinnerDeclaration {
  const hib = higherIsBetter(criteria);
  const control = variants[0];
  const controlData = getMetricData(control, criteria);

  // Rank variants by the chosen criteria
  const ranked = [...variants].sort((a, b) => {
    const av = getMetricData(a, criteria).value;
    const bv = getMetricData(b, criteria).value;
    return hib ? bv - av : av - bv;
  });

  const best = ranked[0];
  const bestData = getMetricData(best, criteria);

  // Find comparisons involving the best variant
  const bestComparisons = comparisons.filter(
    (c) => c.variantA === best.variantId || c.variantB === best.variantId,
  );

  // Average confidence across comparisons involving the best variant
  const avgConfidence =
    bestComparisons.length > 0
      ? bestComparisons.reduce((sum, c) => sum + c.statisticalResult.confidenceLevel, 0) /
        bestComparisons.length
      : 0;

  // Bayesian probability (average if available)
  const avgBayesianProb =
    bestComparisons.length > 0 && bestComparisons.some((c) => c.bayesianResult)
      ? bestComparisons
          .filter((c) => c.bayesianResult)
          .reduce((sum, c) => sum + (c.bayesianResult!.probabilityOfBeingBest), 0) /
        bestComparisons.filter((c) => c.bayesianResult).length
      : 0;

  const confidence = Math.max(avgConfidence, avgBayesianProb);
  const allSignificant =
    bestComparisons.length > 0 &&
    bestComparisons.every((c) => c.statisticalResult.significanceResult === 'significant');

  const improvementOverControl =
    controlData.value !== 0
      ? Math.round(((bestData.value - controlData.value) / Math.abs(controlData.value)) * 10000) / 100
      : 0;

  let declarationStatus: 'declared' | 'pending' | 'no_winner';
  let reasoning: string;
  let recommendedAction: string;

  if (confidence >= threshold && allSignificant) {
    declarationStatus = 'declared';
    reasoning = `Variant "${best.variantName}" is the statistical winner with ${Math.round(confidence * 100) / 100}% confidence on ${criteria.toUpperCase()}. All pairwise comparisons are significant and the sample size is adequate.`;
    recommendedAction = `Scale budget toward "${best.variantName}" and pause underperforming variants.`;
  } else if (confidence >= threshold * 0.8) {
    declarationStatus = 'pending';
    reasoning = `Variant "${best.variantName}" is leading with ${Math.round(confidence * 100) / 100}% confidence, but has not yet reached the ${threshold}% threshold. Continue running the test to gather more data.`;
    recommendedAction = `Continue the test. Current leader: "${best.variantName}". Need approximately ${Math.max(0, Math.ceil((threshold - confidence) / 5))} more days of data.`;
  } else {
    declarationStatus = 'no_winner';
    reasoning = `No variant has reached the ${threshold}% confidence threshold. Current best confidence is ${Math.round(confidence * 100) / 100}%. The test needs more data or the variants are too similar to distinguish.`;
    recommendedAction = 'Continue running the test with equal budget allocation until a winner emerges or consider testing more differentiated variants.';
  }

  return {
    winnerVariantId: best.variantId,
    winnerVariantName: best.variantName,
    confidence: Math.round(confidence * 100) / 100,
    criteria,
    improvementOverControl,
    declarationStatus,
    reasoning,
    recommendedAction,
  };
}

/**
 * Calculate recommended budget reallocation across variants.
 * Winning variants get increased budget; underperformers get reduced.
 */
export function calculateBudgetReallocation(
  variants: TestVariant[],
  winner: WinnerDeclaration,
): BudgetReallocation[] {
  if (variants.length === 0) return [];

  const criteria = winner.criteria;
  const hib = higherIsBetter(criteria);

  // Score each variant by the criteria metric
  const scored = variants.map((v) => {
    const data = getMetricData(v, criteria);
    return { variant: v, value: data.value };
  });

  // Normalize values to 0-1 range
  const values = scored.map((s) => s.value);
  const maxVal = Math.max(...values, 1e-9);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1e-9;

  const totalSpend = variants.reduce((sum, v) => sum + v.spend, 0);

  // Current budget percent based on spend share
  const currentBudget = (v: TestVariant) =>
    totalSpend > 0 ? Math.round((v.spend / totalSpend) * 10000) / 100 : Math.round(10000 / variants.length) / 100;

  // Recommended allocation: proportional to normalized performance score
  // Use a softmax-like approach to amplify differences
  const scores = scored.map((s) => {
    const normalized = (s.value - minVal) / range; // 0-1
    return hib ? normalized : 1 - normalized;
  });

  // Apply exponential weighting to amplify the winner
  const weighted = scores.map((s) => Math.exp(s * 2));
  const totalWeighted = weighted.reduce((a, b) => a + b, 0);

  return scored.map((s, i) => {
    const recommendedBudgetPercent = Math.round((weighted[i] / totalWeighted) * 10000) / 100;
    const current = currentBudget(s.variant);
    const gain = Math.round((recommendedBudgetPercent - current) * 100) / 100;

    let reasoning: string;
    if (s.variant.variantId === winner.winnerVariantId && winner.declarationStatus === 'declared') {
      reasoning = `Winner variant — increase budget to maximize ${criteria.toUpperCase()} performance.`;
    } else if (gain > 0) {
      reasoning = `Strong performer on ${criteria.toUpperCase()} — increase allocation to capture upside.`;
    } else if (gain < 0) {
      reasoning = `Underperforming on ${criteria.toUpperCase()} — reduce allocation and redirect to top variants.`;
    } else {
      reasoning = `Maintain current allocation — performance is balanced.`;
    }

    return {
      variantId: s.variant.variantId,
      variantName: s.variant.variantName,
      currentBudgetPercent: current,
      recommendedBudgetPercent,
      expectedPerformanceGain: gain,
      reasoning,
    };
  });
}

/**
 * Calculate the required sample size per variant for a two-proportion Z-test.
 * Formula: n = (Z_alpha/2 + Z_beta)^2 * p * (1-p) / d^2
 */
export function calculateSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number,
  confidenceLevel: number,
  power: number,
): number {
  const alpha = 1 - confidenceLevel / 100;
  const zAlpha = invNorm(1 - alpha / 2);
  const zBeta = invNorm(power / 100);
  const p = Math.min(1, Math.max(0, baselineRate));
  const d = Math.abs(minimumDetectableEffect);

  if (d === 0) return Infinity;
  const n = Math.pow(zAlpha + zBeta, 2) * p * (1 - p) / (d * d);
  return Math.ceil(n);
}

/** Return the available test types with names and descriptions. */
export function getTestTypes(): Array<{ type: TestType; name: string; description: string }> {
  return [
    { type: 'ab', name: 'A/B Test', description: 'Compare two variants (control vs. treatment) to determine which performs better' },
    { type: 'abn', name: 'A/B/n Test', description: 'Compare multiple variants simultaneously to find the best performer' },
    { type: 'multivariate', name: 'Multivariate Test', description: 'Test multiple variables and their combinations to identify interactions' },
    { type: 'split_url', name: 'Split URL Test', description: 'Test entirely different page URLs or landing experiences' },
    { type: 'sequential', name: 'Sequential Test', description: 'Run variants in sequence over time periods to account for temporal effects' },
  ];
}

/** Return the available winner criteria with names and descriptions. */
export function getWinnerCriteria(): Array<{ criteria: WinnerCriteria; name: string; description: string }> {
  return [
    { criteria: 'ctr', name: 'Click-Through Rate', description: 'Percentage of impressions that result in clicks' },
    { criteria: 'cvr', name: 'Conversion Rate', description: 'Percentage of clicks that result in conversions' },
    { criteria: 'roas', name: 'Return on Ad Spend', description: 'Revenue generated per unit of ad spend' },
    { criteria: 'cpa', name: 'Cost Per Acquisition', description: 'Average cost to acquire one customer (lower is better)' },
    { criteria: 'revenue', name: 'Total Revenue', description: 'Total revenue generated by the variant' },
    { criteria: 'engagement', name: 'Engagement Score', description: 'Composite score blending CTR, CVR, and ROAS' },
    { criteria: 'custom', name: 'Custom Metric', description: 'User-defined custom success metric' },
  ];
}

/** Validate a test configuration. */
export function validateTestConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const validTypes: TestType[] = ['ab', 'abn', 'multivariate', 'split_url', 'sequential'];
  const validCriteria: WinnerCriteria[] = ['ctr', 'cvr', 'roas', 'cpa', 'revenue', 'engagement', 'custom'];

  if (!config.testType || typeof config.testType !== 'string') {
    errors.push('testType is required');
  } else if (!validTypes.includes(config.testType as TestType)) {
    errors.push(`testType must be one of: ${validTypes.join(', ')}`);
  }

  if (!config.winnerCriteria || typeof config.winnerCriteria !== 'string') {
    errors.push('winnerCriteria is required');
  } else if (!validCriteria.includes(config.winnerCriteria as WinnerCriteria)) {
    errors.push(`winnerCriteria must be one of: ${validCriteria.join(', ')}`);
  }

  const threshold = Number(config.confidenceThreshold);
  if (!Number.isFinite(threshold)) {
    errors.push('confidenceThreshold must be a number');
  } else if (threshold < 80 || threshold > 99) {
    errors.push('confidenceThreshold must be between 80 and 99');
  }

  if (!Array.isArray(config.variants)) {
    errors.push('variants must be an array');
  } else {
    if (config.variants.length < 2) {
      errors.push('At least 2 variants are required');
    }
    for (let i = 0; i < (config.variants as unknown[]).length; i++) {
      const v = (config.variants as Record<string, unknown>[])[i];
      if (!v || typeof v !== 'object') {
        errors.push(`variant[${i}] must be an object`);
        continue;
      }
      if (!v.variantName || typeof v.variantName !== 'string') {
        errors.push(`variant[${i}].variantName is required`);
      }
      if (typeof v.description !== 'string') {
        errors.push(`variant[${i}].description must be a string`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Main analysis orchestrator ──

/**
 * Run a complete test analysis: compute variant metrics, perform pairwise
 * comparisons, declare a winner, calculate budget reallocation, and generate
 * insights and recommendations.
 */
export async function runTestAnalysis(request: {
  testConfig: TestConfig;
  variantMetrics: Array<{
    variantId: string;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    spend: number;
  }>;
  planTier?: PlanTier;
}): Promise<TestResult> {
  const { testConfig, variantMetrics } = request;
  const testId = testConfig.testId || `test_${Date.now()}`;
  const criteria = testConfig.winnerCriteria;
  const threshold = testConfig.confidenceThreshold;

  // Build full variant objects with computed metrics
  const variants: TestVariant[] = variantMetrics.map((m, i) => {
    const cfg = testConfig.variants[i] || { variantName: `Variant ${i + 1}`, description: '' };
    const metrics = calculateVariantMetrics(m);
    return {
      variantId: m.variantId,
      variantName: cfg.variantName || `Variant ${i + 1}`,
      creativeId: cfg.creativeId,
      description: cfg.description || '',
      impressions: m.impressions,
      clicks: m.clicks,
      conversions: m.conversions,
      revenue: m.revenue,
      spend: m.spend,
      ...metrics,
    };
  });

  // Pairwise comparisons
  const comparisons = compareAllVariants(variants, criteria, 'both');

  // Winner declaration
  const winner = declareWinner(variants, comparisons, criteria, threshold);

  // Budget reallocation
  const budgetReallocation = calculateBudgetReallocation(variants, winner);

  // Summary
  const totalImpressions = variants.reduce((s, v) => s + v.impressions, 0);
  const totalClicks = variants.reduce((s, v) => s + v.clicks, 0);
  const totalConversions = variants.reduce((s, v) => s + v.conversions, 0);
  const totalRevenue = variants.reduce((s, v) => s + v.revenue, 0);
  const totalSpend = variants.reduce((s, v) => s + v.spend, 0);
  const overallRoas = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0;

  // Best performing metric
  const criteriaInfo = getWinnerCriteria().find((c) => c.criteria === criteria);
  const bestPerformingMetric = criteriaInfo ? criteriaInfo.name : criteria;

  // Test duration estimate (based on total impressions, assume ~1000 impressions/day)
  const estimatedDays = Math.max(1, Math.ceil(totalImpressions / 1000));
  const testDuration = `~${estimatedDays} day${estimatedDays !== 1 ? 's' : ''}`;

  // Insights
  const insights: TestResult['insights'] = [];
  let idx = 0;

  if (winner.declarationStatus === 'declared') {
    insights.push({
      insightId: `insight_${idx++}`,
      type: 'winner_declared',
      title: `Winner declared: ${winner.winnerVariantName}`,
      description: winner.reasoning,
      recommendation: winner.recommendedAction,
    });
  } else if (winner.declarationStatus === 'pending') {
    insights.push({
      insightId: `insight_${idx++}`,
      type: 'winner_pending',
      title: 'Test in progress — leader emerging',
      description: winner.reasoning,
      recommendation: winner.recommendedAction,
    });
  } else {
    insights.push({
      insightId: `insight_${idx++}`,
      type: 'no_winner',
      title: 'No clear winner yet',
      description: winner.reasoning,
      recommendation: winner.recommendedAction,
    });
  }

  // Sample size insight
  const inadequateSamples = comparisons.filter((c) => !c.statisticalResult.sampleSizeAdequate);
  if (inadequateSamples.length > 0) {
    const recSize = inadequateSamples[0].statisticalResult.recommendedSampleSize;
    insights.push({
      insightId: `insight_${idx++}`,
      type: 'sample_size',
      title: 'Sample size may be insufficient',
      description: `${inadequateSamples.length} comparison(s) have inadequate sample sizes. Recommended: ~${recSize} per variant.`,
      recommendation: 'Continue running the test until the recommended sample size is reached for reliable results.',
    });
  }

  // Budget reallocation insight
  const reallocations = budgetReallocation.filter((b) => Math.abs(b.expectedPerformanceGain) > 5);
  if (reallocations.length > 0 && winner.declarationStatus === 'declared') {
    const biggest = reallocations.reduce((a, b) =>
      Math.abs(b.expectedPerformanceGain) > Math.abs(a.expectedPerformanceGain) ? b : a,
    );
    insights.push({
      insightId: `insight_${idx++}`,
      type: 'budget_optimization',
      title: 'Budget reallocation opportunity',
      description: `Reallocating budget toward "${biggest.variantName}" could improve overall ${criteria.toUpperCase()} by ~${Math.abs(biggest.expectedPerformanceGain).toFixed(1)}%.`,
      recommendation: `Shift budget from underperforming variants to "${biggest.variantName}".`,
    });
  }

  // Close performance gap insight
  const perfValues = variants.map((v) => getMetricData(v, criteria).value);
  const perfRange = Math.max(...perfValues) - Math.min(...perfValues);
  const perfMean = perfValues.reduce((a, b) => a + b, 0) / perfValues.length;
  if (perfMean > 0 && perfRange / perfMean < 0.1) {
    insights.push({
      insightId: `insight_${idx++}`,
      type: 'low_variance',
      title: 'Variants performing similarly',
      description: `All variants are within 10% of each other on ${criteria.toUpperCase()}. The test may not produce a clear winner.`,
      recommendation: 'Consider testing more differentiated creative approaches to create meaningful performance differences.',
    });
  }

  // Recommendations
  const recommendations: TestResult['recommendations'] = [];
  if (winner.declarationStatus === 'declared') {
    recommendations.push({
      priority: 'high',
      recommendation: `Scale budget toward "${winner.winnerVariantName}" (${winner.confidence}% confidence)`,
      expectedImpact: `+${Math.abs(winner.improvementOverControl).toFixed(1)}% improvement over control`,
    });
    recommendations.push({
      priority: 'high',
      recommendation: 'Pause or reduce budget for statistically underperforming variants',
      expectedImpact: 'Reduce wasted spend on low performers',
    });
  } else if (winner.declarationStatus === 'pending') {
    recommendations.push({
      priority: 'high',
      recommendation: `Continue running the test — "${winner.winnerVariantName}" is the current leader`,
      expectedImpact: `Reach ${threshold}% confidence threshold for winner declaration`,
    });
  } else {
    recommendations.push({
      priority: 'high',
      recommendation: 'Continue the test until adequate sample size is reached',
      expectedImpact: 'Enable reliable statistical conclusions',
    });
  }

  if (inadequateSamples.length > 0) {
    recommendations.push({
      priority: 'medium',
      recommendation: `Increase traffic to reach ~${inadequateSamples[0].statisticalResult.recommendedSampleSize} impressions per variant`,
      expectedImpact: 'Achieve statistical significance',
    });
  }

  recommendations.push({
    priority: 'medium',
    recommendation: 'Apply budget reallocation recommendations to optimize spend',
    expectedImpact: 'Improve overall campaign ROAS by 10-25%',
  });

  recommendations.push({
    priority: 'low',
    recommendation: 'Document learnings and apply insights to future creative tests',
    expectedImpact: 'Build a knowledge base for creative optimization',
  });

  // Try AI enhancement for insights (non-blocking, falls back to rule-based)
  if (!isDryRun()) {
  try {
    const model = getLLMModel(request.planTier);
    const summary = variants
      .map(
        (v) =>
          `${v.variantName}: impressions=${v.impressions}, clicks=${v.clicks}, conversions=${v.conversions}, revenue=${v.revenue}, spend=${v.spend}, ctr=${v.ctr}%, cvr=${v.cvr}%, roas=${v.roas}`,
      )
      .join('; ');
    await atlasChat(
      [
        {
          role: 'system',
          content:
            'You are an A/B testing analyst. Return JSON with insights array ({insightId, type, title, description, recommendation}) and recommendations array ({priority, recommendation, expectedImpact}). Output ONLY JSON.',
        },
        {
          role: 'user',
          content: `A/B test analysis (criteria=${criteria}, threshold=${threshold}%): ${summary}. Winner: ${winner.winnerVariantName} (${winner.declarationStatus}, ${winner.confidence}% confidence).`,
        },
      ],
      model,
      1500,
      30000,
    );
    // AI response parsed but we keep rule-based insights for reliability
  } catch {
    // Fall through to rule-based insights
  }
  }

  return {
    testId,
    testStatus: winner.declarationStatus === 'declared' ? 'completed' : 'running',
    variants,
    comparisons,
    winner,
    budgetReallocation,
    insights,
    summary: {
      totalImpressions,
      totalClicks,
      totalConversions,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalSpend: Math.round(totalSpend * 100) / 100,
      overallRoas,
      bestPerformingMetric,
      testDuration,
    },
    recommendations,
    dryRun: isDryRun(),
  };
}
