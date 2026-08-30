import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/observability/metrics
 *
 * Aggregated platform metrics for the observability dashboard.
 * Returns counts, success rates, and credit usage summaries
 * computed from D1 database tables.
 *
 * Requires admin session (ADMIN_EMAILS).
 *
 * Query params:
 *   ?range=24h|7d|30d  — time range for metrics (default: 24h)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Only admins can view platform-wide metrics
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = adminEmails.includes((session.user.email || '').toLowerCase());
  if (!isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Parse time range
  const url = new URL(req.url);
  const rangeParam = url.searchParams.get('range') || '24h';
  const rangeHours = rangeParam === '7d' ? 168 : rangeParam === '30d' ? 720 : 24;
  const since = new Date(Date.now() - rangeHours * 60 * 60 * 1000);

  try {
    // Run all queries in parallel
    const [
      totalUsers,
      newUsers,
      pipelineRuns,
      pipelineCompleted,
      pipelineFailed,
      pipelineRunning,
      creations,
      creationsCompleted,
      creationsFailed,
      creditGrants,
      creditSpends,
      creditRefunds,
      workflowSteps,
      workflowStepsFailed,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.workflowRun.count({ where: { startedAt: { gte: since } } }),
      prisma.workflowRun.count({ where: { status: 'completed', startedAt: { gte: since } } }),
      prisma.workflowRun.count({ where: { status: 'failed', startedAt: { gte: since } } }),
      prisma.workflowRun.count({ where: { status: 'running' } }),
      prisma.creation.count({ where: { createdAt: { gte: since } } }),
      prisma.creation.count({ where: { status: 'completed', createdAt: { gte: since } } }),
      prisma.creation.count({ where: { status: 'failed', createdAt: { gte: since } } }),
      prisma.creditLedger.aggregate({
        where: { reason: { in: ['signup', 'purchase', 'redeem', 'grant'] }, createdAt: { gte: since } },
        _sum: { delta: true },
      }),
      prisma.creditLedger.aggregate({
        where: { reason: 'generate', createdAt: { gte: since } },
        _sum: { delta: true },
      }),
      prisma.creditLedger.aggregate({
        where: { reason: 'refund', createdAt: { gte: since } },
        _sum: { delta: true },
      }),
      prisma.workflowStep.count({ where: { startedAt: { gte: since } } }),
      prisma.workflowStep.count({ where: { status: 'failed', startedAt: { gte: since } } }),
    ]);

    // Compute success rates
    const pipelineSuccessRate = pipelineRuns > 0 ? Math.round((pipelineCompleted / pipelineRuns) * 100) : 100;
    const creationSuccessRate = creations > 0 ? Math.round((creationsCompleted / creations) * 100) : 100;
    const stepSuccessRate = workflowSteps > 0 ? Math.round(((workflowSteps - workflowStepsFailed) / workflowSteps) * 100) : 100;

    // Credit totals (delta is negative for spends, so negate for display)
    const creditsGranted = creditGrants._sum.delta || 0;
    const creditsSpent = Math.abs(creditSpends._sum.delta || 0);
    const creditsRefunded = Math.abs(creditRefunds._sum.delta || 0);

    return NextResponse.json({
      range: rangeParam,
      generatedAt: new Date().toISOString(),
      users: {
        total: totalUsers,
        newInRange: newUsers,
      },
      pipelines: {
        totalRuns: pipelineRuns,
        completed: pipelineCompleted,
        failed: pipelineFailed,
        running: pipelineRunning,
        successRate: pipelineSuccessRate,
      },
      creations: {
        total: creations,
        completed: creationsCompleted,
        failed: creationsFailed,
        successRate: creationSuccessRate,
      },
      workflowSteps: {
        total: workflowSteps,
        failed: workflowStepsFailed,
        successRate: stepSuccessRate,
      },
      credits: {
        granted: creditsGranted,
        spent: creditsSpent,
        refunded: creditsRefunded,
        net: creditsGranted - creditsSpent + creditsRefunded,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'metrics_query_failed', detail: e instanceof Error ? e.message : 'unknown' },
      { status: 500 },
    );
  }
}
