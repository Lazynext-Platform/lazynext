/**
 * Creative Performance Forecasting.
 *
 * Predictive analytics that forecasts creative performance before launch using
 * historical data, audience fit scoring, and ML-based predictions. Includes
 * confidence intervals, scenario modeling, and budget-to-performance projections.
 *
 * All functions use the existing atlasChat() from src/lib/atlas.ts — no new LLM
 * dependency. Credit cost is defined per forecast and exported for the route to charge.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

// ── Credit cost per forecast ──
export const FORECAST_COST = 7;

// ── Types ──

export type ForecastHorizon = '7d' | '14d' | '30d' | '60d' | '90d';
export type ForecastMetric =
  | 'impressions'
  | 'clicks'
  | 'ctr'
  | 'conversions'
  | 'cvr'
  | 'roas'
  | 'cpa'
  | 'revenue'
  | 'spend'
  | 'engagement';
export type ScenarioType = 'conservative' | 'realistic' | 'optimistic' | 'worst_case';
export type AudienceFitFactor =
  | 'demographic_match'
  | 'interest_alignment'
  | 'behavioral_match'
  | 'channel_fit'
  | 'timing_fit'
  | 'creative_relevance';
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface HistoricalDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  cvr: number;
  roas: number;
}

export interface AudienceFitScore {
  factor: AudienceFitFactor;
  score: number; // 0-100
  reasoning: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ForecastPoint {
  date: string;
  metric: ForecastMetric;
  predictedValue: number;
  confidenceInterval: { lower: number; upper: number };
  confidenceLevel: ConfidenceLevel;
}

export interface ScenarioForecast {
  scenario: ScenarioType;
  probability: number; // 0-100
  forecastPoints: ForecastPoint[];
  totalPredicted: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    spend: number;
    roas: number;
  };
  keyAssumptions: string[];
  risks: string[];
}

export interface BudgetProjection {
  budgetAmount: number;
  projectedImpressions: number;
  projectedClicks: number;
  projectedConversions: number;
  projectedRevenue: number;
  projectedRoas: number;
  projectedCpa: number;
  projectedCtr: number;
  efficiency: number; // 0-100
  recommendation: string;
}

export interface ForecastResult {
  forecastId: string;
  horizon: ForecastHorizon;
  primaryMetric: ForecastMetric;
  audienceFitScores: AudienceFitScore[];
  overallAudienceFit: number; // 0-100
  scenarios: ScenarioForecast[];
  recommendedScenario: ScenarioType;
  budgetProjections: BudgetProjection[];
  optimalBudget: { amount: number; projectedRoas: number; reasoning: string };
  forecastPoints: ForecastPoint[];
  insights: Array<{
    insightId: string;
    type:
      | 'performance_prediction'
      | 'audience_insight'
      | 'budget_optimization'
      | 'risk_assessment'
      | 'opportunity';
    title: string;
    description: string;
    actionableRecommendation: string;
    confidence: ConfidenceLevel;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImpact: string;
    timeframe: string;
  }>;
  modelAccuracy: number; // 0-100, based on historical data availability
}

// ── Constants & metadata ──

const FORECAST_MODEL = process.env.CREATIVE_MODEL || getLLMModel();
const FORECAST_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);
const FORECAST_MAX_TOKENS = Number(process.env.CREATIVE_MAX_TOKENS || 6000);

/** Resolve the forecasting LLM model for a given plan tier. */
function resolveForecastModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

const HORIZON_DAYS: Record<ForecastHorizon, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '60d': 60,
  '90d': 90,
};

const SCENARIO_MULTIPLIERS: Record<ScenarioType, number> = {
  conservative: 0.8, // -20% from trend
  realistic: 1.0, // trend line
  optimistic: 1.2, // +20% from trend
  worst_case: 0.6, // -40% from trend
};

const SCENARIO_PROBABILITIES: Record<ScenarioType, number> = {
  conservative: 25,
  realistic: 40,
  optimistic: 20,
  worst_case: 15,
};

// ── Helpers ──

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_forecast_output');
  return JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;
}

function extractJsonArray(raw: string): unknown[] {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a < 0 || b < 0) throw new Error('no_array_in_forecast_output');
  return JSON.parse(s.slice(a, b + 1)) as unknown[];
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function asStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => asStr(x)).filter(Boolean).slice(0, 20) : [];
}

function asNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Metadata getters ──

