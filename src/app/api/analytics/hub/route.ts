import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/analytics/hub
 * Unified analytics dashboard — aggregates data from all sources:
 *   - Creative performance (impressions, clicks, conversions, ROAS)
 *   - Credit usage (spend, by category, projection)
 *   - Creation stats (total, by status, by template)
 *   - Campaign stats (total, by platform, active vs paused)
 *   - Top performing creatives
 *   - Trends over last 30 days
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── Creative Performance ──
  const perfRecords = await prisma.creativePerformance.findMany({
    where: { userId: uid, recordedAt: { gte: thirtyDaysAgo } },
    orderBy: { recordedAt: 'desc' },
  }).catch(() => []);

  const totalImpressions = perfRecords.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = perfRecords.reduce((s, r) => s + r.clicks, 0);
  const totalConversions = perfRecords.reduce((s, r) => s + r.conversions, 0);
  const totalSpend = perfRecords.reduce((s, r) => s + r.spend, 0);
  const totalRevenue = perfRecords.reduce((s, r) => s + r.revenue, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Performance by platform
  const byPlatform: Record<string, { impressions: number; clicks: number; conversions: number; spend: number; revenue: number }> = {};
  for (const r of perfRecords) {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
    byPlatform[r.platform].impressions += r.impressions;
    byPlatform[r.platform].clicks += r.clicks;
    byPlatform[r.platform].conversions += r.conversions;
    byPlatform[r.platform].spend += r.spend;
    byPlatform[r.platform].revenue += r.revenue;
  }

  // Performance by day (last 30 days)
  const perfByDay: Record<string, { impressions: number; clicks: number; conversions: number; spend: number; revenue: number }> = {};
  for (const r of perfRecords) {
    const day = r.recordedAt.toISOString().slice(0, 10);
    if (!perfByDay[day]) perfByDay[day] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
    perfByDay[day].impressions += r.impressions;
    perfByDay[day].clicks += r.clicks;
    perfByDay[day].conversions += r.conversions;
    perfByDay[day].spend += r.spend;
    perfByDay[day].revenue += r.revenue;
  }

  // Top performing creatives
  const creativeMap: Record<string, { creationId: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number; roas: number }> = {};
  for (const r of perfRecords) {
    if (!r.creationId) continue;
    if (!creativeMap[r.creationId]) {
      creativeMap[r.creationId] = { creationId: r.creationId, impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, roas: 0 };
    }
    creativeMap[r.creationId].impressions += r.impressions;
    creativeMap[r.creationId].clicks += r.clicks;
    creativeMap[r.creationId].conversions += r.conversions;
    creativeMap[r.creationId].spend += r.spend;
    creativeMap[r.creationId].revenue += r.revenue;
  }
  const topCreatives = Object.values(creativeMap)
    .map(c => ({ ...c, roas: c.spend > 0 ? c.revenue / c.spend : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ── Credit Usage ──
  const ledger = await prisma.creditLedger.findMany({
    where: { userId: uid, createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: 'desc' },
  }).catch(() => []);

  const creditSpent30d = ledger.filter(e => (e.delta || 0) < 0).reduce((s, e) => s + Math.abs(e.delta || 0), 0);
  const creditGranted30d = ledger.filter(e => (e.delta || 0) > 0).reduce((s, e) => s + (e.delta || 0), 0);
  const creditByReason: Record<string, { count: number; totalDelta: number }> = {};
  for (const e of ledger) {
    const reason = e.reason || 'unknown';
    if (!creditByReason[reason]) creditByReason[reason] = { count: 0, totalDelta: 0 };
    creditByReason[reason].count++;
    creditByReason[reason].totalDelta += (e.delta || 0);
  }

  // 7-day average spend for projection
  const recentLedger = ledger.filter(e => e.createdAt && e.createdAt >= sevenDaysAgo && (e.delta || 0) < 0);
  const sevenDaySpend = recentLedger.reduce((s, e) => s + Math.abs(e.delta || 0), 0);
  const dailyAvgSpend = sevenDaySpend / 7;

  // ── Creation Stats ──
  const creations = await prisma.creation.findMany({
    where: { userId: uid },
    select: { id: true, templateId: true, status: true, cost: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  }).catch(() => []);

  const totalCreations = creations.length;
  const completedCreations = creations.filter(c => c.status === 'completed').length;
  const failedCreations = creations.filter(c => c.status === 'failed').length;
  const processingCreations = creations.filter(c => c.status === 'processing' || c.status === 'pending').length;
  const totalCreditsUsed = creations.reduce((s, c) => s + (c.cost || 0), 0);

  // By template
  const byTemplate: Record<string, { count: number; credits: number }> = {};
  for (const c of creations) {
    const tid = c.templateId || 'unknown';
    if (!byTemplate[tid]) byTemplate[tid] = { count: 0, credits: 0 };
    byTemplate[tid].count++;
    byTemplate[tid].credits += (c.cost || 0);
  }

  // Creations by day (last 30 days)
  const creationsByDay: Record<string, number> = {};
  for (const c of creations) {
    if (c.createdAt < thirtyDaysAgo) continue;
    const day = c.createdAt.toISOString().slice(0, 10);
    creationsByDay[day] = (creationsByDay[day] || 0) + 1;
  }

  // ── Campaign Stats ──
  const campaigns = await prisma.adCampaign.findMany({
    where: { userId: uid },
    select: { id: true, platform: true, status: true, campaignId: true },
  }).catch(() => []);

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const campaignsByPlatform: Record<string, number> = {};
  for (const c of campaigns) {
    campaignsByPlatform[c.platform] = (campaignsByPlatform[c.platform] || 0) + 1;
  }

  // ── User balance ──
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { credits: true },
  }).catch(() => null);

  const currentBalance = user?.credits || 0;
  const projectionDays = dailyAvgSpend > 0 && currentBalance >= 0 ? Math.floor(currentBalance / dailyAvgSpend) : null;

  // ── Workflow Run Stats ──
  const workflowRuns = await prisma.workflowRun.findMany({
    where: { userId: uid },
    select: { id: true, workflowType: true, status: true, startedAt: true, completedAt: true },
    orderBy: { startedAt: 'desc' },
    take: 100,
  }).catch(() => []);

  const totalWorkflowRuns = workflowRuns.length;
  const completedWorkflowRuns = workflowRuns.filter(r => r.status === 'completed').length;
  const failedWorkflowRuns = workflowRuns.filter(r => r.status === 'failed').length;
  const runningWorkflowRuns = workflowRuns.filter(r => r.status === 'running').length;
  const workflowRunsByType: Record<string, number> = {};
  for (const r of workflowRuns) {
    const wt = r.workflowType || 'unknown';
    workflowRunsByType[wt] = (workflowRunsByType[wt] || 0) + 1;
  }
  // Average workflow duration (completed runs only)
  const completedDurations = workflowRuns
    .filter(r => r.status === 'completed' && r.completedAt)
    .map(r => (r.completedAt!.getTime() - r.startedAt.getTime()) / 1000);
  const avgWorkflowDurationSec = completedDurations.length > 0
    ? Math.round(completedDurations.reduce((s, d) => s + d, 0) / completedDurations.length)
    : 0;

  // ── Per-stage workflow step stats ──
  const workflowRunIds = workflowRuns.map(r => r.id);
  const workflowSteps = workflowRunIds.length > 0
    ? await prisma.workflowStep.findMany({
        where: { runId: { in: workflowRunIds } },
        select: { stepName: true, status: true, creditsCost: true, startedAt: true, completedAt: true },
      }).catch(() => [])
    : [];

  const stagesByType: Record<string, { total: number; completed: number; failed: number; totalCredits: number; avgDurationSec: number }> = {};
  for (const step of workflowSteps) {
    const stageName = step.stepName || 'unknown';
    if (!stagesByType[stageName]) stagesByType[stageName] = { total: 0, completed: 0, failed: 0, totalCredits: 0, avgDurationSec: 0 };
    stagesByType[stageName].total++;
    if (step.status === 'completed') stagesByType[stageName].completed++;
    if (step.status === 'failed') stagesByType[stageName].failed++;
    stagesByType[stageName].totalCredits += (step.creditsCost || 0);
    if (step.completedAt && step.startedAt) {
      const dur = (step.completedAt.getTime() - step.startedAt.getTime()) / 1000;
      if (Number.isFinite(dur) && dur >= 0) {
        stagesByType[stageName].avgDurationSec = (stagesByType[stageName].avgDurationSec + dur) / 2;
      }
    }
  }

  return NextResponse.json({
    // Overview
    overview: {
      totalImpressions,
      totalClicks,
      totalConversions,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgCtr: Math.round(avgCtr * 100) / 100,
      avgCvr: Math.round(avgCvr * 100) / 100,
      avgRoas: Math.round(avgRoas * 100) / 100,
      totalCreations,
      completedCreations,
      failedCreations,
      processingCreations,
      totalCreditsUsed,
      currentBalance,
      totalCampaigns,
      activeCampaigns,
    },
    // Trends
    perfByDay: Object.entries(perfByDay)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    creationsByDay: Object.entries(creationsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    // Breakdowns
    byPlatform: Object.entries(byPlatform).map(([platform, v]) => ({
      platform,
      ...v,
      ctr: v.impressions > 0 ? Math.round((v.clicks / v.impressions) * 10000) / 100 : 0,
      roas: v.spend > 0 ? Math.round((v.revenue / v.spend) * 100) / 100 : 0,
    })),
    byTemplate: Object.entries(byTemplate)
      .map(([template, v]) => ({ template, ...v }))
      .sort((a, b) => b.count - a.count),
    campaignsByPlatform,
    creditByReason: Object.entries(creditByReason)
      .map(([reason, v]) => ({ reason, ...v }))
      .sort((a, b) => Math.abs(b.totalDelta) - Math.abs(a.totalDelta)),
    // Top items
    topCreatives,
    // Credit projection
    creditUsage: {
      spent30d: creditSpent30d,
      granted30d: creditGranted30d,
      dailyAvgSpend: Math.round(dailyAvgSpend * 100) / 100,
      projectionDays,
    },
    // Workflow stats
    workflows: {
      totalRuns: totalWorkflowRuns,
      completedRuns: completedWorkflowRuns,
      failedRuns: failedWorkflowRuns,
      runningRuns: runningWorkflowRuns,
      byType: Object.entries(workflowRunsByType)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      avgDurationSec: avgWorkflowDurationSec,
      perStage: Object.entries(stagesByType)
        .map(([stage, v]) => ({
          stage,
          total: v.total,
          completed: v.completed,
          failed: v.failed,
          successRate: v.total > 0 ? Math.round((v.completed / v.total) * 10000) / 100 : 0,
          totalCredits: v.totalCredits,
          avgDurationSec: Math.round(v.avgDurationSec),
        }))
        .sort((a, b) => b.total - a.total),
    },
  });
}
