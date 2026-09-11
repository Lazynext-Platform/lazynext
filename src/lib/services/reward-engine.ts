/**
 * Reward Engine — weighted task scoring with reward/correction memory.
 *
 * Inspired by the Autonomous AI Company Operating System (ujjwalredd/AACOS),
 * re-implemented natively for Lazynext's Prisma + D1/SQLite stack.
 *
 * Scores completed agent tasks on 5 weighted dimensions:
 *  - Verification pass (30%): did the output pass verification criteria?
 *  - Time efficiency (20%): was the task completed within expected time?
 *  - No regression (20%): did the task avoid breaking existing functionality?
 *  - Output quality (15%): deterministic quality score (copy-slop, design-slop)
 *  - Attempt count (15%): fewer retries = higher score
 *
 * Score bands:
 *  - 90+: reward — write a reward memory (type `outcome`) for reinforcement
 *  - 75-89: good — no memory written
 *  - 50-74: correction — write a correction memory (type `lesson`)
 *  - 0-49: failure — write a correction memory + emit escalation event
 *
 * Milestone detection: scores >= 95 emit a broadcast celebration event.
 *
 * @see docs/research/external-reference-architectures.md
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { MemoryService } from '@/lib/services/memory';
import { EventService } from '@/lib/services/event';
import type { MemoryType } from '@/lib/services/memory';

// ── Types ──

export type ScoreBand = 'reward' | 'good' | 'correction' | 'failure';

export interface TaskScoreInput {
  workspaceId: string;
  organizationId: string;
  agentRunId: string;
  taskId?: string;
  agentId: string;
  /** Did the output pass verification criteria? */
  verificationPassed: boolean;
  /** Number of verification criteria that passed. */
  verificationCriteriaPassed: number;
  /** Total number of verification criteria. */
  verificationCriteriaTotal: number;
  /** Time taken in milliseconds. */
  elapsedMs: number;
  /** Expected time in milliseconds (0 = unknown). */
  expectedMs: number;
  /** Did the task cause any regressions? */
  hasRegression: boolean;
  /** Deterministic quality score (0-100, from copy/design scanners). 0 = N/A. */
  qualityScore: number;
  /** Number of attempts (retries) before completion. */
  attemptCount: number;
  /** The role of the agent (for context). */
  agentRole?: string;
  /** Who created this record. */
  createdBy: string;
}

export interface TaskScoreResult {
  /** Overall score 0-100. */
  score: number;
  /** Score band. */
  band: ScoreBand;
  /** Per-dimension breakdown. */
  dimensions: {
    verification: number;
    timeEfficiency: number;
    noRegression: number;
    outputQuality: number;
    attemptCount: number;
  };
  /** Whether a reward/correction memory was written. */
  memoryWritten: boolean;
  /** Whether a milestone event was emitted. */
  milestoneEmitted: boolean;
  /** The memory record ID if written. */
  memoryId?: string;
}

// ── AgentPerformance model helper ──
// Uses a JSON column on AgentDef for rolling stats to avoid a new Prisma model
// in this phase. The next migration can promote this to a dedicated table.

export interface AgentPerformanceStats {
  totalRuns: number;
  totalScore: number;
  averageScore: number;
  rewardCount: number;
  correctionCount: number;
  failureCount: number;
  lastScore: number;
  lastBand: ScoreBand;
  updatedAt: string;
}

export function emptyPerformanceStats(): AgentPerformanceStats {
  return {
    totalRuns: 0,
    totalScore: 0,
    averageScore: 0,
    rewardCount: 0,
    correctionCount: 0,
    failureCount: 0,
    lastScore: 0,
    lastBand: 'good',
    updatedAt: new Date().toISOString(),
  };
}

// ── Scoring ──

/**
 * Score a completed task and write reward/correction memory.
 * This is the main entry point for the reward engine.
 */