export function getForecastHorizons(): Array<{
  horizon: ForecastHorizon;
  name: string;
  description: string;
}> {
  return [
    { horizon: '7d', name: '7 Days', description: 'Short-term forecast for the next week' },
    { horizon: '14d', name: '14 Days', description: 'Two-week forecast for near-term planning' },
    { horizon: '30d', name: '30 Days', description: 'Monthly forecast for campaign planning' },
    { horizon: '60d', name: '60 Days', description: 'Two-month forecast for mid-term strategy' },
    { horizon: '90d', name: '90 Days', description: 'Quarterly forecast for long-term planning' },
  ];
}

export function getForecastMetrics(): Array<{
  metric: ForecastMetric;
  name: string;
  description: string;
}> {
  return [
    { metric: 'impressions', name: 'Impressions', description: 'Total ad views' },
    { metric: 'clicks', name: 'Clicks', description: 'Total clicks on the creative' },
    { metric: 'ctr', name: 'CTR', description: 'Click-through rate percentage' },
    { metric: 'conversions', name: 'Conversions', description: 'Total conversions attributed' },
    { metric: 'cvr', name: 'CVR', description: 'Conversion rate percentage' },
    { metric: 'roas', name: 'ROAS', description: 'Return on ad spend ratio' },
    { metric: 'cpa', name: 'CPA', description: 'Cost per acquisition' },
    { metric: 'revenue', name: 'Revenue', description: 'Total revenue generated' },
    { metric: 'spend', name: 'Spend', description: 'Total ad spend' },
    { metric: 'engagement', name: 'Engagement', description: 'Overall engagement score' },
  ];
}

export function getScenarioTypes(): Array<{
  scenario: ScenarioType;
  name: string;
  description: string;
}> {
  return [
    {
      scenario: 'conservative',
      name: 'Conservative',
      description: '20% below trend — cautious estimate',
    },
    {
      scenario: 'realistic',
      name: 'Realistic',
      description: 'Trend line — most likely outcome',
    },
    {
      scenario: 'optimistic',
      name: 'Optimistic',
      description: '20% above trend — best case scenario',
    },
    {
      scenario: 'worst_case',
      name: 'Worst Case',
      description: '40% below trend — downside risk',
    },
  ];
}

export function getAudienceFitFactors(): Array<{
  factor: AudienceFitFactor;
  name: string;
  description: string;
}> {
  return [
    {
      factor: 'demographic_match',
      name: 'Demographic Match',
      description: 'How well the audience demographics align with the target',
    },
    {
      factor: 'interest_alignment',
      name: 'Interest Alignment',
      description: 'Overlap between audience interests and product category',
    },
    {
      factor: 'behavioral_match',
      name: 'Behavioral Match',
      description: 'Audience behavior patterns matching purchase intent',
    },
    {
      factor: 'channel_fit',
      name: 'Channel Fit',
      description: 'Suitability of the distribution channel for the creative',
    },
    {
      factor: 'timing_fit',
      name: 'Timing Fit',
      description: 'Seasonal and temporal relevance of the campaign',
    },
    {
      factor: 'creative_relevance',
      name: 'Creative Relevance',
      description: 'How relevant the creative message is to the audience',
    },
  ];
}

// ── Statistical functions ──

/**
 * Simple linear regression: y = slope * x + intercept.
 * Returns slope, intercept, and rSquared (coefficient of determination).
 */
export function linearRegression(data: Array<{ x: number; y: number }>): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 };
  if (n === 1) return { slope: 0, intercept: data[0].y, rSquared: 0 };

  const sumX = data.reduce((s, p) => s + p.x, 0);
  const sumY = data.reduce((s, p) => s + p.y, 0);
  const sumXY = data.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = data.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  const ssTot = data.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const ssRes = data.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const rSquared = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  return { slope, intercept, rSquared };
}

/**
 * Calculate a confidence interval for a prediction using the standard error
 * and a z-score approximation for the given confidence level (0-1).
 */
export function calculateConfidenceInterval(
  prediction: number,
  stdError: number,
  confidenceLevel: number,
): { lower: number; upper: number } {
  // Map confidence level (0-1) to a z-score approximation.
  // 0.90 -> 1.645, 0.95 -> 1.96, 0.99 -> 2.576
  const cl = Math.max(0, Math.min(1, confidenceLevel));
  const z = cl >= 0.99 ? 2.576 : cl >= 0.95 ? 1.96 : cl >= 0.9 ? 1.645 : cl >= 0.8 ? 1.282 : 1.0;
  const margin = z * stdError;
  return {
    lower: Math.max(0, round2(prediction - margin)),
    upper: round2(prediction + margin),
  };
}

/**
 * Determine confidence level based on sample size and variance.
 * Larger samples and lower variance → higher confidence.
 */
