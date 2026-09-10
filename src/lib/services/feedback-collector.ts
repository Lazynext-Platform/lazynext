/**
 * Feedback Collector — collects feedback from various sources for learning.
 *
 * Gathers structured feedback from:
 * - Task completions (outcome, time vs estimate, quality)
 * - Agent runs (status, duration, tool calls, errors)
 * - KPI progress (actual vs target)
 * - Creative performance (what strategies worked)
 *
 * This feedback feeds into the Learning Loop for insight extraction.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface FeedbackRecord {
  source: string;
  sourceId: string;
  rating: 'positive' | 'neutral' | 'negative';
  score: number; // 0.0 - 1.0
  metrics: Record<string, number>;
  notes: string;
  timestamp: Date;
}

export interface AggregatedFeedback {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
  bySource: Record<string, { count: number; averageScore: number }>;
  topIssues: string[];
  topSuccesses: string[];
  records: FeedbackRecord[];
}

// ── Helpers ──

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function ratingFromScore(score: number): 'positive' | 'neutral' | 'negative' {
  if (score >= 0.7) return 'positive';
  if (score >= 0.4) return 'neutral';
  return 'negative';
}

// ── Feedback Collector ──

export const FeedbackCollector = {
  /**
   * Collect feedback when a task is completed.
   * Checks task outcome, time taken vs estimated, and quality markers.
   */
  async collectFromTaskCompletion(
    workspaceId: string,
    taskId: string,
  ): Promise<FeedbackRecord | null> {
    const task = await safePrisma(() =>
      prisma.task.findUnique({
        where: { id: taskId },
      }),
    null);

    if (!task) return null;

    const metrics: Record<string, number> = {};
    let score = 0.5;
    const notes: string[] = [];

    // Outcome from status
    if (task.status === 'done' || task.status === 'verified') {
      score = 0.8;
      notes.push('Task completed successfully');
      metrics.outcome = 1;
    } else if (task.status === 'failed') {
      score = 0.2;
      notes.push('Task failed');
      metrics.outcome = 0;
    } else if (task.status === 'cancelled') {
      score = 0.3;
      notes.push('Task was cancelled');
      metrics.outcome = 0;
    } else {
      // Still in progress — not a completion
      return null;
    }

    // Retry count as quality marker
    if (task.retryCount > 0) {
      score -= 0.1 * task.retryCount;
      notes.push(`Required ${task.retryCount} retries`);
      metrics.retries = task.retryCount;
    }

    // Cost vs estimate
    if (task.estimatedCost > 0) {
      // We don't have actual cost on the task model directly,
      // but we can use estimatedCost as a reference point
      metrics.estimatedCost = task.estimatedCost;
    }

    // Risk level adjustment
    if (task.riskLevel === 'high') {
      score -= 0.05;
      notes.push('High-risk task');
    }

    // Verification data
    const verification = parseJson<{ passed?: boolean; failures?: string[] }>(task.verification, {});
    if (verification.passed === true) {
      score += 0.1;
      notes.push('Verification passed');
      metrics.verified = 1;
    } else if (verification.passed === false) {
      score -= 0.15;
      notes.push('Verification failed');
      metrics.verified = 0;
    }

    // Clamp score
    score = Math.max(0, Math.min(1, score));

    return {
      source: 'task',
      sourceId: taskId,
      rating: ratingFromScore(score),
      score,
      metrics,
      notes: notes.join('; '),
      timestamp: new Date(),
    };
  },

  /**
   * Collect feedback from an agent run.
   * Checks run status, duration, tool calls, and errors.
   */
  async collectFromAgentRun(
    _workspaceId: string,
    agentRunId: string,
  ): Promise<FeedbackRecord | null> {
    const run = await safePrisma(() =>
      prisma.agentRun.findUnique({
        where: { id: agentRunId },
      }),
    null);

    if (!run) return null;

    const metrics: Record<string, number> = {};
    let score = 0.5;
    const notes: string[] = [];

    // Status
    if (run.status === 'completed') {
      score = 0.8;
      notes.push('Agent run completed');
      metrics.outcome = 1;
    } else if (run.status === 'failed') {
      score = 0.2;
      notes.push('Agent run failed');
      metrics.outcome = 0;
    } else if (run.status === 'cancelled') {
      score = 0.3;
      notes.push('Agent run cancelled');
      metrics.outcome = 0;
    } else {
      // Still running — not a completion
      return null;
    }

    // Duration
    if (run.startedAt && run.completedAt) {
      const durationMs = run.completedAt.getTime() - run.startedAt.getTime();
      const durationSec = durationMs / 1000;
      metrics.durationSec = Math.round(durationSec);

      // Penalize very long runs (>5 min)
      if (durationSec > 300) {
        score -= 0.1;
        notes.push(`Long run: ${Math.round(durationSec)}s`);
      } else if (durationSec < 10) {
        score += 0.05;
        notes.push(`Quick run: ${Math.round(durationSec)}s`);
      }
    }

    // Token usage
    metrics.tokensUsed = run.tokensUsed;
    if (run.tokensUsed > 5000) {
      score -= 0.05;
      notes.push(`High token usage: ${run.tokensUsed}`);
    }

    // Cost
    metrics.costCredits = run.costCredits;

    // Tool calls
    const toolCalls = parseJson<Array<{ status: string }>>(run.toolCalls, []);
    metrics.toolCalls = toolCalls.length;
    const failedTools = toolCalls.filter((tc) => tc.status === 'failed').length;
    metrics.failedTools = failedTools;
    if (failedTools > 0) {
      score -= 0.1 * failedTools;
      notes.push(`${failedTools} tool calls failed`);
    }

    // Verification
    const verification = parseJson<{ passed?: boolean; failures?: string[] }>(run.verification, {});
    if (verification.passed === true) {
      score += 0.1;
      notes.push('Verification passed');
    } else if (verification.passed === false) {
      score -= 0.15;
      const failures = verification.failures || [];
      notes.push(`Verification failed: ${failures.join(', ')}`);
    }

    // Retry count
    if (run.retryCount > 0) {
      score -= 0.05 * run.retryCount;
      notes.push(`${run.retryCount} retries`);
      metrics.retries = run.retryCount;
    }

    score = Math.max(0, Math.min(1, score));

    return {
      source: 'agent_run',
      sourceId: agentRunId,
      rating: ratingFromScore(score),
      score,
      metrics,
      notes: notes.join('; '),
      timestamp: new Date(),
    };
  },

  /**
   * Collect feedback from KPI progress.
   * Compares current values to targets.
   */
  async collectFromKpiProgress(
    organizationId: string,
    goalId: string,
  ): Promise<FeedbackRecord | null> {
    const kpis = await safePrisma(() =>
      prisma.kpi.findMany({
        where: {
          organizationId,
          goalId,
        },
      }),
    []);

    if (kpis.length === 0) return null;

    const metrics: Record<string, number> = {};
    let totalProgress = 0;
    const notes: string[] = [];

    for (const kpi of kpis) {
      const target = kpi.target || 0;
      const current = kpi.current || 0;
      const progress = target > 0 ? current / target : 0;
      totalProgress += progress;
      metrics[`${kpi.name}_progress`] = Math.round(progress * 100) / 100;
    }

    const avgProgress = totalProgress / kpis.length;
    metrics.avgProgress = Math.round(avgProgress * 100) / 100;
    metrics.kpiCount = kpis.length;

    let score: number;
    if (avgProgress >= 1.0) {
      score = 0.9;
      notes.push(`KPIs at ${Math.round(avgProgress * 100)}% of target — on track or exceeded`);
    } else if (avgProgress >= 0.7) {
      score = 0.7;
      notes.push(`KPIs at ${Math.round(avgProgress * 100)}% of target — progressing well`);
    } else if (avgProgress >= 0.4) {
      score = 0.5;
      notes.push(`KPIs at ${Math.round(avgProgress * 100)}% of target — behind schedule`);
    } else {
      score = 0.2;
      notes.push(`KPIs at only ${Math.round(avgProgress * 100)}% of target — significantly behind`);
    }

    return {
      source: 'kpi',
      sourceId: goalId,
      rating: ratingFromScore(score),
      score,
      metrics,
      notes: notes.join('; '),
      timestamp: new Date(),
    };
  },

  /**
   * Collect feedback from creative performance.
   * Queries CreativePerformance records to identify what strategies worked.
   */
  async collectFromCreativePerformance(
    _workspaceId: string,
    userId: string,
  ): Promise<FeedbackRecord | null> {
    const records = await safePrisma(() =>
      prisma.creativePerformance.findMany({
        where: { userId },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      }),
    []);

    if (records.length === 0) return null;

    const metrics: Record<string, number> = {};
    const notes: string[] = [];

    // Aggregate performance metrics
    const totalImpressions = records.reduce((sum, r) => sum + r.impressions, 0);
    const totalClicks = records.reduce((sum, r) => sum + r.clicks, 0);
    const totalConversions = records.reduce((sum, r) => sum + r.conversions, 0);
    const totalSpend = records.reduce((sum, r) => sum + r.spend, 0);
    const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
    const avgCtr = records.reduce((sum, r) => sum + r.ctr, 0) / records.length;
    const avgCvr = records.reduce((sum, r) => sum + r.cvr, 0) / records.length;
    const avgRoas = records.reduce((sum, r) => sum + r.roas, 0) / records.length;

    metrics.impressions = totalImpressions;
    metrics.clicks = totalClicks;
    metrics.conversions = totalConversions;
    metrics.spend = Math.round(totalSpend * 100) / 100;
    metrics.revenue = Math.round(totalRevenue * 100) / 100;
    metrics.avgCtr = Math.round(avgCtr * 10000) / 10000;
    metrics.avgCvr = Math.round(avgCvr * 10000) / 10000;
    metrics.avgRoas = Math.round(avgRoas * 100) / 100;
    metrics.recordCount = records.length;

    // Score based on ROAS and CTR
    let score = 0.5;
    if (avgRoas >= 3) {
      score = 0.9;
      notes.push(`Excellent ROAS: ${avgRoas.toFixed(2)}`);
    } else if (avgRoas >= 2) {
      score = 0.75;
      notes.push(`Good ROAS: ${avgRoas.toFixed(2)}`);
    } else if (avgRoas >= 1) {
      score = 0.55;
      notes.push(`Break-even ROAS: ${avgRoas.toFixed(2)}`);
    } else if (avgRoas > 0) {
      score = 0.25;
      notes.push(`Below break-even ROAS: ${avgRoas.toFixed(2)}`);
    }

    // CTR bonus
    if (avgCtr >= 0.03) {
      score = Math.min(1, score + 0.05);
      notes.push(`Strong CTR: ${(avgCtr * 100).toFixed(2)}%`);
    }

    // Identify top-performing hook types and angles
    const hookPerformance = new Map<string, { roas: number; count: number }>();
    const anglePerformance = new Map<string, { roas: number; count: number }>();

    for (const r of records) {
      if (r.hookType) {
        const existing = hookPerformance.get(r.hookType) || { roas: 0, count: 0 };
        existing.roas += r.roas;
        existing.count++;
        hookPerformance.set(r.hookType, existing);
      }
      if (r.angleName) {
        const existing = anglePerformance.get(r.angleName) || { roas: 0, count: 0 };
        existing.roas += r.roas;
        existing.count++;
        anglePerformance.set(r.angleName, existing);
      }
    }

    // Find best hook type
    let bestHook = '';
    let bestHookRoas = 0;
    for (const [hook, data] of hookPerformance) {
      const avgR = data.count > 0 ? data.roas / data.count : 0;
      if (avgR > bestHookRoas) {
        bestHookRoas = avgR;
        bestHook = hook;
      }
    }
    if (bestHook) {
      notes.push(`Best hook type: ${bestHook} (ROAS ${bestHookRoas.toFixed(2)})`);
    }

    // Find best angle
    let bestAngle = '';
    let bestAngleRoas = 0;
    for (const [angle, data] of anglePerformance) {
      const avgR = data.count > 0 ? data.roas / data.count : 0;
      if (avgR > bestAngleRoas) {
        bestAngleRoas = avgR;
        bestAngle = angle;
      }
    }
    if (bestAngle) {
      notes.push(`Best angle: ${bestAngle} (ROAS ${bestAngleRoas.toFixed(2)})`);
    }

    score = Math.max(0, Math.min(1, score));

    return {
      source: 'creative_performance',
      sourceId: userId,
      rating: ratingFromScore(score),
      score,
      metrics,
      notes: notes.join('; '),
      timestamp: new Date(),
    };
  },

  /**
   * Aggregate feedback from all sources.
   * Returns a combined summary.
   */
  async aggregateFeedback(
    workspaceId: string,
    opts?: {
      organizationId?: string;
      userId?: string;
      goalId?: string;
      taskId?: string;
      agentRunId?: string;
    },
  ): Promise<AggregatedFeedback> {
    const records: FeedbackRecord[] = [];

    // Collect from task completion
    if (opts?.taskId) {
      const fb = await this.collectFromTaskCompletion(workspaceId, opts.taskId);
      if (fb) records.push(fb);
    }

    // Collect from agent run
    if (opts?.agentRunId) {
      const fb = await this.collectFromAgentRun(workspaceId, opts.agentRunId);
      if (fb) records.push(fb);
    }

    // Collect from KPI progress
    if (opts?.organizationId && opts?.goalId) {
      const fb = await this.collectFromKpiProgress(opts.organizationId, opts.goalId);
      if (fb) records.push(fb);
    }

    // Collect from creative performance
    if (opts?.userId) {
      const fb = await this.collectFromCreativePerformance(workspaceId, opts.userId);
      if (fb) records.push(fb);
    }

    // If no specific IDs, try to collect broadly from recent completed tasks
    if (records.length === 0 && !opts?.taskId && !opts?.agentRunId) {
      const recentTasks = await safePrisma(() =>
        prisma.task.findMany({
          where: {
            status: { in: ['done', 'failed', 'verified'] },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
      []);

      for (const task of recentTasks) {
        const fb = await this.collectFromTaskCompletion(workspaceId, task.id);
        if (fb) records.push(fb);
      }
    }

    // Aggregate
    const positive = records.filter((r) => r.rating === 'positive').length;
    const neutral = records.filter((r) => r.rating === 'neutral').length;
    const negative = records.filter((r) => r.rating === 'negative').length;
    const averageScore = records.length > 0
      ? records.reduce((sum, r) => sum + r.score, 0) / records.length
      : 0;

    // By source
    const bySource: Record<string, { count: number; averageScore: number }> = {};
    for (const record of records) {
      const existing = bySource[record.source] || { count: 0, averageScore: 0 };
      existing.count++;
      existing.averageScore = (existing.averageScore * (existing.count - 1) + record.score) / existing.count;
      bySource[record.source] = existing;
    }

    // Top issues (negative feedback notes)
    const topIssues = records
      .filter((r) => r.rating === 'negative')
      .map((r) => r.notes)
      .slice(0, 5);

    // Top successes (positive feedback notes)
    const topSuccesses = records
      .filter((r) => r.rating === 'positive')
      .map((r) => r.notes)
      .slice(0, 5);

    return {
      total: records.length,
      positive,
      neutral,
      negative,
      averageScore: Math.round(averageScore * 100) / 100,
      bySource,
      topIssues,
      topSuccesses,
      records,
    };
  },
};