export async function scoreTask(input: TaskScoreInput): Promise<TaskScoreResult> {
  // 1. Compute per-dimension scores (0-100 each)
  const verification = input.verificationCriteriaTotal > 0
    ? (input.verificationCriteriaPassed / input.verificationCriteriaTotal) * 100
    : input.verificationPassed ? 100 : 0;

  const timeEfficiency = input.expectedMs > 0
    ? Math.max(0, Math.min(100, (input.expectedMs / Math.max(input.elapsedMs, 1)) * 100))
    : 75; // Unknown time expectation → neutral

  const noRegression = input.hasRegression ? 0 : 100;

  const outputQuality = input.qualityScore > 0 ? input.qualityScore : 75;

  const attemptCount = Math.max(0, Math.min(100, 100 - (input.attemptCount - 1) * 25));

  // 2. Weighted total
  const score = Math.round(
    verification * 0.30 +
    timeEfficiency * 0.20 +
    noRegression * 0.20 +
    outputQuality * 0.15 +
    attemptCount * 0.15,
  );

  // 3. Determine band
  const band: ScoreBand =
    score >= 90 ? 'reward' :
    score >= 75 ? 'good' :
    score >= 50 ? 'correction' :
    'failure';

  // 4. Write reward/correction memory
  let memoryWritten = false;
  let memoryId: string | undefined;

  if (band === 'reward' || band === 'correction' || band === 'failure') {
    const memoryType: MemoryType = band === 'reward' ? 'outcome' : 'lesson';
    const content = buildMemoryContent(input, score, band);
    try {
      const mem = await MemoryService.create({
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: memoryType,
        content,
        source: 'reward-engine',
        sourceId: input.agentRunId,
        confidence: band === 'reward' ? 0.9 : 0.7,
        lifecycle: band === 'failure' ? 'short' : 'medium',
        tags: [band, 'reward-engine', input.agentRole || 'agent'].filter(Boolean),
        createdBy: input.createdBy,
      });
      memoryWritten = true;
      memoryId = mem?.id;
    } catch {
      // Memory write is best-effort; don't fail the scoring
    }
  }

  // 5. Milestone detection — broadcast celebration for exceptional scores
  let milestoneEmitted = false;
  if (score >= 95) {
    try {
      await EventService.emit({
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'agent.milestone',
        actor: input.agentId,
        actorType: 'agent',
        resourceType: 'agent_run',
        resourceId: input.agentRunId,
        metadata: { score, band, taskId: input.taskId, agentRole: input.agentRole },
        source: 'reward-engine',
      });
      milestoneEmitted = true;
    } catch {
      // Event emission is best-effort
    }
  }

  // 6. Emit failure escalation event
  if (band === 'failure') {
    try {
      await EventService.emit({
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'agent.escalation',
        actor: input.agentId,
        actorType: 'agent',
        resourceType: 'agent_run',
        resourceId: input.agentRunId,
        metadata: { score, band, taskId: input.taskId, reason: 'low_score', agentRole: input.agentRole },
        source: 'reward-engine',
      });
    } catch {
      // Best-effort
    }
  }

  // 7. Update rolling performance stats on the agent
  try {
    await updateAgentPerformance(input.agentId, score, band);
  } catch {
    // Best-effort
  }

  return {
    score,
    band,
    dimensions: { verification, timeEfficiency, noRegression, outputQuality, attemptCount },
    memoryWritten,
    milestoneEmitted,
    memoryId,
  };
}

// ── Helpers ──

function buildMemoryContent(input: TaskScoreInput, score: number, band: ScoreBand): string {
  const parts = [
    `[${band.toUpperCase()}] Score: ${score}/100`,
    `Agent: ${input.agentRole || 'unknown'}`,
    `Run: ${input.agentRunId}`,
    input.taskId ? `Task: ${input.taskId}` : '',
    `Verification: ${input.verificationCriteriaPassed}/${input.verificationCriteriaTotal}`,
    `Attempts: ${input.attemptCount}`,
    `Regression: ${input.hasRegression ? 'yes' : 'no'}`,
    input.qualityScore > 0 ? `Quality: ${input.qualityScore}/100` : '',
  ].filter(Boolean);
  return parts.join(' | ').slice(0, 10000);
}