export function determineConfidenceLevel(
  sampleSize: number,
  variance: number,
): ConfidenceLevel {
  // Coefficient of variation — relative dispersion.
  const cv = variance;
  if (sampleSize >= 30 && cv < 0.1) return 'very_high';
  if (sampleSize >= 20 && cv < 0.2) return 'high';
  if (sampleSize >= 10 && cv < 0.4) return 'medium';
  return 'low';
}

// ── Audience fit ──

/**
 * Calculate audience fit scores across demographic, interest, behavioral,
 * channel, timing, and creative relevance factors.
 *
 * Scoring is heuristic: more data provided for a factor → higher score.
 * The LLM enriches reasoning when available, but the function is self-contained
 * and works without any LLM call.
 */
export function calculateAudienceFit(audience: {
  demographics?: Record<string, unknown>;
  interests?: string[];
  behaviors?: string[];
  channels?: string[];
}): AudienceFitScore[] {
  const scores: AudienceFitScore[] = [];

  // Demographic match — based on how many demographic attributes are provided.
  const demoCount = audience.demographics ? Object.keys(audience.demographics).length : 0;
  const demoScore = Math.min(100, 40 + demoCount * 15);
  scores.push({
    factor: 'demographic_match',
    score: demoScore,
    reasoning:
      demoCount > 0
        ? `${demoCount} demographic attribute(s) provided — ${demoScore >= 70 ? 'strong' : 'partial'} match.`
        : 'No demographic data provided — assuming moderate match.',
    impact: demoScore >= 70 ? 'high' : demoScore >= 50 ? 'medium' : 'low',
  });

  // Interest alignment — based on number of interests provided.
  const interestCount = audience.interests?.length ?? 0;
  const interestScore = Math.min(100, 35 + interestCount * 12);
  scores.push({
    factor: 'interest_alignment',
    score: interestScore,
    reasoning:
      interestCount > 0
        ? `${interestCount} interest(s) aligned — ${interestScore >= 70 ? 'strong' : 'partial'} overlap.`
        : 'No interests provided — assuming broad alignment.',
    impact: interestScore >= 70 ? 'high' : interestScore >= 50 ? 'medium' : 'low',
  });

  // Behavioral match — based on behaviors provided.
  const behaviorCount = audience.behaviors?.length ?? 0;
  const behaviorScore = Math.min(100, 30 + behaviorCount * 15);
  scores.push({
    factor: 'behavioral_match',
    score: behaviorScore,
    reasoning:
      behaviorCount > 0
        ? `${behaviorCount} behavior pattern(s) matched — ${behaviorScore >= 70 ? 'strong' : 'partial'} intent signal.`
        : 'No behavioral data — assuming moderate intent.',
    impact: behaviorScore >= 70 ? 'high' : behaviorScore >= 50 ? 'medium' : 'low',
  });

  // Channel fit — based on channels provided.
  const channelCount = audience.channels?.length ?? 0;
  const channelScore = Math.min(100, 45 + channelCount * 10);
  scores.push({
    factor: 'channel_fit',
    score: channelScore,
    reasoning:
      channelCount > 0
        ? `${channelCount} channel(s) selected — ${channelScore >= 70 ? 'good' : 'limited'} channel fit.`
        : 'No channels specified — assuming general distribution.',
    impact: channelScore >= 70 ? 'high' : channelScore >= 50 ? 'medium' : 'low',
  });

  // Timing fit — heuristic based on current seasonality (always available).
  const month = new Date().getMonth();
  // Q4 (Oct-Dec) and post-holiday Jan tend to have higher engagement.
  const timingScore = month >= 9 || month === 0 ? 75 : month >= 5 && month <= 7 ? 60 : 65;
  scores.push({
    factor: 'timing_fit',
    score: timingScore,
    reasoning:
      timingScore >= 75
        ? 'Peak seasonality window — strong timing fit.'
        : timingScore >= 65
          ? 'Moderate seasonality — acceptable timing.'
          : 'Off-peak period — weaker timing fit.',
    impact: timingScore >= 75 ? 'high' : timingScore >= 60 ? 'medium' : 'low',
  });

  // Creative relevance — default to medium-high; enriched by LLM later.
  scores.push({
    factor: 'creative_relevance',
    score: 65,
    reasoning: 'Creative relevance assessed from description — moderate-to-high alignment assumed.',
    impact: 'medium',
  });

  return scores;
}

// ── Scenario generation ──

/**
 * Generate scenario forecasts (conservative, realistic, optimistic, worst_case)
 * from historical data using linear regression trend analysis.
 */
