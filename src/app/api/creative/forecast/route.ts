import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/forecast?days=30
 * Returns performance forecasts using linear regression on historical data.
 *
 * Forecasts:
 * - ROAS trend (next 7 days)
 * - CTR trend (next 7 days)
 * - CVR trend (next 7 days)
 * - Budget allocation recommendations across platforms
 */

// Simple linear regression: y = mx + b
function linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// R-squared for confidence
function rSquared(points: Array<{ x: number; y: number }>, slope: number, intercept: number): number {
  const n = points.length;
  if (n < 2) return 0;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  return ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30') || 30, 7), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const records = await prisma.creativePerformance.findMany({
    where: { userId: uid, recordedAt: { gte: since } },
    orderBy: { recordedAt: 'asc' },
  });

  if (records.length < 3) {
    return NextResponse.json({
      forecasts: { roas: null, ctr: null, cvr: null },
      budgetRecommendations: [],
      summary: { totalRecords: records.length, confidence: 0, message: 'insufficient_data' },
    });
  }

  // Group by day and compute daily averages
  const byDay: Record<string, { roas: number[]; ctr: number[]; cvr: number[]; spend: number[]; revenue: number[]; impressions: number[] }> = {};
  for (const r of records) {
    const date = r.recordedAt.toISOString().slice(0, 10);
    if (!byDay[date]) byDay[date] = { roas: [], ctr: [], cvr: [], spend: [], revenue: [], impressions: [] };
    byDay[date].roas.push(r.roas);
    byDay[date].ctr.push(r.ctr);
    byDay[date].cvr.push(r.cvr);
    byDay[date].spend.push(r.spend);
    byDay[date].revenue.push(r.revenue);
    byDay[date].impressions.push(r.impressions);
  }

  const sortedDates = Object.keys(byDay).sort();
  const dailyPoints = sortedDates.map((date, i) => ({
    x: i,
    roas: byDay[date].roas.reduce((a, b) => a + b, 0) / byDay[date].roas.length,
    ctr: byDay[date].ctr.reduce((a, b) => a + b, 0) / byDay[date].ctr.length,
    cvr: byDay[date].cvr.reduce((a, b) => a + b, 0) / byDay[date].cvr.length,
    spend: byDay[date].spend.reduce((a, b) => a + b, 0),
    revenue: byDay[date].revenue.reduce((a, b) => a + b, 0),
    impressions: byDay[date].impressions.reduce((a, b) => a + b, 0),
  }));

  // Linear regression for each metric
  const roasReg = linearRegression(dailyPoints.map(p => ({ x: p.x, y: p.roas })));
  const ctrReg = linearRegression(dailyPoints.map(p => ({ x: p.x, y: p.ctr })));
  const cvrReg = linearRegression(dailyPoints.map(p => ({ x: p.x, y: p.cvr })));

  const roasR2 = rSquared(dailyPoints.map(p => ({ x: p.x, y: p.roas })), roasReg.slope, roasReg.intercept);
  const ctrR2 = rSquared(dailyPoints.map(p => ({ x: p.x, y: p.ctr })), ctrReg.slope, ctrReg.intercept);
  const cvrR2 = rSquared(dailyPoints.map(p => ({ x: p.x, y: p.cvr })), cvrReg.slope, cvrReg.intercept);

  // Forecast next 7 days
  const lastX = dailyPoints.length - 1;
  const forecastDays = 7;
  const roasForecast = roasReg.slope * (lastX + forecastDays) + roasReg.intercept;
  const ctrForecast = ctrReg.slope * (lastX + forecastDays) + ctrReg.intercept;
  const cvrForecast = cvrReg.slope * (lastX + forecastDays) + cvrReg.intercept;

  // Budget recommendations by platform
  const platformStats: Record<string, { roas: number[]; spend: number[]; revenue: number[] }> = {};
  for (const r of records) {
    if (!platformStats[r.platform]) platformStats[r.platform] = { roas: [], spend: [], revenue: [] };
    platformStats[r.platform].roas.push(r.roas);
    platformStats[r.platform].spend.push(r.spend);
    platformStats[r.platform].revenue.push(r.revenue);
  }

  const totalAvgRoas = records.reduce((s, r) => s + r.roas, 0) / records.length;
  const budgetRecommendations = Object.entries(platformStats).map(([platform, data]) => {
    const avgRoas = data.roas.reduce((a, b) => a + b, 0) / data.roas.length;
    const avgSpend = data.spend.reduce((a, b) => a + b, 0) / data.spend.length;
    const avgRevenue = data.revenue.reduce((a, b) => a + b, 0) / data.revenue.length;
    // Recommend budget proportional to ROAS
    const roasRatio = totalAvgRoas > 0 ? avgRoas / totalAvgRoas : 1;
    const recommendedBudgetMultiplier = Math.max(0.5, Math.min(2.0, roasRatio));
    return {
      platform,
      avgRoas,
      avgSpend,
      avgRevenue,
      recommendedBudgetMultiplier,
      recommendation: avgRoas > totalAvgRoas ? 'increase' : avgRoas < totalAvgRoas * 0.8 ? 'decrease' : 'maintain',
    };
  });

  const avgConfidence = (roasR2 + ctrR2 + cvrR2) / 3;

  return NextResponse.json({
    forecasts: {
      roas: { value: Math.max(0, roasForecast), slope: roasReg.slope, r2: roasR2, trend: roasReg.slope > 0 ? 'up' : roasReg.slope < 0 ? 'down' : 'flat' },
      ctr: { value: Math.max(0, ctrForecast), slope: ctrReg.slope, r2: ctrR2, trend: ctrReg.slope > 0 ? 'up' : ctrReg.slope < 0 ? 'down' : 'flat' },
      cvr: { value: Math.max(0, cvrForecast), slope: cvrReg.slope, r2: cvrR2, trend: cvrReg.slope > 0 ? 'up' : cvrReg.slope < 0 ? 'down' : 'flat' },
    },
    budgetRecommendations,
    summary: {
      totalRecords: records.length,
      dataPoints: dailyPoints.length,
      confidence: Math.round(avgConfidence * 100),
      forecastDays,
    },
  });
}
