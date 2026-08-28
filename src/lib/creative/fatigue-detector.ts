import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

export const FATIGUE_COST = 5;

export type FatigueLevel = 'healthy' | 'early_warning' | 'fatigued' | 'critical' | 'unknown';
export type FatigueSignal = 'frequency_increase' | 'ctr_decline' | 'engagement_decline' | 'conversion_decline' | 'impression_decay' | 'roas_decline' | 'relevance_score_drop' | 'cost_increase';
export type RefreshUrgency = 'immediate' | 'within_3_days' | 'within_1_week' | 'within_2_weeks' | 'no_action_needed';

export interface CreativeMetrics {
  creativeId: string;
  creativeName: string;
  platform: string;
  currentFrequency: number;
  currentCtr: number;
  currentCvr: number;
  currentEngagementRate: number;
  currentRoas: number;
  currentCpm: number;
  currentRelevanceScore?: number;
  historicalData: Array<{
    period: string;
    frequency: number;
    ctr: number;
    cvr: number;
    engagementRate: number;
    roas: number;
    cpm: number;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  }>;
  daysRunning: number;
  totalImpressions: number;
  totalSpend: number;
}

export interface FatigueSignalResult {
  signal: FatigueSignal;
  detected: boolean;
  severity: number;
  currentValue: number;
  baselineValue: number;
  changePercent: number;
  description: string;
}