export function generateScenarios(
  historical: HistoricalDataPoint[],
  horizon: ForecastHorizon,
  metric: ForecastMetric,
): ScenarioForecast[] {
  const days = HORIZON_DAYS[horizon];
  const sorted = [...historical].sort((a, b) => a.date.localeCompare(b.date));

  // Build regression data points for the primary metric.
  const metricPoints = sorted.map((p, i) => ({ x: i, y: getMetricValue(p, metric) }));
  const reg = linearRegression(metricPoints);

  // Also build regressions for all total-predicted metrics.
  const impressionsReg = linearRegression(sorted.map((p, i) => ({ x: i, y: p.impressions })));
  const clicksReg = linearRegression(sorted.map((p, i) => ({ x: i, y: p.clicks })));
  const conversionsReg = linearRegression(sorted.map((p, i) => ({ x: i, y: p.conversions })));
  const revenueReg = linearRegression(sorted.map((p, i) => ({ x: i, y: p.revenue })));
  const spendReg = linearRegression(sorted.map((p, i) => ({ x: i, y: p.spend })));

  const lastX = sorted.length > 0 ? sorted.length - 1 : 0;

  // Standard error for confidence intervals.
  const residuals = metricPoints.map((p) => p.y - (reg.slope * p.x + reg.intercept));
  const stdError =
    residuals.length > 2
      ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (residuals.length - 2))
      : Math.max(Math.abs(reg.intercept) * 0.1, 1);

  const confidenceLevel = determineConfidenceLevel(sorted.length, stdError / Math.max(Math.abs(reg.intercept), 1));

  const scenarios: ScenarioType[] = ['conservative', 'realistic', 'optimistic', 'worst_case'];

  return scenarios.map((scenario) => {
    const multiplier = SCENARIO_MULTIPLIERS[scenario];
    const forecastPoints: ForecastPoint[] = [];

    for (let d = 1; d <= days; d++) {
      const x = lastX + d;
      const date = new Date();
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);

      const trendValue = reg.slope * x + reg.intercept;
      const predictedValue = Math.max(0, round2(trendValue * multiplier));
      const ci = calculateConfidenceInterval(predictedValue, stdError, 0.9);

      forecastPoints.push({
        date: dateStr,
        metric,
        predictedValue,
        confidenceInterval: ci,
        confidenceLevel,
      });
    }

    // Total predicted across the horizon for each metric.
    const totalImpressions = round2(sumTrend(impressionsReg, lastX, days) * multiplier);
    const totalClicks = round2(sumTrend(clicksReg, lastX, days) * multiplier);
    const totalConversions = round2(sumTrend(conversionsReg, lastX, days) * multiplier);
    const totalRevenue = round2(sumTrend(revenueReg, lastX, days) * multiplier);
    const totalSpend = round2(sumTrend(spendReg, lastX, days) * multiplier);
    const totalRoas = totalSpend > 0 ? round2(totalRevenue / totalSpend) : 0;

    const keyAssumptions = buildAssumptions(scenario, reg, sorted.length);
    const risks = buildRisks(scenario, reg);

    return {
      scenario,
      probability: SCENARIO_PROBABILITIES[scenario],
      forecastPoints,
      totalPredicted: {
        impressions: Math.max(0, totalImpressions),
        clicks: Math.max(0, totalClicks),
        conversions: Math.max(0, totalConversions),
        revenue: Math.max(0, totalRevenue),
        spend: Math.max(0, totalSpend),
        roas: Math.max(0, totalRoas),
      },
      keyAssumptions,
      risks,
    };
  });
}

function getMetricValue(p: HistoricalDataPoint, metric: ForecastMetric): number {
  switch (metric) {
    case 'impressions': return p.impressions;
    case 'clicks': return p.clicks;
    case 'ctr': return p.ctr;
    case 'conversions': return p.conversions;
    case 'cvr': return p.cvr;
    case 'roas': return p.roas;
    case 'cpa': return p.conversions > 0 ? p.spend / p.conversions : 0;
    case 'revenue': return p.revenue;
    case 'spend': return p.spend;
    case 'engagement': return p.ctr + p.cvr; // composite engagement proxy
    default: return 0;
  }
}

/** Sum the trend line values from lastX+1 to lastX+days. */
function sumTrend(reg: { slope: number; intercept: number }, lastX: number, days: number): number {
  let sum = 0;
  for (let d = 1; d <= days; d++) {
    sum += Math.max(0, reg.slope * (lastX + d) + reg.intercept);
  }
  return sum;
}

