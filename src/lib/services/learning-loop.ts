/**
 * Learning Loop Service — closes the autonomous learning loop.
 *
 * Agents evaluate outcomes, update memories, adjust plans, re-prioritize tasks,
 * and feed insights back into future planning automatically.
 *
 * The cycle:
 * 1. Evaluate outcomes of completed tasks / agent runs / plans
 * 2. Extract insights from recent outcomes (pattern detection)
 * 3. Update plans at risk based on learning
 * 4. Re-prioritize remaining tasks based on success/failure patterns
 * 5. Adjust goal targets where progress diverges significantly
 * 6. Record a summary memory and emit a cycle-completed event
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { MemoryService } from '@/lib/services/memory';
import { EventService } from '@/lib/services/event';

// ── Types ──

export type ResourceType = 'task' | 'agent_run' | 'plan';
export type Outcome = 'success' | 'failure' | 'partial';

export interface EvaluateOutcomeInput {
  resourceType: ResourceType;
  resourceId: string;
  outcome: Outcome;
  metrics?: Record<string, number>;
  notes?: string;
}

export interface Insight {
  insight: string;
  confidence: number;
  evidence: string[];
  recommendation: string;
}

export interface CycleSummary {
  evaluated: number;
  insights: Insight[];
  plansUpdated: number;
  tasksReprioritized: number;
  goalsAdjusted: number;
}

export interface GoalAdjustmentRecommendation {
  goalId: string;
  goalTitle: string;
  action: 'raise_target' | 'lower_target' | 'break_down' | 'no_change';
  reason: string;
  suggestedTarget?: number;
  kpis: Array<{ name: string; current: number; target: number; progress: number }>;
}

export interface ReprioritizationSummary {
  boosted: Array<{ taskId: string; title: string; oldPriority: string; newPriority: string; reason: string }>;
  lowered: Array<{ taskId: string; title: string; oldPriority: string; newPriority: string; reason: string }>;
  total: number;
}

export interface LearningDashboardData {
  recentOutcomes: Array<{ id: string; content: string; source: string; createdAt: Date; confidence: number }>;
  topInsights: Insight[];
  atRiskPlans: Array<{ id: string; title: string; status: string; objective: string }>;
  cycleHistory: Array<{ id: string; content: string; createdAt: Date }>;
  recommendations: Array<{ insight: string; recommendation: string; confidence: number }>;
  stats: {
    totalOutcomes: number;
    successRate: number;
    lastCycleAt: Date | null;
  };
}

// ── Helpers ──

const PRIORITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
const PRIORITY_BY_VALUE: Record<number, string> = { 1: 'low', 2: 'medium', 3: 'high', 4: 'urgent' };

function boostPriority(current: string): string {
  const level = PRIORITY_ORDER[current] || 2;
  return PRIORITY_BY_VALUE[Math.min(4, level + 1)] || 'high';
}

function lowerPriority(current: string): string {
  const level = PRIORITY_ORDER[current] || 2;
  return PRIORITY_BY_VALUE[Math.max(1, level - 1)] || 'low';
}

function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// ── Learning Loop Service ──

export const LearningLoopService = {
  /**
   * Evaluate the outcome of a task, agent run, or plan.
   * Records an outcome memory and emits a learning event.
   */
  async evaluateOutcome(
    workspaceId: string,
    organizationId: string,
    input: EvaluateOutcomeInput,
  ) {
    const content = this.buildOutcomeContent(input);
    const confidence = input.outcome === 'success' ? 0.9 : input.outcome === 'partial' ? 0.6 : 0.4;

    const memory = await MemoryService.create({
      workspaceId,
      organizationId,
      type: 'outcome',
      content,
      source: 'agent',
      sourceId: input.resourceId,
      confidence,
      lifecycle: 'medium',
      tags: ['learning', input.resourceType, input.outcome],
      createdBy: 'learning-loop',
    }).catch(() => null);

    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'learning.outcome_evaluated',
      actorType: 'agent',
      actor: 'learning-loop',
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: {
        outcome: input.outcome,
        metrics: input.metrics || {},
        notes: (input.notes || '').slice(0, 500),
      },
    }).catch(() => null);

    return memory;
  },

  /**
   * Build a human-readable outcome content string.
   */
  buildOutcomeContent(input: EvaluateOutcomeInput): string {
    const parts: string[] = [
      `Outcome: ${input.outcome} for ${input.resourceType} ${input.resourceId}`,
    ];
    if (input.metrics && Object.keys(input.metrics).length > 0) {
      parts.push(`Metrics: ${JSON.stringify(input.metrics)}`);
    }
    if (input.notes) {
      parts.push(`Notes: ${input.notes.slice(0, 500)}`);
    }
    return parts.join(' | ');
  },

  /**
   * Extract insights from recent outcome memories.
   * Groups outcomes by resource type and outcome, identifying patterns.
   */
  async extractInsights(
    workspaceId: string,
    _organizationId: string,
    opts?: { take?: number },
  ): Promise<Insight[]> {
    const take = opts?.take || 100;

    const outcomes = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'outcome',
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, 500),
      }),
    []);

    if (outcomes.length === 0) return [];

    // Group by resourceType + outcome (parsed from tags)
    const groups = new Map<string, { total: number; items: typeof outcomes }>();

    for (const mem of outcomes) {
      const tags = parseTags(mem.tags);
      const resourceType = tags.find((t) => t === 'task' || t === 'agent_run' || t === 'plan') || 'unknown';
      const outcomeTag = tags.find((t) => t === 'success' || t === 'failure' || t === 'partial') || 'unknown';
      const key = `${resourceType}:${outcomeTag}`;
      const group = groups.get(key) || { total: 0, items: [] as typeof outcomes };
      group.total++;
      group.items.push(mem);
      groups.set(key, group);
    }

    const insights: Insight[] = [];

    // Compute totals per resource type
    const resourceTotals = new Map<string, number>();
    for (const [key, group] of groups) {
      const resourceType = key.split(':')[0];
      resourceTotals.set(resourceType, (resourceTotals.get(resourceType) || 0) + group.total);
    }

    // Identify patterns
    for (const [key, group] of groups) {
      const [resourceType, outcome] = key.split(':');
      const total = resourceTotals.get(resourceType) || 0;
      if (total < 3) continue; // need at least 3 samples for a pattern

      const rate = group.total / total;

      if (outcome === 'failure' && rate >= 0.5) {
        insights.push({
          insight: `${resourceType}s have a ${Math.round(rate * 100)}% failure rate`,
          confidence: Math.min(0.95, 0.5 + rate * 0.4),
          evidence: group.items.slice(0, 5).map((m) => m.content.slice(0, 200)),
          recommendation: `Investigate common failure causes for ${resourceType}s and add verification steps before execution.`,
        });
      } else if (outcome === 'success' && rate >= 0.7) {
        insights.push({
          insight: `${resourceType}s have a ${Math.round(rate * 100)}% success rate`,
          confidence: Math.min(0.95, 0.5 + rate * 0.4),
          evidence: group.items.slice(0, 5).map((m) => m.content.slice(0, 200)),
          recommendation: `Replicate successful ${resourceType} patterns in future planning. Boost priority of similar tasks.`,
        });
      } else if (outcome === 'partial' && rate >= 0.4) {
        insights.push({
          insight: `${resourceType}s have a ${Math.round(rate * 100)}% partial-completion rate`,
          confidence: Math.min(0.9, 0.4 + rate * 0.3),
          evidence: group.items.slice(0, 5).map((m) => m.content.slice(0, 200)),
          recommendation: `Break down ${resourceType}s into smaller, more verifiable sub-tasks to reduce partial outcomes.`,
        });
      }
    }

    // Sort by confidence descending
    insights.sort((a, b) => b.confidence - a.confidence);

    return insights;
  },

  /**
   * Update a plan based on learning from task outcomes.
   * Marks plan at_risk if success rate < 50%, completed if all tasks succeeded.
   */
  async updatePlanFromLearning(workspaceId: string, planId: string) {
    const plan = await safePrisma(() =>
      prisma.plan.findUnique({
        where: { id: planId },
      }),
    null);

    if (!plan) return null;

    // Get tasks for this plan
    const tasks = await safePrisma(() =>
      prisma.task.findMany({
        where: { planId },
      }),
    []);

    if (tasks.length === 0) return plan;

    // Get outcome memories for these tasks
    const taskIds = tasks.map((t) => t.id);
    const outcomes = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'outcome',
          sourceId: { in: taskIds },
        },
      }),
    []);

    const successCount = outcomes.filter((m) => {
      const tags = parseTags(m.tags);
      return tags.includes('success');
    }).length;
    const failureCount = outcomes.filter((m) => {
      const tags = parseTags(m.tags);
      return tags.includes('failure');
    }).length;

    const evaluatedCount = outcomes.length;
    const successRate = evaluatedCount > 0 ? successCount / evaluatedCount : 0;

    let newStatus = plan.status;
    let adjustmentTasksCreated = 0;

    if (evaluatedCount === tasks.length && successCount === tasks.length) {
      // All tasks succeeded
      newStatus = 'completed';
    } else if (evaluatedCount > 0 && successRate < 0.5) {
      // Success rate below 50% — mark at risk
      newStatus = 'at_risk';

      // Create adjustment tasks for failed tasks
      const failedTaskIds = outcomes
        .filter((m) => parseTags(m.tags).includes('failure'))
        .map((m) => m.sourceId)
        .filter(Boolean) as string[];

      for (const failedId of failedTaskIds) {
        const failedTask = tasks.find((t) => t.id === failedId);
        if (!failedTask) continue;

        // Check if an adjustment task already exists
        const existing = await safePrisma(() =>
          prisma.task.findFirst({
            where: {
              planId,
              parentTaskId: failedId,
              title: { contains: 'Adjustment' },
            },
          }),
        null);

        if (existing) continue;

        await prisma.task.create({
          data: {
            projectId: failedTask.projectId,
            title: `Adjustment: ${failedTask.title.slice(0, 250)}`,
            description: `Auto-generated adjustment task for failed task ${failedTask.id}. Review and rework the approach based on learning.`,
            priority: 'high',
            riskLevel: 'medium',
            planId,
            parentTaskId: failedId,
            status: 'todo',
          },
        }).catch(() => null);
        adjustmentTasksCreated++;
      }
    }

    // Update plan status if changed
    if (newStatus !== plan.status) {
      await prisma.plan.update({
        where: { id: planId },
        data: { status: newStatus },
      }).catch(() => null);
    }

    // Record adjustment rationale memory
    await MemoryService.create({
      workspaceId,
      organizationId: plan.organizationId,
      type: 'lesson',
      content: `Plan "${plan.title}" updated to ${newStatus}. Success rate: ${Math.round(successRate * 100)}% (${successCount}/${evaluatedCount}). ${adjustmentTasksCreated} adjustment tasks created.`,
      source: 'agent',
      sourceId: planId,
      confidence: 0.8,
      lifecycle: 'medium',
      tags: ['learning', 'plan_adjustment', newStatus],
      createdBy: 'learning-loop',
    }).catch(() => null);

    return { ...plan, status: newStatus, adjustmentTasksCreated };
  },

  /**
   * Re-prioritize tasks based on learning.
   * Boosts priority of tasks similar to previously successful tasks,
   * lowers priority of tasks similar to previously failed tasks.
   */
  async reprioritizeTasks(
    workspaceId: string,
    opts?: { take?: number },
  ): Promise<ReprioritizationSummary> {
    const take = opts?.take || 50;

    // Get tasks that are still pending/in-progress
    const tasks = await safePrisma(() =>
      prisma.task.findMany({
        where: {
          status: { in: ['todo', 'in_progress'] },
        },
        take: Math.min(take, 200),
      }),
    []);

    if (tasks.length === 0) {
      return { boosted: [], lowered: [], total: 0 };
    }

    // Get outcome memories to learn from
    const outcomes = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'outcome',
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);

    // Build keyword sets from successful and failed task titles
    const successKeywords = new Set<string>();
    const failureKeywords = new Set<string>();

    for (const mem of outcomes) {
      const tags = parseTags(mem.tags);
      const isTask = tags.includes('task');
      if (!isTask) continue;

      // The content contains the resource ID; we need to find the task
      // Extract keywords from the content
      const contentLower = mem.content.toLowerCase();
      const words = contentLower.split(/\s+/).filter((w) => w.length > 3);

      if (tags.includes('success')) {
        words.forEach((w) => successKeywords.add(w));
      } else if (tags.includes('failure')) {
        words.forEach((w) => failureKeywords.add(w));
      }
    }

    const boosted: ReprioritizationSummary['boosted'] = [];
    const lowered: ReprioritizationSummary['lowered'] = [];

    for (const task of tasks) {
      const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
      const successMatches = [...successKeywords].filter((kw) => taskText.includes(kw)).length;
      const failureMatches = [...failureKeywords].filter((kw) => taskText.includes(kw)).length;

      if (successMatches > failureMatches && successMatches > 0) {
        const newPriority = boostPriority(task.priority);
        if (newPriority !== task.priority) {
          await prisma.task.update({
            where: { id: task.id },
            data: { priority: newPriority },
          }).catch(() => null);
          boosted.push({
            taskId: task.id,
            title: task.title,
            oldPriority: task.priority,
            newPriority,
            reason: `Matches ${successMatches} success pattern keywords`,
          });
        }
      } else if (failureMatches > successMatches && failureMatches > 0) {
        const newPriority = lowerPriority(task.priority);
        if (newPriority !== task.priority) {
          await prisma.task.update({
            where: { id: task.id },
            data: { priority: newPriority },
          }).catch(() => null);
          lowered.push({
            taskId: task.id,
            title: task.title,
            oldPriority: task.priority,
            newPriority,
            reason: `Matches ${failureMatches} failure pattern keywords`,
          });
        }
      }
    }

    return {
      boosted,
      lowered,
      total: boosted.length + lowered.length,
    };
  },

  /**
   * Adjust goal targets based on KPI progress.
   * Suggests raising targets if significantly ahead, lowering or breaking down if behind.
   */
  async adjustGoalTargets(
    _workspaceId: string,
    organizationId: string,
    goalId: string,
  ): Promise<GoalAdjustmentRecommendation | null> {
    const goal = await safePrisma(() =>
      prisma.goal.findUnique({
        where: { id: goalId },
        include: { kpis: true },
      }),
    null);

    if (!goal) return null;

    const kpis = goal.kpis;
    if (kpis.length === 0) {
      return {
        goalId: goal.id,
        goalTitle: goal.title,
        action: 'no_change',
        reason: 'No KPIs defined for this goal — cannot assess progress.',
        kpis: [],
      };
    }

    // Compute average progress across KPIs
    const kpiProgress = kpis.map((k) => {
      const target = k.target || 0;
      const current = k.current || 0;
      const progress = target > 0 ? current / target : 0;
      return { name: k.name, current, target, progress, direction: k.direction };
    });

    const avgProgress = kpiProgress.reduce((sum, k) => sum + k.progress, 0) / kpiProgress.length;

    let action: GoalAdjustmentRecommendation['action'] = 'no_change';
    let reason = 'Progress is on track.';
    let suggestedTarget: number | undefined;

    if (avgProgress >= 1.2) {
      // Significantly ahead (>120% of target)
      action = 'raise_target';
      const avgTarget = kpis.reduce((sum, k) => sum + (k.target || 0), 0) / kpis.length;
      suggestedTarget = Math.round(avgTarget * 1.3);
      reason = `Goal is at ${Math.round(avgProgress * 100)}% of target — significantly ahead. Consider raising targets by ~30%.`;
    } else if (avgProgress < 0.5 && goal.status === 'active') {
      // Significantly behind (<50% of target)
      action = avgProgress < 0.25 ? 'break_down' : 'lower_target';
      const avgTarget = kpis.reduce((sum, k) => sum + (k.target || 0), 0) / kpis.length;
      suggestedTarget = Math.round(avgTarget * 0.7);
      reason = avgProgress < 0.25
        ? `Goal is at only ${Math.round(avgProgress * 100)}% of target — consider breaking it into smaller sub-goals.`
        : `Goal is at ${Math.round(avgProgress * 100)}% of target — consider lowering targets to maintain momentum.`;
    }

    // Record a memory with the suggestion
    await MemoryService.create({
      workspaceId: goal.workspaceId || organizationId,
      organizationId,
      type: 'lesson',
      content: `Goal adjustment recommendation for "${goal.title}": ${action}. ${reason}`,
      source: 'agent',
      sourceId: goalId,
      confidence: 0.75,
      lifecycle: 'medium',
      tags: ['learning', 'goal_adjustment', action],
      createdBy: 'learning-loop',
    }).catch(() => null);

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      action,
      reason,
      suggestedTarget,
      kpis: kpiProgress.map((k) => ({
        name: k.name,
        current: k.current,
        target: k.target,
        progress: k.progress,
      })),
    };
  },

  /**
   * Run a full learning cycle.
   * 1. Evaluate unevaluated completed tasks
   * 2. Extract insights
   * 3. Update at-risk plans
   * 4. Reprioritize tasks
   * 5. Adjust goal targets
   * 6. Record summary memory
   * 7. Emit cycle-completed event
   */
  async runLearningCycle(
    workspaceId: string,
    organizationId: string,
  ): Promise<CycleSummary> {
    const correlationId = `learning-cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Evaluate unevaluated completed tasks
    const completedTasks = await safePrisma(() =>
      prisma.task.findMany({
        where: {
          status: { in: ['done', 'failed', 'verified'] },
        },
        take: 50,
      }),
    []);

    let evaluated = 0;
    for (const task of completedTasks) {
      // Check if an outcome memory already exists for this task
      const existing = await safePrisma(() =>
        prisma.memory.findFirst({
          where: {
            workspaceId,
            type: 'outcome',
            sourceId: task.id,
          },
        }),
      null);

      if (existing) continue;

      const outcome: Outcome = task.status === 'done' || task.status === 'verified' ? 'success' : 'failure';
      await this.evaluateOutcome(workspaceId, organizationId, {
        resourceType: 'task',
        resourceId: task.id,
        outcome,
        notes: `Auto-evaluated from task status: ${task.status}`,
      });
      evaluated++;
    }

    // 2. Extract insights
    const insights = await this.extractInsights(workspaceId, organizationId);

    // 3. Update at-risk plans
    const activePlans = await safePrisma(() =>
      prisma.plan.findMany({
        where: {
          workspaceId,
          status: { in: ['active', 'at_risk'] },
        },
        take: 20,
      }),
    []);

    let plansUpdated = 0;
    for (const plan of activePlans) {
      const result = await this.updatePlanFromLearning(workspaceId, plan.id);
      if (result && (result as { status: string }).status !== plan.status) {
        plansUpdated++;
      }
    }

    // 4. Reprioritize tasks
    const reprioritization = await this.reprioritizeTasks(workspaceId);
    const tasksReprioritized = reprioritization.total;

    // 5. Adjust goal targets
    const goals = await safePrisma(() =>
      prisma.goal.findMany({
        where: {
          organizationId,
          status: 'active',
        },
        take: 20,
      }),
    []);

    let goalsAdjusted = 0;
    for (const goal of goals) {
      const rec = await this.adjustGoalTargets(workspaceId, organizationId, goal.id);
      if (rec && rec.action !== 'no_change') {
        goalsAdjusted++;
      }
    }

    // 6. Record summary memory
    await MemoryService.create({
      workspaceId,
      organizationId,
      type: 'lesson',
      content: `Learning cycle completed: ${evaluated} outcomes evaluated, ${insights.length} insights extracted, ${plansUpdated} plans updated, ${tasksReprioritized} tasks reprioritized, ${goalsAdjusted} goals adjusted.`,
      source: 'agent',
      confidence: 0.85,
      lifecycle: 'long',
      tags: ['learning', 'cycle_summary'],
      createdBy: 'learning-loop',
    }).catch(() => null);

    // 7. Emit cycle-completed event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'learning.cycle_completed',
      actorType: 'agent',
      actor: 'learning-loop',
      metadata: {
        evaluated,
        insights: insights.length,
        plansUpdated,
        tasksReprioritized,
        goalsAdjusted,
      },
      correlationId,
    }).catch(() => null);

    return {
      evaluated,
      insights,
      plansUpdated,
      tasksReprioritized,
      goalsAdjusted,
    };
  },

  /**
   * Get dashboard data for the learning loop.
   */
  async getLearningDashboard(
    workspaceId: string,
    organizationId: string,
  ): Promise<LearningDashboardData> {
    // Recent outcomes
    const recentOutcomes = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'outcome',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    []);

    // Top insights
    const topInsights = await this.extractInsights(workspaceId, organizationId, { take: 100 });

    // At-risk plans
    const atRiskPlans = await safePrisma(() =>
      prisma.plan.findMany({
        where: {
          workspaceId,
          status: 'at_risk',
        },
        take: 10,
      }),
    []);

    // Cycle history (lesson memories with cycle_summary tag)
    const cycleHistory = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'lesson',
          tags: { contains: 'cycle_summary' },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    []);

    // Recommendations from insights
    const recommendations = topInsights.slice(0, 5).map((i) => ({
      insight: i.insight,
      recommendation: i.recommendation,
      confidence: i.confidence,
    }));

    // Stats
    const totalOutcomes = recentOutcomes.length;
    const successCount = recentOutcomes.filter((m) => parseTags(m.tags).includes('success')).length;
    const successRate = totalOutcomes > 0 ? successCount / totalOutcomes : 0;
    const lastCycleAt = cycleHistory.length > 0 ? cycleHistory[0].createdAt : null;

    return {
      recentOutcomes: recentOutcomes.map((m) => ({
        id: m.id,
        content: m.content,
        source: m.source,
        createdAt: m.createdAt,
        confidence: m.confidence,
      })),
      topInsights,
      atRiskPlans: atRiskPlans.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        objective: p.objective,
      })),
      cycleHistory: cycleHistory.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
      })),
      recommendations,
      stats: {
        totalOutcomes,
        successRate,
        lastCycleAt,
      },
    };
  },

  /**
   * Get the history of learning cycles.
   */
  async getLearningHistory(workspaceId: string, limit: number = 20) {
    const take = Math.min(limit, 100);
    return safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'lesson',
          tags: { contains: 'cycle_summary' },
        },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    []);
  },

  /**
   * Get current learning-based recommendations.
   */
  async getRecommendations(
    workspaceId: string,
    organizationId: string,
  ): Promise<Array<{ insight: string; recommendation: string; confidence: number }>> {
    const insights = await this.extractInsights(workspaceId, organizationId);
    return insights.slice(0, 10).map((i) => ({
      insight: i.insight,
      recommendation: i.recommendation,
      confidence: i.confidence,
    }));
  },
};