async function updateAgentPerformance(agentId: string, score: number, band: ScoreBand): Promise<void> {
  const agent = await safePrisma(() =>
    prisma.agentDef.findUnique({ where: { id: agentId }, select: { performanceStats: true } }),
  null);
  if (!agent) return;

  // performanceStats is a JSON column (added in migration)
  const raw = (agent as Record<string, unknown>).performanceStats;
  let stats: AgentPerformanceStats;
  try {
    stats = raw ? JSON.parse(raw as string) : emptyPerformanceStats();
  } catch {
    stats = emptyPerformanceStats();
  }

  stats.totalRuns += 1;
  stats.totalScore += score;
  stats.averageScore = Math.round(stats.totalScore / stats.totalRuns);
  if (band === 'reward') stats.rewardCount += 1;
  if (band === 'correction') stats.correctionCount += 1;
  if (band === 'failure') stats.failureCount += 1;
  stats.lastScore = score;
  stats.lastBand = band;
  stats.updatedAt = new Date().toISOString();

  await prisma.agentDef.update({
    where: { id: agentId },
    data: { performanceStats: JSON.stringify(stats) } as Record<string, unknown>,
  }).catch(() => {});
}

// ── Performance lookup ──

export async function getAgentPerformance(agentId: string): Promise<AgentPerformanceStats> {
  const agent = await safePrisma(() =>
    prisma.agentDef.findUnique({ where: { id: agentId }, select: { performanceStats: true } }),
  null);
  if (!agent) return emptyPerformanceStats();
  const raw = (agent as Record<string, unknown>).performanceStats;
  try {
    return raw ? JSON.parse(raw as string) : emptyPerformanceStats();
  } catch {
    return emptyPerformanceStats();
  }
}

export async function getOrganizationPerformance(organizationId: string): Promise<{
  agents: Array<{ agentId: string; role: string; stats: AgentPerformanceStats }>;
  totals: { runs: number; averageScore: number; rewards: number; corrections: number; failures: number };
}> {
  // AgentDef has workspaceId, not organizationId. Find workspaces for this org first.
  const workspaces = await safePrisma(() =>
    prisma.workspace.findMany({
      where: { organizationId },
      select: { id: true },
    }),
  []);

  if (workspaces.length === 0) {
    return {
      agents: [],
      totals: { runs: 0, averageScore: 0, rewards: 0, corrections: 0, failures: 0 },
    };
  }

  const workspaceIds = workspaces.map(w => w.id);
  const agents = await safePrisma(() =>
    prisma.agentDef.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: { id: true, role: true, performanceStats: true },
    }),
  []);

  const result: Array<{ agentId: string; role: string; stats: AgentPerformanceStats }> = [];
  let totalRuns = 0;
  let totalScore = 0;
  let totalRewards = 0;
  let totalCorrections = 0;
  let totalFailures = 0;

  for (const agent of agents) {
    const raw = (agent as Record<string, unknown>).performanceStats;
    let stats: AgentPerformanceStats;
    try {
      stats = raw ? JSON.parse(raw as string) : emptyPerformanceStats();
    } catch {
      stats = emptyPerformanceStats();
    }
    result.push({ agentId: agent.id, role: agent.role, stats });
    totalRuns += stats.totalRuns;
    totalScore += stats.totalScore;
    totalRewards += stats.rewardCount;
    totalCorrections += stats.correctionCount;
    totalFailures += stats.failureCount;
  }

  return {
    agents: result,
    totals: {
      runs: totalRuns,
      averageScore: totalRuns > 0 ? Math.round(totalScore / totalRuns) : 0,
      rewards: totalRewards,
      corrections: totalCorrections,
      failures: totalFailures,
    },
  };
}