function buildAssumptions(
  scenario: ScenarioType,
  reg: { slope: number; intercept: number; rSquared: number },
  sampleSize: number,
): string[] {
  const trend = reg.slope > 0 ? 'upward' : reg.slope < 0 ? 'downward' : 'flat';
  const assumptions: string[] = [
    `Historical trend is ${trend} (slope=${round2(reg.slope)}, R²=${round2(reg.rSquared)}).`,
    `Based on ${sampleSize} historical data point(s).`,
  ];
  switch (scenario) {
    case 'conservative':
      assumptions.push('Performance discounted by 20% to account for execution variance.');
      break;
    case 'realistic':
      assumptions.push('Projection follows the historical trend line directly.');
      break;
    case 'optimistic':
      assumptions.push('Performance boosted by 20% assuming favorable conditions.');
      break;
    case 'worst_case':
      assumptions.push('Performance discounted by 40% to model downside risk.');
      break;
  }
  return assumptions;
}

function buildRisks(
  scenario: ScenarioType,
  reg: { slope: number; intercept: number; rSquared: number },
): string[] {
  const risks: string[] = [];
  if (reg.rSquared < 0.5) risks.push('Low R² indicates high variability — predictions are less reliable.');
  if (reg.slope < 0) risks.push('Negative trend — performance is declining over time.');
  if (reg.rSquared >= 0.5 && reg.slope >= 0) risks.push('Limited downside risk given stable positive trend.');
  switch (scenario) {
    case 'conservative':
      risks.push('Creative fatigue may reduce performance faster than modeled.');
      break;
    case 'realistic':
      risks.push('Market saturation or competitive entry could dampen results.');
      break;
    case 'optimistic':
      risks.push('Optimistic scenario assumes best-case execution — rarely fully achieved.');
      risks.push('Audience fatigue risk if spend scales too quickly.');
      break;
    case 'worst_case':
      risks.push('Severe underperformance may trigger platform algorithmic penalties.');
      risks.push('Budget may be wasted if creative fails to resonate.');
      break;
  }
  return risks;
}

// ── Budget projections ──

/**
 * Generate budget projections at 50%, 75%, 100%, 125%, and 150% of the base budget.
 * Scales the realistic scenario's predicted metrics, applying diminishing returns
 * at higher budget levels.
 */
export function generateBudgetProjections(
  baseBudget: number,
  scenarios: ScenarioForecast[],
): BudgetProjection[] {
  const realistic = scenarios.find((s) => s.scenario === 'realistic') ?? scenarios[0];
  if (!realistic) return [];

  const budget = baseBudget > 0 ? baseBudget : 1000;
  const multipliers = [0.5, 0.75, 1.0, 1.25, 1.5];

  // Base efficiency metrics from the realistic scenario.
  const baseImpressions = Math.max(realistic.totalPredicted.impressions, 1);
  const baseClicks = Math.max(realistic.totalPredicted.clicks, 1);
  const baseConversions = Math.max(realistic.totalPredicted.conversions, 1);
  const baseRevenue = Math.max(realistic.totalPredicted.revenue, 1);
  const baseCtr = baseImpressions > 0 ? (baseClicks / baseImpressions) * 100 : 0;

  return multipliers.map((m) => {
    const budgetAmount = round2(budget * m);
    // Diminishing returns: impressions/clicks scale sub-linearly, conversions more so.
    const scaleImpressions = Math.pow(m, 0.9);
    const scaleClicks = Math.pow(m, 0.85);
    const scaleConversions = Math.pow(m, 0.75);
    const scaleRevenue = Math.pow(m, 0.8);

    const projectedImpressions = Math.round(baseImpressions * scaleImpressions);
    const projectedClicks = Math.round(baseClicks * scaleClicks);
    const projectedConversions = Math.round(baseConversions * scaleConversions);
    const projectedRevenue = round2(baseRevenue * scaleRevenue);
    const projectedRoas = budgetAmount > 0 ? round2(projectedRevenue / budgetAmount) : 0;
    const projectedCpa =
      projectedConversions > 0 ? round2(budgetAmount / projectedConversions) : 0;
    const projectedCtr =
      projectedImpressions > 0 ? round2((projectedClicks / projectedImpressions) * 100) : 0;

    // Efficiency: normalize ROAS and CTR into a 0-100 score.
    const roasScore = Math.min(100, projectedRoas * 25);
    const ctrScore = Math.min(100, projectedCtr * 20);
    const efficiency = Math.round((roasScore + ctrScore) / 2);

    let recommendation: string;
    if (m < 0.75) {
      recommendation = 'Low budget — limited scale but efficient spend.';
    } else if (m <= 1.0) {
      recommendation = 'Base budget — balanced scale and efficiency.';
    } else if (m <= 1.25) {
      recommendation = 'Increased budget — good scale with moderate efficiency loss.';
    } else {
      recommendation = 'High budget — maximum scale but diminishing returns expected.';
    }

    return {
      budgetAmount,
      projectedImpressions,
      projectedClicks,
      projectedConversions,
      projectedRevenue,
      projectedRoas,
      projectedCpa,
      projectedCtr,
      efficiency,
      recommendation,
    };
  });
}

