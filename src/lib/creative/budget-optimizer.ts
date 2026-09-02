import { atlasChat, resolveModel, isDryRun } from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

export const BUDGET_OPTIMIZER_COST = 6;

export type OptimizationGoal = 'maximize_roas' | 'maximize_reach' | 'maximize_conversions' | 'minimize_cpa' | 'balance_spend';
export type Platform = 'meta' | 'google' | 'tiktok' | 'youtube' | 'instagram' | 'facebook';
export type PacingStrategy = 'even' | 'front_loaded' | 'back_loaded' | 'accelerated' | 'conservative';
export type ReallocationFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface PlatformPerformance {
  platform: Platform;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
  cpc: number;
  ctr: number;
  cvr: number;
  frequency: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface BudgetAllocation {
  platform: Platform;
  currentSpend: number;
  recommendedSpend: number;
  change: number;
  changePercent: number;
  projectedRoas: number;
  projectedConversions: number;
  projectedRevenue: number;
  reasoning: string;
  confidence: number;
}

export interface OptimizationResult {
  goal: OptimizationGoal;
  totalBudget: number;
  currentTotalSpend: number;
  allocations: BudgetAllocation[];
  projectedMetrics: {
    totalRoas: number;
    totalConversions: number;
    totalRevenue: number;
    totalCpa: number;
    improvementPercent: number;
  };
  pacingStrategy: PacingStrategy;
  pacingSchedule: Array<{
    period: string;
    spend: number;
    cumulativeSpend: number;
    percentOfBudget: number;
  }>;
  reallocationPlan: {
    frequency: ReallocationFrequency;
    triggers: Array<{
      condition: string;
      action: string;
      threshold: number;
    }>;
    nextReviewDate: string;
  };
  insights: Array<{
    insightId: string;
    type: 'overperforming' | 'underperforming' | 'opportunity' | 'risk';
    platform: Platform;
    description: string;
    recommendation: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImpact: string;
    timeframe: string;
  }>;
  dryRun?: boolean;
}

export interface OptimizationRequest {
  totalBudget: number;
  goal: OptimizationGoal;
  platformPerformance: PlatformPerformance[];
  pacingStrategy?: PacingStrategy;
  reallocationFrequency?: ReallocationFrequency;
  constraints?: {
    minSpendPerPlatform?: number;
    maxSpendPerPlatform?: number;
    platformLocks?: Platform[];
  };
  planTier?: PlanTier;
}

const OPTIMIZATION_SYS = `You are a media buying and budget optimization expert. Analyze platform performance data and recommend optimal budget allocation. Return a JSON object with fields: insights (array of {insightId, type "overperforming"|"underperforming"|"opportunity"|"risk", platform, description, recommendation}), recommendations (array of {priority "high"|"medium"|"low", recommendation, expectedImpact, timeframe}). Output ONLY the JSON.`;

function extractJson(raw: string): Record<string, unknown> {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try { return JSON.parse(match[0]); } catch { return {}; }
}

function asStr(v: unknown, def = ''): string {
  return typeof v === 'string' ? v : def;
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function getOptimizationGoals(): Array<{ goal: OptimizationGoal; name: string; description: string }> {
  return [
    { goal: 'maximize_roas', name: 'Maximize ROAS', description: 'Shift budget to highest return-on-ad-spend platforms' },
    { goal: 'maximize_reach', name: 'Maximize Reach', description: 'Distribute budget for maximum audience reach' },
    { goal: 'maximize_conversions', name: 'Maximize Conversions', description: 'Shift budget to highest conversion platforms' },
    { goal: 'minimize_cpa', name: 'Minimize CPA', description: 'Reduce cost-per-acquisition across platforms' },
    { goal: 'balance_spend', name: 'Balance Spend', description: 'Even distribution with performance weighting' },
  ];
}

export function getPacingStrategies(): Array<{ strategy: PacingStrategy; name: string; description: string }> {
  return [
    { strategy: 'even', name: 'Even', description: 'Spend evenly across all periods' },
    { strategy: 'front_loaded', name: 'Front-Loaded', description: 'More spend early, tapering over time' },
    { strategy: 'back_loaded', name: 'Back-Loaded', description: 'Light early spend, ramping up over time' },
    { strategy: 'accelerated', name: 'Accelerated', description: 'Aggressive early spend, quick results' },
    { strategy: 'conservative', name: 'Conservative', description: 'Slow, steady spend with reserves' },
  ];
}

export function validateOptimizationRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const totalBudget = typeof request.totalBudget === 'number' ? request.totalBudget : NaN;
  if (isNaN(totalBudget) || totalBudget <= 0) errors.push('totalBudget must be a positive number');
  const validGoals: OptimizationGoal[] = ['maximize_roas', 'maximize_reach', 'maximize_conversions', 'minimize_cpa', 'balance_spend'];
  if (!validGoals.includes(request.goal as OptimizationGoal)) errors.push('goal must be a valid OptimizationGoal');
  if (!Array.isArray(request.platformPerformance) || request.platformPerformance.length === 0) {
    errors.push('platformPerformance must be a non-empty array');
  }
  return { valid: errors.length === 0, errors };
}

export function calculateOptimalAllocation(
  totalBudget: number,
  performance: PlatformPerformance[],
  goal: OptimizationGoal,
  constraints?: { minSpendPerPlatform?: number; maxSpendPerPlatform?: number; platformLocks?: Platform[] },
): BudgetAllocation[] {
  const locks = new Set(constraints?.platformLocks || []);
  const minSpend = constraints?.minSpendPerPlatform ?? 0;
  const maxSpend = constraints?.maxSpendPerPlatform ?? totalBudget;

  // Calculate weights based on goal
  const weights = performance.map((p) => {
    if (locks.has(p.platform)) return p.spend; // locked platforms keep current spend
    switch (goal) {
      case 'maximize_roas': return Math.max(p.roas, 0.01);
      case 'maximize_reach': return Math.max(p.impressions / Math.max(p.spend, 1), 0.01);
      case 'maximize_conversions': return Math.max(p.conversions / Math.max(p.spend, 1), 0.01);
      case 'minimize_cpa': return 1 / Math.max(p.cpa, 0.01);
      case 'balance_spend': return 1;
      default: return 1;
    }
  });

  // Reserve budget for locked platforms
  const lockedSpend = performance.filter((p) => locks.has(p.platform)).reduce((a, p) => a + p.spend, 0);
  const remainingBudget = Math.max(totalBudget - lockedSpend, 0);
  const unlockedIdx = performance.map((p, i) => locks.has(p.platform) ? -1 : i).filter((i) => i >= 0);
  const unlockedWeightSum = unlockedIdx.reduce((a, i) => a + weights[i], 0);

  const allocations: BudgetAllocation[] = performance.map((p, i) => {
    const isLocked = locks.has(p.platform);
    const recommended = isLocked
      ? Math.min(p.spend, maxSpend)
      : unlockedWeightSum > 0
        ? Math.min(Math.max((weights[i] / unlockedWeightSum) * remainingBudget, minSpend), maxSpend)
        : Math.max(minSpend, remainingBudget / unlockedIdx.length);

    const change = recommended - p.spend;
    const changePercent = p.spend > 0 ? (change / p.spend) * 100 : 0;
    const projectedRoas = p.roas > 0 ? p.roas * (1 + (change > 0 ? 0.05 : change < 0 ? -0.02 : 0)) : 0;
    const projectedConversions = p.cpa > 0 ? recommended / p.cpa : 0;
    const projectedRevenue = projectedRoas * recommended;

    let reasoning: string;
    if (isLocked) {
      reasoning = 'Platform spend is locked at current level per constraints.';
    } else if (change > 0) {
      reasoning = `Increase spend — ${goal === 'maximize_roas' ? 'high ROAS' : goal === 'maximize_conversions' ? 'strong conversion rate' : 'good performance'} justifies more budget.`;
    } else if (change < 0) {
      reasoning = `Reduce spend — underperformance on ${goal.replace('_', ' ')} metric; reallocate to better platforms.`;
    } else {
      reasoning = 'Maintain current spend — performance is aligned with target.';
    }

    const confidence = Math.min(100, Math.round(50 + Math.abs(changePercent) * 0.5 + (p.trend === 'improving' ? 15 : p.trend === 'declining' ? -10 : 0)));

    return {
      platform: p.platform,
      currentSpend: p.spend,
      recommendedSpend: Math.round(recommended * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 10) / 10,
      projectedRoas: Math.round(projectedRoas * 100) / 100,
      projectedConversions: Math.round(projectedConversions),
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      reasoning,
      confidence: Math.max(30, Math.min(100, confidence)),
    };
  });

  return allocations;
}

export function generatePacingSchedule(totalBudget: number, strategy: PacingStrategy, durationDays: number): OptimizationResult['pacingSchedule'] {
  const periods = Math.ceil(durationDays / 7); // weekly periods
  const weights: number[] = [];
  for (let i = 0; i < periods; i++) {
    const progress = i / Math.max(periods - 1, 1);
    switch (strategy) {
      case 'even': weights.push(1); break;
      case 'front_loaded': weights.push(1 + (1 - progress) * 0.8); break;
      case 'back_loaded': weights.push(1 + progress * 0.8); break;
      case 'accelerated': weights.push(1 + (1 - progress) * 1.5); break;
      case 'conservative': weights.push(1 + progress * 0.3); break;
      default: weights.push(1);
    }
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let cumulative = 0;
  return weights.map((w, i) => {
    const spend = Math.round((w / totalWeight) * totalBudget * 100) / 100;
    cumulative += spend;
    return {
      period: `Week ${i + 1}`,
      spend,
      cumulativeSpend: Math.round(cumulative * 100) / 100,
      percentOfBudget: Math.round((cumulative / totalBudget) * 100),
    };
  });
}

export function calculateProjectedMetrics(allocations: BudgetAllocation[], performance: PlatformPerformance[]): OptimizationResult['projectedMetrics'] {
  const totalRevenue = allocations.reduce((a, al) => a + al.projectedRevenue, 0);
  const totalSpend = allocations.reduce((a, al) => a + al.recommendedSpend, 0);
  const totalConversions = allocations.reduce((a, al) => a + al.projectedConversions, 0);
  const currentRevenue = performance.reduce((a, p) => a + p.revenue, 0);
  const totalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const totalCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const improvementPercent = currentRevenue > 0 ? Math.round(((totalRevenue - currentRevenue) / currentRevenue) * 100 * 10) / 10 : 0;

  return {
    totalRoas: Math.round(totalRoas * 100) / 100,
    totalConversions: Math.round(totalConversions),
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCpa: Math.round(totalCpa * 100) / 100,
    improvementPercent,
  };
}

export function generateReallocationTriggers(performance: PlatformPerformance[]): OptimizationResult['reallocationPlan']['triggers'] {
  const triggers: OptimizationResult['reallocationPlan']['triggers'] = [];
  const avgRoas = performance.reduce((a, p) => a + p.roas, 0) / Math.max(performance.length, 1);

  triggers.push({
    condition: 'ROAS drops below 70% of platform average',
    action: 'Reduce spend by 20% and reallocate to top performer',
    threshold: Math.round(avgRoas * 0.7 * 100) / 100,
  });
  triggers.push({
    condition: 'CPA increases by more than 50%',
    action: 'Pause underperforming campaigns and shift budget',
    threshold: 50,
  });
  triggers.push({
    condition: 'Frequency exceeds 5 (ad fatigue)',
    action: 'Refresh creative and reduce spend temporarily',
    threshold: 5,
  });
  triggers.push({
    condition: 'CTR drops below 1%',
    action: 'Test new creative variants before increasing spend',
    threshold: 1,
  });

  return triggers;
}

export function detectPerformanceInsights(performance: PlatformPerformance[], allocations: BudgetAllocation[]): OptimizationResult['insights'] {
  const insights: OptimizationResult['insights'] = [];
  const avgRoas = performance.reduce((a, p) => a + p.roas, 0) / Math.max(performance.length, 1);
  let idx = 0;

  for (const p of performance) {
    const alloc = allocations.find((a) => a.platform === p.platform);
    if (!alloc) continue;

    if (p.roas > avgRoas * 1.3) {
      insights.push({
        insightId: `insight_${idx++}`,
        type: 'overperforming',
        platform: p.platform,
        description: `${p.platform} is overperforming with ROAS of ${p.roas} (avg: ${avgRoas.toFixed(2)})`,
        recommendation: `Consider increasing budget allocation to ${p.platform}`,
      });
    } else if (p.roas < avgRoas * 0.7) {
      insights.push({
        insightId: `insight_${idx++}`,
        type: 'underperforming',
        platform: p.platform,
        description: `${p.platform} is underperforming with ROAS of ${p.roas} (avg: ${avgRoas.toFixed(2)})`,
        recommendation: `Reduce spend on ${p.platform} and reallocate to better performers`,
      });
    }

    if (p.trend === 'declining') {
      insights.push({
        insightId: `insight_${idx++}`,
        type: 'risk',
        platform: p.platform,
        description: `${p.platform} shows declining performance trend`,
        recommendation: `Monitor closely and prepare to reduce spend if trend continues`,
      });
    } else if (p.trend === 'improving') {
      insights.push({
        insightId: `insight_${idx++}`,
        type: 'opportunity',
        platform: p.platform,
        description: `${p.platform} shows improving performance trend`,
        recommendation: `Capitalize on momentum with increased allocation`,
      });
    }
  }

  return insights;
}

export async function optimizeBudget(request: OptimizationRequest): Promise<OptimizationResult> {
  const { totalBudget, goal, platformPerformance, pacingStrategy = 'even', reallocationFrequency = 'weekly', constraints, planTier } = request;

  const allocations = calculateOptimalAllocation(totalBudget, platformPerformance, goal, constraints);
  const projectedMetrics = calculateProjectedMetrics(allocations, platformPerformance);
  const pacingSchedule = generatePacingSchedule(totalBudget, pacingStrategy, 30);
  const triggers = generateReallocationTriggers(platformPerformance);
  const insights = detectPerformanceInsights(platformPerformance, allocations);

  // Use AI for strategic recommendations
  let recommendations: OptimizationResult['recommendations'] = [
    { priority: 'high', recommendation: 'Reallocate budget from underperforming to overperforming platforms', expectedImpact: '+15-25% ROAS', timeframe: '1-2 weeks' },
    { priority: 'medium', recommendation: 'Refresh creatives on platforms with high frequency', expectedImpact: '+10-15% CTR', timeframe: '3-5 days' },
    { priority: 'low', recommendation: 'Test new audience segments on top-performing platforms', expectedImpact: '+5-10% reach', timeframe: '2-4 weeks' },
  ];
  let usedDryRun = false;

  if (!isDryRun()) {
  try {
    const model = resolveModel(planTier);
    const perfSummary = platformPerformance.map((p) => `${p.platform}: ROAS=${p.roas}, CPA=${p.cpa}, CTR=${p.ctr}, trend=${p.trend}`).join('; ');
    const aiResponse = await atlasChat(
      [{ role: 'system', content: OPTIMIZATION_SYS }, { role: 'user', content: `Goal: ${goal}\nBudget: ${totalBudget}\nPerformance: ${perfSummary}\n\nGenerate strategic insights and recommendations JSON.` }],
      model, 1500, 30000,
    );
    const j = extractJson(aiResponse);
    if (j.recommendations && Array.isArray(j.recommendations)) {
      const aiRecs = asArr(j.recommendations).map((r) => {
        const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
        return {
          priority: asStr(o.priority, 'medium') as 'high' | 'medium' | 'low',
          recommendation: asStr(o.recommendation),
          expectedImpact: asStr(o.expectedImpact),
          timeframe: asStr(o.timeframe),
        };
      });
      if (aiRecs.length > 0) recommendations = aiRecs;
    }
  } catch {
    usedDryRun = true;
    // Fall through to defaults
  }
  } else {
    usedDryRun = true;
  }

  const nextReview = new Date();
  const daysToAdd = reallocationFrequency === 'daily' ? 1 : reallocationFrequency === 'weekly' ? 7 : reallocationFrequency === 'biweekly' ? 14 : 30;
  nextReview.setDate(nextReview.getDate() + daysToAdd);

  return {
    goal,
    totalBudget,
    currentTotalSpend: platformPerformance.reduce((a, p) => a + p.spend, 0),
    allocations,
    projectedMetrics,
    pacingStrategy,
    pacingSchedule,
    reallocationPlan: {
      frequency: reallocationFrequency,
      triggers,
      nextReviewDate: nextReview.toISOString(),
    },
    insights,
    recommendations,
    dryRun: usedDryRun,
  };
}