export interface RefreshSuggestion {
  type: 'creative_refresh' | 'audience_expansion' | 'format_change' | 'messaging_update' | 'budget_reduction' | 'pause';
  description: string;
  expectedImpact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface FatigueAnalysis {
  creativeId: string;
  creativeName: string;
  platform: string;
  fatigueLevel: FatigueLevel;
  fatigueScore: number;
  signals: FatigueSignalResult[];
  activeSignals: FatigueSignalResult[];
  refreshUrgency: RefreshUrgency;
  daysUntilRefresh: number;
  estimatedPerformanceLoss: number;
  projectedDeclineRate: number;
  recommendation: string;
  refreshSuggestions: RefreshSuggestion[];
  analyzedAt: string;
}

export interface FatigueReport {
  reportId: string;
  analyzedAt: string;
  totalCreatives: number;
  healthyCount: number;
  warningCount: number;
  fatiguedCount: number;
  criticalCount: number;
  analyses: FatigueAnalysis[];
  portfolioHealthScore: number;
  rotationSchedule: Array<{
    creativeId: string;
    creativeName: string;
    action: 'refresh' | 'rotate' | 'pause' | 'monitor';
    scheduledDate: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  insights: Array<{
    insightId: string;
    type: 'portfolio_risk' | 'platform_trend' | 'refresh_pattern' | 'budget_efficiency';
    title: string;
    description: string;
    recommendation: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    affectedCreatives: string[];
    expectedImpact: string;
    timeframe: string;
  }>;
}

const SIGNAL_WEIGHTS: Record<FatigueSignal, number> = {
  frequency_increase: 15,
  ctr_decline: 20,
  engagement_decline: 15,
  conversion_decline: 20,
  impression_decay: 10,
  roas_decline: 20,
  relevance_score_drop: 10,
  cost_increase: 10,
};

const SIGNAL_THRESHOLDS: Record<FatigueSignal, { changePercent: number; direction: 'increase' | 'decline' }> = {
  frequency_increase: { changePercent: 50, direction: 'increase' },
  ctr_decline: { changePercent: 20, direction: 'decline' },
  engagement_decline: { changePercent: 25, direction: 'decline' },
  conversion_decline: { changePercent: 30, direction: 'decline' },
  impression_decay: { changePercent: 15, direction: 'decline' },
  roas_decline: { changePercent: 20, direction: 'decline' },
  relevance_score_drop: { changePercent: 10, direction: 'decline' },
  cost_increase: { changePercent: 25, direction: 'increase' },
};

export function getFatigueSignals(): Array<{ signal: FatigueSignal; name: string; description: string }> {
  return [
    { signal: 'frequency_increase', name: 'Frequency Increase', description: 'Ad frequency is rising, indicating audience saturation' },
    { signal: 'ctr_decline', name: 'CTR Decline', description: 'Click-through rate has dropped significantly from baseline' },
    { signal: 'engagement_decline', name: 'Engagement Decline', description: 'Engagement rate has dropped from baseline' },
    { signal: 'conversion_decline', name: 'Conversion Decline', description: 'Conversion rate has dropped from baseline' },
    { signal: 'impression_decay', name: 'Impression Decay', description: 'Impressions are declining week over week' },
    { signal: 'roas_decline', name: 'ROAS Decline', description: 'Return on ad spend has dropped from baseline' },
    { signal: 'relevance_score_drop', name: 'Relevance Score Drop', description: 'Platform relevance/quality score has dropped' },
    { signal: 'cost_increase', name: 'Cost Increase', description: 'CPM has increased significantly from baseline' },
  ];
}

export function getFatigueLevels(): Array<{ level: FatigueLevel; name: string; scoreRange: string; description: string }> {
  return [
    { level: 'healthy', name: 'Healthy', scoreRange: '0-20', description: 'Creative is performing well with no fatigue signals' },
    { level: 'early_warning', name: 'Early Warning', scoreRange: '21-40', description: 'Some fatigue signals detected, monitor closely' },
    { level: 'fatigued', name: 'Fatigued', scoreRange: '41-70', description: 'Multiple fatigue signals, refresh recommended' },
    { level: 'critical', name: 'Critical', scoreRange: '71-100', description: 'Severe fatigue, immediate action required' },
    { level: 'unknown', name: 'Unknown', scoreRange: 'N/A', description: 'Insufficient data to determine fatigue level' },
  ];
}

function getBaseline(creative: CreativeMetrics): Record<string, number> {
  if (creative.historicalData.length === 0) {
    return { ctr: creative.currentCtr, cvr: creative.currentCvr, engagementRate: creative.currentEngagementRate, roas: creative.currentRoas, cpm: creative.currentCpm, frequency: creative.currentFrequency, impressions: 0, relevanceScore: creative.currentRelevanceScore || 0 };
  }
  const first = creative.historicalData[0];
  return {
    ctr: first.ctr, cvr: first.cvr, engagementRate: first.engagementRate,
    roas: first.roas, cpm: first.cpm, frequency: first.frequency,
    impressions: first.impressions, relevanceScore: creative.currentRelevanceScore || 0,
  };
}

function calcChangePercent(current: number, baseline: number, direction: 'increase' | 'decline'): number {
  if (baseline === 0) return 0;
  const change = ((current - baseline) / baseline) * 100;
  return direction === 'decline' ? -change : change;
}

export function detectSignals(creative: CreativeMetrics): FatigueSignalResult[] {
  const baseline = getBaseline(creative);
  const signals: FatigueSignalResult[] = [];

  const checks: Array<{ signal: FatigueSignal; current: number; baseline: number }> = [
    { signal: 'frequency_increase', current: creative.currentFrequency, baseline: baseline.frequency },
    { signal: 'ctr_decline', current: creative.currentCtr, baseline: baseline.ctr },
    { signal: 'engagement_decline', current: creative.currentEngagementRate, baseline: baseline.engagementRate },
    { signal: 'conversion_decline', current: creative.currentCvr, baseline: baseline.cvr },
    { signal: 'roas_decline', current: creative.currentRoas, baseline: baseline.roas },
    { signal: 'cost_increase', current: creative.currentCpm, baseline: baseline.cpm },
  ];

  // Impression decay: compare last two periods
  const hist = creative.historicalData;
  if (hist.length >= 2) {
    const last = hist[hist.length - 1];
    const prev = hist[hist.length - 2];
    const decayChange = calcChangePercent(last.impressions, prev.impressions, 'decline');
    const threshold = SIGNAL_THRESHOLDS.impression_decay;
    signals.push({
      signal: 'impression_decay',
      detected: decayChange > threshold.changePercent,
      severity: Math.min(100, Math.abs(decayChange) * 2),
      currentValue: last.impressions,
      baselineValue: prev.impressions,
      changePercent: Math.round(decayChange * 10) / 10,
      description: `Impressions ${decayChange > 0 ? 'declined' : 'changed'} by ${Math.abs(Math.round(decayChange * 10) / 10)}% week over week`,
    });
  } else {
    signals.push({ signal: 'impression_decay', detected: false, severity: 0, currentValue: 0, baselineValue: 0, changePercent: 0, description: 'Insufficient historical data' });
  }

  // Relevance score drop
  if (creative.currentRelevanceScore !== undefined && baseline.relevanceScore > 0) {
    const relChange = calcChangePercent(creative.currentRelevanceScore, baseline.relevanceScore, 'decline');
    const threshold = SIGNAL_THRESHOLDS.relevance_score_drop;
    signals.push({
      signal: 'relevance_score_drop',
      detected: relChange > threshold.changePercent,
      severity: Math.min(100, Math.abs(relChange) * 5),
      currentValue: creative.currentRelevanceScore,
      baselineValue: baseline.relevanceScore,
      changePercent: Math.round(relChange * 10) / 10,
      description: `Relevance score ${relChange > 0 ? 'dropped' : 'changed'} by ${Math.abs(Math.round(relChange * 10) / 10)}%`,
    });
  } else {
    signals.push({ signal: 'relevance_score_drop', detected: false, severity: 0, currentValue: 0, baselineValue: 0, changePercent: 0, description: 'No relevance score data' });
  }

  // Standard checks
  for (const check of checks) {
    const threshold = SIGNAL_THRESHOLDS[check.signal];
    const changePct = calcChangePercent(check.current, check.baseline, threshold.direction);
    const detected = changePct > threshold.changePercent;
    signals.push({
      signal: check.signal,
      detected,
      severity: Math.min(100, Math.abs(changePct) * 1.5),
      currentValue: check.current,
      baselineValue: check.baseline,
      changePercent: Math.round(changePct * 10) / 10,
      description: `${check.signal.replace(/_/g, ' ')}: current ${check.current}, baseline ${check.baseline} (${changePct > 0 ? '+' : ''}${Math.round(changePct * 10) / 10}%)`,
    });
  }

  return signals;
}

export function calculateFatigueScore(signals: FatigueSignalResult[]): number {
  let score = 0;
  for (const s of signals) {
    if (s.detected) {
      score += SIGNAL_WEIGHTS[s.signal] * (s.severity / 100);
    }
  }
  return Math.min(100, Math.round(score));
}

export function determineFatigueLevel(score: number): FatigueLevel {
  if (score <= 20) return 'healthy';
  if (score <= 40) return 'early_warning';
  if (score <= 70) return 'fatigued';
  return 'critical';
}

export function determineRefreshUrgency(level: FatigueLevel, daysRunning: number): RefreshUrgency {
  switch (level) {
    case 'critical': return 'immediate';
    case 'fatigued': return daysRunning > 14 ? 'within_3_days' : 'within_1_week';
    case 'early_warning': return 'within_2_weeks';
    case 'healthy': return 'no_action_needed';
    default: return 'no_action_needed';
  }
}

export function generateRefreshSuggestions(analysis: FatigueAnalysis): RefreshSuggestion[] {
  const suggestions: RefreshSuggestion[] = [];
  const level = analysis.fatigueLevel;

  if (level === 'critical') {
    suggestions.push({ type: 'pause', description: 'Pause this creative immediately to stop wasted spend', expectedImpact: 'Stop further performance decline', priority: 'high' });
    suggestions.push({ type: 'creative_refresh', description: 'Create a completely new creative variant with different hook and visual', expectedImpact: 'Restore +30-50% CTR', priority: 'high' });
  } else if (level === 'fatigued') {
    suggestions.push({ type: 'creative_refresh', description: 'Refresh creative with new hook angle and updated visuals', expectedImpact: '+20-35% CTR recovery', priority: 'high' });
    suggestions.push({ type: 'audience_expansion', description: 'Expand to new audience segments to reduce frequency', expectedImpact: '+15-25% reach', priority: 'medium' });
  } else if (level === 'early_warning') {
    suggestions.push({ type: 'messaging_update', description: 'Update messaging and CTA to re-engage audience', expectedImpact: '+10-15% engagement', priority: 'medium' });
    suggestions.push({ type: 'format_change', description: 'Test alternative ad format (video vs image, vertical vs horizontal)', expectedImpact: '+10-20% CTR', priority: 'low' });
  } else {
    suggestions.push({ type: 'budget_reduction', description: 'No action needed — consider slight budget optimization', expectedImpact: 'Maintain current performance', priority: 'low' });
  }

  // Frequency-specific suggestion
  const freqSignal = analysis.activeSignals.find((s) => s.signal === 'frequency_increase');
  if (freqSignal && freqSignal.detected) {
    suggestions.push({ type: 'audience_expansion', description: `Frequency at ${freqSignal.currentValue} — expand audience to reduce saturation`, expectedImpact: 'Reduce frequency by 30-50%', priority: 'high' });
  }

  return suggestions;
}

export function analyzeCreativeFatigue(creative: CreativeMetrics): FatigueAnalysis {
  const signals = detectSignals(creative);
  const activeSignals = signals.filter((s) => s.detected);
  const fatigueScore = calculateFatigueScore(signals);
  const fatigueLevel = determineFatigueLevel(fatigueScore);
  const refreshUrgency = determineRefreshUrgency(fatigueLevel, creative.daysRunning);

  const daysUntilRefresh = fatigueLevel === 'critical' ? 0
    : fatigueLevel === 'fatigued' ? Math.max(1, 7 - Math.floor(fatigueScore / 15))
    : fatigueLevel === 'early_warning' ? 14
    : 30;

  const estimatedPerformanceLoss = fatigueLevel === 'critical' ? Math.round(fatigueScore * 0.8)
    : fatigueLevel === 'fatigued' ? Math.round(fatigueScore * 0.5)
    : fatigueLevel === 'early_warning' ? Math.round(fatigueScore * 0.2)
    : 0;

  const projectedDeclineRate = activeSignals.length > 0
    ? Math.round(activeSignals.reduce((a, s) => a + s.severity, 0) / activeSignals.length * 0.1 * 10) / 10
    : 0;

  const recommendation = fatigueLevel === 'critical'
    ? `Immediate action required. Pause "${creative.creativeName}" and launch a fresh creative variant.`
    : fatigueLevel === 'fatigued'
    ? `"${creative.creativeName}" is showing fatigue. Plan a creative refresh within ${daysUntilRefresh} days.`
    : fatigueLevel === 'early_warning'
    ? `"${creative.creativeName}" shows early warning signs. Monitor and prepare refresh materials.`
    : `"${creative.creativeName}" is performing well. No action needed.`;

  const partialAnalysis: FatigueAnalysis = {
    creativeId: creative.creativeId,
    creativeName: creative.creativeName,
    platform: creative.platform,
    fatigueLevel,
    fatigueScore,
    signals,
    activeSignals,
    refreshUrgency,
    daysUntilRefresh,
    estimatedPerformanceLoss,
    projectedDeclineRate,
    recommendation,
    refreshSuggestions: [],
    analyzedAt: new Date().toISOString(),
  };

  partialAnalysis.refreshSuggestions = generateRefreshSuggestions(partialAnalysis);
  return partialAnalysis;
}

export function generateRotationSchedule(analyses: FatigueAnalysis[]): FatigueReport['rotationSchedule'] {
  const schedule: FatigueReport['rotationSchedule'] = [];
  const now = new Date();

  for (const a of analyses) {
    if (a.fatigueLevel === 'critical' || a.fatigueLevel === 'fatigued') {
      const days = a.daysUntilRefresh;
      const date = new Date(now.getTime() + days * 86400000);
      schedule.push({
        creativeId: a.creativeId,
        creativeName: a.creativeName,
        action: a.fatigueLevel === 'critical' ? 'pause' : 'refresh',
        scheduledDate: date.toISOString(),
        priority: a.fatigueLevel === 'critical' ? 'high' : 'medium',
      });
    } else if (a.fatigueLevel === 'early_warning') {
      const date = new Date(now.getTime() + 14 * 86400000);
      schedule.push({
        creativeId: a.creativeId,
        creativeName: a.creativeName,
        action: 'rotate',
        scheduledDate: date.toISOString(),
        priority: 'low',
      });
    } else {
      schedule.push({
        creativeId: a.creativeId,
        creativeName: a.creativeName,
        action: 'monitor',
        scheduledDate: new Date(now.getTime() + 30 * 86400000).toISOString(),
        priority: 'low',
      });
    }
  }

  return schedule.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
}

export function calculatePortfolioHealth(analyses: FatigueAnalysis[]): number {
  if (analyses.length === 0) return 100;
  const totalScore = analyses.reduce((a, an) => a + (100 - an.fatigueScore), 0);
  return Math.round(totalScore / analyses.length);
}

export function validateCreativeMetrics(creative: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!creative.creativeId || typeof creative.creativeId !== 'string') errors.push('creativeId is required');
  if (!creative.creativeName || typeof creative.creativeName !== 'string') errors.push('creativeName is required');
  if (typeof creative.currentFrequency !== 'number') errors.push('currentFrequency must be a number');
  if (typeof creative.currentCtr !== 'number') errors.push('currentCtr must be a number');
  return { valid: errors.length === 0, errors };
}

export async function detectFatigue(creatives: CreativeMetrics[], planTier?: PlanTier): Promise<FatigueReport> {
  const analyses = creatives.map(analyzeCreativeFatigue);
  const portfolioHealthScore = calculatePortfolioHealth(analyses);
  const rotationSchedule = generateRotationSchedule(analyses);

  const healthyCount = analyses.filter((a) => a.fatigueLevel === 'healthy').length;
  const warningCount = analyses.filter((a) => a.fatigueLevel === 'early_warning').length;
  const fatiguedCount = analyses.filter((a) => a.fatigueLevel === 'fatigued').length;
  const criticalCount = analyses.filter((a) => a.fatigueLevel === 'critical').length;

  // Generate insights
  const insights: FatigueReport['insights'] = [];
  let idx = 0;

  if (criticalCount > 0) {
    insights.push({
      insightId: `insight_${idx++}`,
      type: 'portfolio_risk',
      title: `${criticalCount} creative(s) in critical fatigue`,
      description: `${criticalCount} of ${analyses.length} creatives are critically fatigued and need immediate action.`,
      recommendation: 'Pause critical creatives and launch fresh variants immediately.',
    });
  }

  if (fatiguedCount > analyses.length * 0.3) {
    insights.push({
      insightId: `insight_${idx++}`,
      type: 'refresh_pattern',
      title: 'High fatigue rate across portfolio',
      description: `${Math.round((fatiguedCount / analyses.length) * 100)}% of creatives are fatigued — consider a systematic refresh cycle.`,
      recommendation: 'Establish a 2-week creative refresh cadence.',
    });
  }

  // Platform trend analysis
  const platformMap = new Map<string, FatigueAnalysis[]>();
  for (const a of analyses) {
    if (!platformMap.has(a.platform)) platformMap.set(a.platform, []);
    platformMap.get(a.platform)!.push(a);
  }
  for (const [platform, pAnalyses] of platformMap) {
    const avgScore = pAnalyses.reduce((a, x) => a + x.fatigueScore, 0) / pAnalyses.length;
    if (avgScore > 40 && pAnalyses.length >= 2) {
      insights.push({
        insightId: `insight_${idx++}`,
        type: 'platform_trend',
        title: `${platform} showing above-average fatigue`,
        description: `Average fatigue score on ${platform} is ${Math.round(avgScore)}, higher than portfolio average.`,
        recommendation: `Prioritize creative refreshes for ${platform} campaigns.`,
      });
    }
  }

  // Budget efficiency
  const criticalSpend = analyses.filter((a) => a.fatigueLevel === 'critical').length;
  if (criticalSpend > 0) {
    insights.push({
      insightId: `insight_${idx++}`,
      type: 'budget_efficiency',
      title: 'Budget at risk on fatigued creatives',
      description: `${criticalSpend} critically fatigued creative(s) are likely wasting ad spend.`,
      recommendation: 'Reallocate budget from critical creatives to fresh ones.',
    });
  }

  // Recommendations
  const recommendations: FatigueReport['recommendations'] = [];
  if (criticalCount > 0) {
    recommendations.push({
      priority: 'high',
      recommendation: 'Pause all critically fatigued creatives and launch replacements',
      affectedCreatives: analyses.filter((a) => a.fatigueLevel === 'critical').map((a) => a.creativeId),
      expectedImpact: 'Stop 40-80% performance loss',
      timeframe: 'Immediate',
    });
  }
  if (fatiguedCount > 0) {
    recommendations.push({
      priority: 'high',
      recommendation: 'Refresh fatigued creatives with new hooks and visuals',
      affectedCreatives: analyses.filter((a) => a.fatigueLevel === 'fatigued').map((a) => a.creativeId),
      expectedImpact: '+20-35% CTR recovery',
      timeframe: '3-7 days',
    });
  }
  if (warningCount > 0) {
    recommendations.push({
      priority: 'medium',
      recommendation: 'Prepare refresh materials for early-warning creatives',
      affectedCreatives: analyses.filter((a) => a.fatigueLevel === 'early_warning').map((a) => a.creativeId),
      expectedImpact: 'Prevent performance decline',
      timeframe: '1-2 weeks',
    });
  }
  recommendations.push({
    priority: 'low',
    recommendation: 'Establish a regular creative refresh cadence (every 2-3 weeks)',
    affectedCreatives: [],
    expectedImpact: 'Maintain portfolio health',
    timeframe: 'Ongoing',
  });

  // Try AI enhancement
  try {
    const model = getLLMModel(planTier);
    const summary = analyses.map((a) => `${a.creativeName} (${a.platform}): score=${a.fatigueScore}, level=${a.fatigueLevel}, signals=${a.activeSignals.map((s) => s.signal).join(',')}`).join('; ');
    const aiResponse = await atlasChat(
      [{ role: 'system', content: 'You are an ad fatigue analyst. Return JSON with insights array ({insightId, type, title, description, recommendation}) and recommendations array ({priority, recommendation, affectedCreatives, expectedImpact, timeframe}). Output ONLY JSON.' }, { role: 'user', content: `Fatigue analysis summary: ${summary}` }],
      model, 1500, 30000,
    );
    // We could parse AI response but for now we keep rule-based insights
  } catch {
    // Fall through to rule-based
  }

  return {
    reportId: `report_${Date.now()}`,
    analyzedAt: new Date().toISOString(),
    totalCreatives: creatives.length,
    healthyCount,
    warningCount,
    fatiguedCount,
    criticalCount,
    analyses,
    portfolioHealthScore,
    rotationSchedule,
    insights,
    recommendations,
  };
}