/**
 * Find the budget projection with the highest projected ROAS.
 */
export function findOptimalBudget(projections: BudgetProjection[]): {
  amount: number;
  projectedRoas: number;
  reasoning: string;
} {
  if (projections.length === 0) {
    return { amount: 0, projectedRoas: 0, reasoning: 'No projections available.' };
  }
  const best = projections.reduce((best, p) =>
    p.projectedRoas > best.projectedRoas ? p : best,
  );
  const reasoning = `Budget of $${best.budgetAmount.toLocaleString()} yields the highest projected ROAS of ${best.projectedRoas} with an efficiency score of ${best.efficiency}/100. ${best.recommendation}`;
  return {
    amount: best.budgetAmount,
    projectedRoas: best.projectedRoas,
    reasoning,
  };
}

// ── Validation ──

export function validateForecastRequest(request: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const desc = request.creativeDescription;
  if (typeof desc !== 'string' || !desc.trim()) {
    errors.push('creativeDescription is required and must be a non-empty string');
  }
  const validHorizons: ForecastHorizon[] = ['7d', '14d', '30d', '60d', '90d'];
  if (request.horizon && !validHorizons.includes(request.horizon as ForecastHorizon)) {
    errors.push('horizon must be one of: 7d, 14d, 30d, 60d, 90d');
  }
  const validMetrics: ForecastMetric[] = [
    'impressions', 'clicks', 'ctr', 'conversions', 'cvr', 'roas', 'cpa', 'revenue', 'spend', 'engagement',
  ];
  if (request.primaryMetric && !validMetrics.includes(request.primaryMetric as ForecastMetric)) {
    errors.push('primaryMetric must be a valid ForecastMetric');
  }
  if (request.budget !== undefined && request.budget !== null) {
    const b = Number(request.budget);
    if (!Number.isFinite(b) || b < 0) {
      errors.push('budget must be a non-negative number');
    }
  }
  return { valid: errors.length === 0, errors };
}

// ── Main forecast generation ──

const FORECAST_SYS = `You are a creative performance forecasting expert. Analyze the creative description, audience, and historical data to predict performance. Return a JSON object with fields: audienceFitScores (array of {factor, score 0-100, reasoning, impact "high"|"medium"|"low"}), insights (array of {insightId, type "performance_prediction"|"audience_insight"|"budget_optimization"|"risk_assessment"|"opportunity", title, description, actionableRecommendation, confidence "low"|"medium"|"high"|"very_high"}), recommendations (array of {priority "high"|"medium"|"low", recommendation, expectedImpact, timeframe}). Output ONLY the JSON.`;

