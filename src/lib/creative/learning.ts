/**
 * Performance learning loop — analyzes past campaign performance
 * and generates insights that can be fed into future brief generation.
 *
 * The loop:
 * 1. Queries CreativePerformance records for a user
 * 2. Aggregates by hook type, angle, platform, and variant
 * 3. Identifies top-performing patterns
 * 4. Returns structured learnings that can be injected into brief prompts
 */

import { prisma } from '@/lib/prisma';

export interface PerformanceInsight {
  metric: string; // ctr | cvr | roas | impressions
  dimension: string; // hookType | angleName | variantId | platform
  value: string;
  avgScore: number;
  sampleSize: number;
  recommendation: string;
}

export interface PerformanceSummary {
  totalCampaigns: number;
  totalSpend: number;
  totalRevenue: number;
  overallRoas: number;
  topHooks: PerformanceInsight[];
  topAngles: PerformanceInsight[];
  topPlatforms: PerformanceInsight[];
  recommendations: string[];
}

/**
 * Get aggregated performance insights for a user.
 */
export async function getPerformanceSummary(userId: string): Promise<PerformanceSummary> {
  const records = await prisma.creativePerformance.findMany({
    where: { userId },
    orderBy: { recordedAt: 'desc' },
    take: 500,
  }).catch(() => []);

  if (records.length === 0) {
    return {
      totalCampaigns: 0,
      totalSpend: 0,
      totalRevenue: 0,
      overallRoas: 0,
      topHooks: [],
      topAngles: [],
      topPlatforms: [],
      recommendations: ['No performance data yet. Run campaigns to start collecting insights.'],
    };
  }

  const totalSpend = records.reduce((s, r) => s + r.spend, 0);
  const totalRevenue = records.reduce((s, r) => s + r.revenue, 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Aggregate by hook type
  const byHook = aggregateBy(records, 'hookType', 'ctr');
  const byAngle = aggregateBy(records, 'angleName', 'roas');
  const byPlatform = aggregateBy(records, 'platform', 'ctr');

  const recommendations: string[] = [];
  if (byHook.length > 0 && byHook[0].avgScore > 3) {
    recommendations.push(`Hooks of type "${byHook[0].value}" perform best (CTR ${byHook[0].avgScore.toFixed(1)}%). Prioritize this hook style.`);
  }
  if (byAngle.length > 0 && byAngle[0].avgScore > 2) {
    recommendations.push(`Angle "${byAngle[0].value}" has the highest ROAS (${byAngle[0].avgScore.toFixed(2)}x). Reuse this angle for similar products.`);
  }
  if (overallRoas < 1 && totalSpend > 0) {
    recommendations.push('Overall ROAS is below 1.0 — consider testing new creative angles or audiences.');
  }

  return {
    totalCampaigns: new Set(records.map(r => r.campaignId).filter(Boolean)).size,
    totalSpend,
    totalRevenue,
    overallRoas,
    topHooks: byHook.slice(0, 3),
    topAngles: byAngle.slice(0, 3),
    topPlatforms: byPlatform.slice(0, 3),
    recommendations,
  };
}

/**
 * Generate a "learnings context" string that can be injected into brief generation prompts.
 */
export async function getLearningsContext(userId: string): Promise<string> {
  const summary = await getPerformanceSummary(userId);
  if (summary.totalCampaigns === 0) return '';

  const parts: string[] = [`Past campaign performance (${summary.totalCampaigns} campaigns, ROAS ${summary.overallRoas.toFixed(2)}x):`];
  for (const rec of summary.recommendations) {
    parts.push(`- ${rec}`);
  }
  if (summary.topHooks.length > 0) {
    parts.push(`Top hook types: ${summary.topHooks.map(h => `${h.value} (${h.avgScore.toFixed(1)}% CTR)`).join(', ')}`);
  }
  if (summary.topAngles.length > 0) {
    parts.push(`Top angles: ${summary.topAngles.map(a => `${a.value} (${a.avgScore.toFixed(2)}x ROAS)`).join(', ')}`);
  }
  return parts.join('\n');
}

function aggregateBy(
  records: Array<{ hookType: string | null; angleName: string | null; platform: string; ctr: number; cvr: number; roas: number }>,
  field: 'hookType' | 'angleName' | 'platform',
  metric: 'ctr' | 'cvr' | 'roas',
): PerformanceInsight[] {
  const groups = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const key = (r[field] as string | null) || 'unknown';
    const val = r[metric] || 0;
    const g = groups.get(key) || { sum: 0, count: 0 };
    g.sum += val;
    g.count += 1;
    groups.set(key, g);
  }
  return Array.from(groups.entries())
    .map(([value, g]) => ({
      metric,
      dimension: field,
      value,
      avgScore: g.sum / g.count,
      sampleSize: g.count,
      recommendation: `${value}: avg ${metric} ${((g.sum / g.count)).toFixed(2)} across ${g.count} data points`,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}