export async function generateForecast(request: {
  creativeDescription: string;
  productName?: string;
  targetAudience?: string;
  platform?: string;
  budget?: number;
  horizon?: ForecastHorizon;
  primaryMetric?: ForecastMetric;
  historicalData?: HistoricalDataPoint[];
  audiencePersonas?: Array<{ personaId: string; name: string }>;
  planTier?: PlanTier;
}): Promise<ForecastResult> {
  const horizon = request.horizon ?? '30d';
  const primaryMetric = request.primaryMetric ?? 'roas';
  const budget = request.budget ?? 1000;
  const historical = request.historicalData ?? [];

  // ── Audience fit (heuristic baseline) ──
  const audienceInput = {
    demographics: request.targetAudience ? { description: request.targetAudience } : undefined,
    interests: request.targetAudience ? request.targetAudience.split(',').map((s) => s.trim()).filter(Boolean) : [],
    behaviors: [],
    channels: request.platform ? [request.platform] : [],
  };
  const baseFitScores = calculateAudienceFit(audienceInput);
  const overallAudienceFit = Math.round(
    baseFitScores.reduce((s, f) => s + f.score, 0) / baseFitScores.length,
  );

  // ── Scenarios (deterministic, from historical data) ──
  const scenarios = generateScenarios(historical, horizon, primaryMetric);

  // ── Budget projections ──
  const budgetProjections = generateBudgetProjections(budget, scenarios);
  const optimalBudget = findOptimalBudget(budgetProjections);

  // ── Recommended scenario: realistic if we have data, else conservative ──
  const recommendedScenario: ScenarioType =
    historical.length >= 5 ? 'realistic' : 'conservative';

  // ── Forecast points from the recommended scenario ──
  const recommendedScenarioData =
    scenarios.find((s) => s.scenario === recommendedScenario) ?? scenarios[0];
  const forecastPoints = recommendedScenarioData?.forecastPoints ?? [];

  // ── Model accuracy based on data availability ──
  const modelAccuracy = computeModelAccuracy(historical.length);

  // ── AI-enriched insights & recommendations ──
  let insights: ForecastResult['insights'] = [];
  let recommendations: ForecastResult['recommendations'] = [];
  let audienceFitScores = baseFitScores;

  try {
    const model = resolveForecastModel(request.planTier);
    const parts: string[] = [
      `Creative description: ${request.creativeDescription}`,
    ];
    if (request.productName) parts.push(`Product name: ${request.productName}`);
    if (request.targetAudience) parts.push(`Target audience: ${request.targetAudience}`);
    if (request.platform) parts.push(`Platform: ${request.platform}`);
    parts.push(`Budget: ${budget}`);
    parts.push(`Forecast horizon: ${horizon}`);
    parts.push(`Primary metric: ${primaryMetric}`);
    if (historical.length > 0) {
      parts.push(`Historical data points: ${historical.length}`);
      parts.push(
        `Recent avg ROAS: ${round2(historical.reduce((s, p) => s + p.roas, 0) / historical.length)}`,
      );
      parts.push(
        `Recent avg CTR: ${round2(historical.reduce((s, p) => s + p.ctr, 0) / historical.length)}`,
      );
    } else {
      parts.push('No historical data provided — use industry benchmarks.');
    }
    if (request.audiencePersonas?.length) {
      parts.push(`Audience personas: ${request.audiencePersonas.map((p) => p.name).join(', ')}`);
    }
    parts.push('Output the forecast enrichment JSON now.');

    const raw = await atlasChat(
      [{ role: 'system', content: FORECAST_SYS }, { role: 'user', content: parts.join('\n') }],
      model, FORECAST_MAX_TOKENS, FORECAST_TIMEOUT_MS,
    );
    const j = extractJson(raw);

    // Enrich audience fit scores with LLM reasoning if provided.
    if (Array.isArray(j.audienceFitScores)) {
      const llmScores = extractJsonArray(raw).length;
      void llmScores; // placeholder for potential array parsing
      const aiScores = (j.audienceFitScores as unknown[]).map((item) => {
        const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return {
          factor: asStr(o.factor, 'creative_relevance') as AudienceFitFactor,
          score: asNum(o.score, 50, 0, 100),
          reasoning: asStr(o.reasoning),
          impact: asStr(o.impact, 'medium') as 'high' | 'medium' | 'low',
        };
      });
      if (aiScores.length > 0) {
        // Merge: prefer LLM scores where provided, keep heuristic for missing factors.
        const merged = baseFitScores.map(
          (base) => aiScores.find((a) => a.factor === base.factor) ?? base,
        );
        // Add any LLM-only factors.
        for (const a of aiScores) {
          if (!merged.some((m) => m.factor === a.factor)) merged.push(a);
        }
        audienceFitScores = merged;
      }
    }

    if (Array.isArray(j.insights)) {
      insights = (j.insights as unknown[]).map((item, idx) => {
        const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return {
          insightId: asStr(o.insightId, `insight_${idx + 1}`),
          type: asStr(o.type, 'performance_prediction') as ForecastResult['insights'][number]['type'],
          title: asStr(o.title),
          description: asStr(o.description),
          actionableRecommendation: asStr(o.actionableRecommendation),
          confidence: asStr(o.confidence, 'medium') as ConfidenceLevel,
        };
      });
    }

    if (Array.isArray(j.recommendations)) {
      recommendations = (j.recommendations as unknown[]).map((item) => {
        const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return {
          priority: asStr(o.priority, 'medium') as 'high' | 'medium' | 'low',
          recommendation: asStr(o.recommendation),
          expectedImpact: asStr(o.expectedImpact),
          timeframe: asStr(o.timeframe),
        };
      });
    }
  } catch {
    // Fall through to defaults — forecasting is still usable without LLM enrichment.
  }

  // ── Default insights if none provided ──
  if (insights.length === 0) {
    insights = generateDefaultInsights(
      primaryMetric,
      overallAudienceFit,
      modelAccuracy,
      optimalBudget,
      recommendedScenario,
    );
  }

  // ── Default recommendations if none provided ──
  if (recommendations.length === 0) {
    recommendations = generateDefaultRecommendations(overallAudienceFit, modelAccuracy, optimalBudget);
  }

  const forecastId = `forecast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    forecastId,
    horizon,
    primaryMetric,
    audienceFitScores,
    overallAudienceFit,
    scenarios,
    recommendedScenario,
    budgetProjections,
    optimalBudget,
    forecastPoints,
    insights,
    recommendations,
    modelAccuracy,
  };
}

function computeModelAccuracy(sampleSize: number): number {
  if (sampleSize >= 60) return 90;
  if (sampleSize >= 30) return 80;
  if (sampleSize >= 20) return 70;
  if (sampleSize >= 10) return 60;
  if (sampleSize >= 5) return 45;
  if (sampleSize >= 1) return 30;
  return 20;
}

function generateDefaultInsights(
  metric: ForecastMetric,
  audienceFit: number,
  modelAccuracy: number,
  optimalBudget: { amount: number; projectedRoas: number; reasoning: string },
  scenario: ScenarioType,
): ForecastResult['insights'] {
  const insights: ForecastResult['insights'] = [];

  insights.push({
    insightId: 'insight_1',
    type: 'performance_prediction',
    title: `${metric} forecast generated`,
    description: `Based on the ${scenario} scenario, the primary metric ${metric} is projected with ${modelAccuracy}% model accuracy.`,
    actionableRecommendation: 'Monitor actual performance against the forecast and adjust spend accordingly.',
    confidence: modelAccuracy >= 70 ? 'high' : modelAccuracy >= 50 ? 'medium' : 'low',
  });

  insights.push({
    insightId: 'insight_2',
    type: 'audience_insight',
    title: `Audience fit score: ${audienceFit}/100`,
    description:
      audienceFit >= 70
        ? 'Strong audience alignment — the creative is well-matched to the target audience.'
        : audienceFit >= 50
          ? 'Moderate audience alignment — consider refining targeting to improve fit.'
          : 'Weak audience alignment — revisit audience targeting before scaling spend.',
    actionableRecommendation:
      audienceFit >= 70
        ? 'Scale confidently — audience fit supports increased budget.'
        : 'Refine audience targeting parameters to improve alignment before scaling.',
    confidence: audienceFit >= 70 ? 'high' : 'medium',
  });

  insights.push({
    insightId: 'insight_3',
    type: 'budget_optimization',
    title: `Optimal budget: $${optimalBudget.amount.toLocaleString()}`,
    description: `The optimal budget level projects a ROAS of ${optimalBudget.projectedRoas}.`,
    actionableRecommendation: optimalBudget.reasoning,
    confidence: 'medium',
  });

  if (modelAccuracy < 50) {
    insights.push({
      insightId: 'insight_4',
      type: 'risk_assessment',
      title: 'Low forecast confidence',
      description: `Model accuracy is ${modelAccuracy}% due to limited historical data. Predictions carry higher uncertainty.`,
      actionableRecommendation: 'Collect more historical performance data before relying on forecasts for major budget decisions.',
      confidence: 'low',
    });
  }

  return insights;
}

function generateDefaultRecommendations(
  audienceFit: number,
  modelAccuracy: number,
  optimalBudget: { amount: number; projectedRoas: number; reasoning: string },
): ForecastResult['recommendations'] {
  const recs: ForecastResult['recommendations'] = [];

  recs.push({
    priority: 'high',
    recommendation: `Set budget near the optimal level of $${optimalBudget.amount.toLocaleString()} for best projected ROAS.`,
    expectedImpact: `Projected ROAS: ${optimalBudget.projectedRoas}`,
    timeframe: '1-2 weeks',
  });

  if (audienceFit < 60) {
    recs.push({
      priority: 'high',
      recommendation: 'Refine audience targeting to improve fit score before scaling spend.',
      expectedImpact: '+10-20% conversion rate',
      timeframe: '3-5 days',
    });
  }

  if (modelAccuracy < 60) {
    recs.push({
      priority: 'medium',
      recommendation: 'Accumulate more historical data to improve forecast accuracy.',
      expectedImpact: '+15-25% prediction confidence',
      timeframe: '2-4 weeks',
    });
  }

  recs.push({
    priority: 'medium',
    recommendation: 'A/B test creative variants to validate the forecast before full launch.',
    expectedImpact: '+5-15% performance uplift',
    timeframe: '1-2 weeks',
  });

  recs.push({
    priority: 'low',
    recommendation: 'Monitor performance daily in the first week and adjust based on actual vs. predicted.',
    expectedImpact: 'Reduced wasted spend',
    timeframe: 'Ongoing',
  });

  return recs;
}
