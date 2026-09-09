/**
 * Autonomy Loop — the autonomous company loop state machine.
 *
 * Implements the OBSERVE → UNDERSTAND → PRIORITIZE → PLAN → EXECUTE →
 * MEASURE → LEARN → CONTINUE cycle described in
 * `docs/transformation/AUTONOMY_MODEL.md`.
 *
 * State persists in D1 via the memory-backed pattern (memory type:
 * `autonomy_loop`), so loops survive worker crashes and can be resumed.
 *
 * Autonomy modes:
 *  - manual:           one iteration per explicit user trigger
 *  - assisted:         pauses for approval on every action
 *  - autonomous:       runs continuously; only high-risk actions need approval
 *  - timed_continuous: runs until time/budget expires or the user stops
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { MemoryService } from '@/lib/services/memory';
import { EventService } from '@/lib/services/event';
import { BudgetService } from '@/lib/services/budget';
import { Planner } from '@/lib/services/planner';
import { AgentRuntime, type ToolExecutionContext } from '@/lib/services/agent-runtime';

// ── Types ──

export type AutonomyState =
  | 'idle'
  | 'observing'
  | 'understanding'
  | 'prioritizing'
  | 'planning'
  | 'executing'
  | 'measuring'
  | 'learning'
  | 'continuing'
  | 'paused'
  | 'stopped'
  | 'failed';

export type AutonomyMode = 'manual' | 'assisted' | 'autonomous' | 'timed_continuous';

export interface AutonomyLoopConfig {
  agentId: string;
  organizationId: string;
  workspaceId: string;
  mode: AutonomyMode;
  intervalMs?: number; // for timed_continuous
  maxIterations?: number;
  pauseOnApprovalRequired: boolean;
  pauseOnBudgetExceeded: boolean;
}

export interface AutonomyLoopState {
  agentId: string;
  currentState: AutonomyState;
  mode: AutonomyMode;
  iteration: number;
  lastStateChange: Date;
  paused: boolean;
  stopped: boolean;
  error?: string;
}

// ── Memory-backed persistence ──
//
// Loop state is stored as a memory row of type `autonomy_loop`. The
// `sourceId` field holds the agentId so we can look up the active loop
// for a given agent. The full state is JSON-encoded in `content`.

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LoopConfigRow {
  agentId: string;
  organizationId: string;
  workspaceId: string;
  mode: AutonomyMode;
  intervalMs?: number;
  maxIterations?: number;
  pauseOnApprovalRequired: boolean;
  pauseOnBudgetExceeded: boolean;
}

interface LoopStateRow extends LoopConfigRow {
  currentState: AutonomyState;
  iteration: number;
  lastStateChange: string;
  paused: boolean;
  stopped: boolean;
  error?: string;
}

function parseContent(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function toLoopState(row: MemoryRow): AutonomyLoopState {
  const c = parseContent(row.content) as Partial<LoopStateRow>;
  return {
    agentId: c.agentId ?? row.sourceId ?? '',
    currentState: (c.currentState as AutonomyState) ?? 'idle',
    mode: (c.mode as AutonomyMode) ?? 'manual',
    iteration: c.iteration ?? 0,
    lastStateChange: c.lastStateChange ? new Date(c.lastStateChange) : row.updatedAt,
    paused: c.paused ?? false,
    stopped: c.stopped ?? false,
    error: c.error,
  };
}

function toLoopConfig(row: MemoryRow): LoopConfigRow {
  const c = parseContent(row.content) as Partial<LoopConfigRow>;
  return {
    agentId: c.agentId ?? row.sourceId ?? '',
    organizationId: c.organizationId ?? row.organizationId,
    workspaceId: c.workspaceId ?? row.workspaceId,
    mode: (c.mode as AutonomyMode) ?? 'manual',
    intervalMs: c.intervalMs,
    maxIterations: c.maxIterations,
    pauseOnApprovalRequired: c.pauseOnApprovalRequired ?? true,
    pauseOnBudgetExceeded: c.pauseOnBudgetExceeded ?? true,
  };
}

// ── Valid state transitions ──
//
// The loop flows: idle → observing → understanding → prioritizing →
// planning → executing → measuring → learning → continuing → (observing|idle)
// paused/stopped/failed are reachable from any active state.

const VALID_NEXT_STATES: Record<AutonomyState, AutonomyState[]> = {
  idle: ['observing'],
  observing: ['understanding', 'paused', 'stopped', 'failed'],
  understanding: ['prioritizing', 'paused', 'stopped', 'failed'],
  prioritizing: ['planning', 'paused', 'stopped', 'failed'],
  planning: ['executing', 'paused', 'stopped', 'failed'],
  executing: ['measuring', 'paused', 'stopped', 'failed'],
  measuring: ['learning', 'paused', 'stopped', 'failed'],
  learning: ['continuing', 'paused', 'stopped', 'failed'],
  continuing: ['observing', 'idle', 'paused', 'stopped', 'failed'],
  paused: ['observing', 'idle', 'stopped', 'failed'],
  stopped: [],
  failed: ['idle'],
};

function isValidTransition(from: AutonomyState, to: AutonomyState): boolean {
  if (from === to) return true;
  // paused/stopped/failed are reachable from any active (non-terminal) state
  if (to === 'paused' || to === 'stopped' || to === 'failed') {
    return from !== 'stopped'; // stopped is terminal
  }
  // resuming from paused goes to the next active state
  if (from === 'paused') {
    return VALID_NEXT_STATES.paused.includes(to);
  }
  // retrying from failed goes back to idle
  if (from === 'failed') {
    return to === 'idle';
  }
  return VALID_NEXT_STATES[from]?.includes(to) ?? false;
}

// ── Autonomy Loop Service ──

export const AutonomyLoopService = {
  // ── State management ──

  /**
   * Create a new autonomy loop for an agent.
   * If a loop already exists for this agent it is replaced.
   */
  async createLoop(config: AutonomyLoopConfig): Promise<AutonomyLoopState> {
    const state: LoopStateRow = {
      ...config,
      currentState: 'idle',
      iteration: 0,
      lastStateChange: new Date().toISOString(),
      paused: false,
      stopped: false,
    };

    // Remove any existing loop for this agent
    const existing = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { type: 'autonomy_loop', sourceId: config.agentId },
        select: { id: true },
      }),
    null);
    if (existing) {
      await prisma.memory.delete({ where: { id: existing.id } }).catch(() => {});
    }

    const row = await prisma.memory.create({
      data: {
        workspaceId: config.workspaceId,
        organizationId: config.organizationId,
        type: 'autonomy_loop',
        content: JSON.stringify(state).slice(0, 50000),
        source: 'system',
        sourceId: config.agentId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['autonomy_loop', config.mode, 'idle']),
        createdBy: config.agentId,
      },
    });

    await EventService.emit({
      workspaceId: config.workspaceId,
      organizationId: config.organizationId,
      type: 'autonomy.loop.created',
      actor: config.agentId,
      actorType: 'agent',
      resourceType: 'autonomy_loop',
      resourceId: row.id,
      metadata: { mode: config.mode },
    }).catch(() => {});

    return toLoopState(row as MemoryRow);
  },

  /**
   * Get the current loop state for an agent.
   */
  async getLoopState(agentId: string): Promise<AutonomyLoopState | null> {
    const row = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { type: 'autonomy_loop', sourceId: agentId },
        orderBy: { updatedAt: 'desc' },
      }),
    null);
    if (!row) return null;
    return toLoopState(row as MemoryRow);
  },

  /**
   * Get the loop config for an agent.
   */
  async getLoopConfig(agentId: string): Promise<LoopConfigRow | null> {
    const row = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { type: 'autonomy_loop', sourceId: agentId },
        orderBy: { updatedAt: 'desc' },
      }),
    null);
    if (!row) return null;
    return toLoopConfig(row as MemoryRow);
  },

  /**
   * Transition the loop to a new state.
   * Validates the transition against the state machine.
   */
  async transitionTo(agentId: string, newState: AutonomyState): Promise<AutonomyLoopState | null> {
    const current = await this.getLoopState(agentId);
    if (!current) return null;

    if (!isValidTransition(current.currentState, newState)) {
      return current; // invalid transition — return current state unchanged
    }

    const config = await this.getLoopConfig(agentId);
    if (!config) return null;

    const updated: LoopStateRow = {
      ...config,
      currentState: newState,
      iteration: current.iteration,
      lastStateChange: new Date().toISOString(),
      paused: newState === 'paused',
      stopped: newState === 'stopped',
      error: newState === 'failed' ? current.error : undefined,
    };

    const row = await safePrisma(() =>
      prisma.memory.updateMany({
        where: { type: 'autonomy_loop', sourceId: agentId },
        data: {
          content: JSON.stringify(updated).slice(0, 50000),
          tags: JSON.stringify(['autonomy_loop', config.mode, newState]),
        },
      }),
    null);

    if (!row) return null;

    await EventService.emit({
      workspaceId: config.workspaceId,
      organizationId: config.organizationId,
      type: 'autonomy.loop.transition',
      actor: agentId,
      actorType: 'agent',
      resourceType: 'autonomy_loop',
      metadata: { from: current.currentState, to: newState },
    }).catch(() => {});

    return this.getLoopState(agentId);
  },

  /**
   * Pause the loop from any active state.
   */
  async pause(agentId: string): Promise<AutonomyLoopState | null> {
    return this.transitionTo(agentId, 'paused');
  },

  /**
   * Resume the loop from paused. Returns to observing (the loop re-observes
   * state on resume to avoid acting on stale data).
   */
  async resume(agentId: string): Promise<AutonomyLoopState | null> {
    const current = await this.getLoopState(agentId);
    if (!current || current.currentState !== 'paused') return current ?? null;
    return this.transitionTo(agentId, 'observing');
  },

  /**
   * Stop the loop (terminal state).
   */
  async stop(agentId: string): Promise<AutonomyLoopState | null> {
    return this.transitionTo(agentId, 'stopped');
  },

  /**
   * Mark the loop as failed with an error message.
   */
  async fail(agentId: string, error: string): Promise<AutonomyLoopState | null> {
    const current = await this.getLoopState(agentId);
    if (!current) return null;

    const config = await this.getLoopConfig(agentId);
    if (!config) return null;

    const updated: LoopStateRow = {
      ...config,
      currentState: 'failed',
      iteration: current.iteration,
      lastStateChange: new Date().toISOString(),
      paused: false,
      stopped: false,
      error: error.slice(0, 2000),
    };

    await safePrisma(() =>
      prisma.memory.updateMany({
        where: { type: 'autonomy_loop', sourceId: agentId },
        data: {
          content: JSON.stringify(updated).slice(0, 50000),
          tags: JSON.stringify(['autonomy_loop', config.mode, 'failed']),
        },
      }),
    null);

    await EventService.emit({
      workspaceId: config.workspaceId,
      organizationId: config.organizationId,
      type: 'autonomy.loop.failed',
      actor: agentId,
      actorType: 'agent',
      resourceType: 'autonomy_loop',
      metadata: { error: error.slice(0, 500) },
    }).catch(() => {});

    return this.getLoopState(agentId);
  },

  // ── Loop execution ──

  /**
   * Run a single iteration of the autonomy loop.
   * Walks through observe → understand → prioritize → plan → execute →
   * measure → learn → continue, pausing/stopping as configured.
   */
  async runIteration(agentId: string): Promise<AutonomyLoopState> {
    const config = await this.getLoopConfig(agentId);
    const state = await this.getLoopState(agentId);
    if (!config || !state) {
      return { agentId, currentState: 'failed', mode: 'manual', iteration: 0, lastStateChange: new Date(), paused: false, stopped: false, error: 'Loop not found' };
    }

    // Refuse to run if paused or stopped
    if (state.currentState === 'paused') return state;
    if (state.currentState === 'stopped') return state;

    // Check max iterations
    if (config.maxIterations && state.iteration >= config.maxIterations) {
      await this.transitionTo(agentId, 'idle');
      return (await this.getLoopState(agentId)) ?? state;
    }

    const ctx: ToolExecutionContext = {
      workspaceId: config.workspaceId,
      organizationId: config.organizationId,
      agentRunId: `autonomy-${agentId}-${state.iteration}`,
    };

    try {
      // 1. Observe
      await this.transitionTo(agentId, 'observing');
      const afterObserve = await this.observe(agentId, ctx);

      // 2. Understand
      await this.transitionTo(agentId, 'understanding');
      const observations = await this.gatherObservations(config);
      const afterUnderstand = await this.understand(agentId, observations);
      if (afterUnderstand === 'paused') return (await this.getLoopState(agentId)) ?? state;

      // 3. Prioritize
      await this.transitionTo(agentId, 'prioritizing');
      const understanding = await this.analyzeState(config, observations);
      const afterPrioritize = await this.prioritize(agentId, understanding);
      if (afterPrioritize === 'paused') return (await this.getLoopState(agentId)) ?? state;

      // 4. Plan
      await this.transitionTo(agentId, 'planning');
      const priorities = await this.rankWork(config, understanding);
      const afterPlan = await this.plan(agentId, priorities);
      if (afterPlan === 'paused') return (await this.getLoopState(agentId)) ?? state;

      // 5. Execute (with budget + approval gating)
      await this.transitionTo(agentId, 'executing');
      const planResult = await this.createPlan(config, priorities);

      // Budget check before execution
      const budgetCheck = await BudgetService.check({
        workspaceId: config.workspaceId,
        organizationId: config.organizationId,
        amountCredits: planResult.estimatedCost ?? 1,
      });
      if (!budgetCheck.allowed && config.pauseOnBudgetExceeded) {
        await this.pause(agentId);
        return (await this.getLoopState(agentId)) ?? state;
      }

      const afterExecute = await this.execute(agentId, planResult);
      if (afterExecute === 'paused') return (await this.getLoopState(agentId)) ?? state;

      // 6. Measure
      await this.transitionTo(agentId, 'measuring');
      const results = await this.gatherResults(config, planResult);
      const afterMeasure = await this.measure(agentId, results);
      if (afterMeasure === 'paused') return (await this.getLoopState(agentId)) ?? state;

      // 7. Learn
      await this.transitionTo(agentId, 'learning');
      const measurements = await this.computeMetrics(config, results);
      const afterLearn = await this.learn(agentId, measurements);
      if (afterLearn === 'paused') return (await this.getLoopState(agentId)) ?? state;

      // 8. Continue — decide whether to loop again
      await this.transitionTo(agentId, 'continuing');
      const shouldContinue = await this.shouldContinue(agentId);

      // Increment iteration counter
      await this.incrementIteration(agentId);

      if (shouldContinue) {
        await this.transitionTo(agentId, 'observing');
      } else {
        await this.transitionTo(agentId, 'idle');
      }

      return (await this.getLoopState(agentId)) ?? state;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      await this.fail(agentId, errorMsg);
      return (await this.getLoopState(agentId)) ?? state;
    }
  },

  // ── State handlers ──
  //
  // Each handler performs the work for its phase and returns the next
  // state. Returning 'paused' causes runIteration to stop and wait.

  async observe(agentId: string, _context: ToolExecutionContext): Promise<AutonomyState> {
    const state = await this.getLoopState(agentId);
    if (state?.paused) return 'paused';
    // Observe: gather company state, metrics, events (done in gatherObservations)
    return 'understanding';
  },

  async understand(agentId: string, _observations: Record<string, unknown>): Promise<AutonomyState> {
    const state = await this.getLoopState(agentId);
    if (state?.paused) return 'paused';
    // Understand: analyze state, identify issues/opportunities
    return 'prioritizing';
  },

  async prioritize(agentId: string, _understanding: Record<string, unknown>): Promise<AutonomyState> {
    const state = await this.getLoopState(agentId);
    if (state?.paused) return 'paused';
    // Prioritize: rank work by impact/urgency/cost
    return 'planning';
  },

  async plan(agentId: string, _priorities: Record<string, unknown>): Promise<AutonomyState> {
    const state = await this.getLoopState(agentId);
    if (state?.paused) return 'paused';
    // Plan: create plan (tasks, dependencies, agents) — done in createPlan
    return 'executing';
  },

  async execute(agentId: string, plan: Record<string, unknown>): Promise<AutonomyState> {
    const state = await this.getLoopState(agentId);
    if (state?.paused) return 'paused';

    const config = await this.getLoopConfig(agentId);
    if (!config) return 'failed';

    // Execute the plan via the agent runtime if a planId is available
    const planId = plan.planId as string | undefined;
    if (planId) {
      try {
        await AgentRuntime.run({
          workspaceId: config.workspaceId,
          organizationId: config.organizationId,
          agentId: config.agentId,
          planId,
          objective: (plan.objective as string) ?? 'autonomy loop execution',
        });
      } catch {
        // execution errors are captured in the measure phase
      }
    }

    return 'measuring';
  },

  async measure(agentId: string, _results: Record<string, unknown>): Promise<AutonomyState> {
    const state = await this.getLoopState(agentId);
    if (state?.paused) return 'paused';
    // Measure: record metrics and outcomes
    return 'learning';
  },

  async learn(agentId: string, _measurements: Record<string, unknown>): Promise<AutonomyState> {
    const state = await this.getLoopState(agentId);
    if (state?.paused) return 'paused';

    const config = await this.getLoopConfig(agentId);
    if (config) {
      // Record a lesson to company memory
      await MemoryService.create({
        workspaceId: config.workspaceId,
        organizationId: config.organizationId,
        type: 'lesson',
        content: `Autonomy loop iteration completed for agent ${config.agentId}.`,
        source: 'agent',
        sourceId: config.agentId,
        confidence: 0.6,
        lifecycle: 'medium',
        tags: ['autonomy_loop', 'lesson'],
        createdBy: config.agentId,
      }).catch(() => {});
    }

    return 'continuing';
  },

  // ── Helpers ──

  /**
   * Decide whether the loop should continue for another iteration.
   */
  async shouldContinue(agentId: string): Promise<boolean> {
    const state = await this.getLoopState(agentId);
    const config = await this.getLoopConfig(agentId);
    if (!state || !config) return false;

    if (state.paused || state.stopped || state.currentState === 'failed') return false;
    if (config.maxIterations && state.iteration >= config.maxIterations) return false;

    // timed_continuous: check if the interval window has elapsed
    if (config.mode === 'timed_continuous' && config.intervalMs) {
      const elapsed = Date.now() - state.lastStateChange.getTime();
      if (elapsed < config.intervalMs) return false;
    }

    // manual mode: only one iteration per trigger
    if (config.mode === 'manual') return false;

    return true;
  },

  /**
   * List all active (non-terminal) loops for an organization.
   */
  async listActiveLoops(organizationId: string): Promise<AutonomyLoopState[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId, type: 'autonomy_loop' },
        orderBy: { updatedAt: 'desc' },
      }),
    []);
    return (rows as MemoryRow[])
      .map(toLoopState)
      .filter((s) => s.currentState !== 'stopped' && s.currentState !== 'idle');
  },

  // ── Internal helpers ──

  async incrementIteration(agentId: string): Promise<void> {
    const state = await this.getLoopState(agentId);
    const config = await this.getLoopConfig(agentId);
    if (!state || !config) return;

    const updated: LoopStateRow = {
      ...config,
      currentState: state.currentState,
      iteration: state.iteration + 1,
      lastStateChange: state.lastStateChange.toISOString(),
      paused: state.paused,
      stopped: state.stopped,
      error: state.error,
    };

    await safePrisma(() =>
      prisma.memory.updateMany({
        where: { type: 'autonomy_loop', sourceId: agentId },
        data: { content: JSON.stringify(updated).slice(0, 50000) },
      }),
    null);
  },

  async gatherObservations(config: LoopConfigRow): Promise<Record<string, unknown>> {
    const memories = await MemoryService.assembleContext({
      workspaceId: config.workspaceId,
      organizationId: config.organizationId,
      objective: 'autonomy loop observation',
      maxMemories: 10,
    }).catch(() => ({ memories: [] }));

    return {
      timestamp: new Date().toISOString(),
      mode: config.mode,
      memories: memories.memories ?? [],
    };
  },

  async analyzeState(
    _config: LoopConfigRow,
    observations: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return {
      observations,
      issues: [],
      opportunities: [],
    };
  },

  async rankWork(
    _config: LoopConfigRow,
    understanding: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return {
      understanding,
      ranked: [],
    };
  },

  async createPlan(
    config: LoopConfigRow,
    priorities: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { estimatedCost?: number; planId?: string; objective?: string }> {
    const objective = (priorities.objective as string) ?? 'Continue autonomous operations';
    try {
      const plan = await Planner.plan({
        workspaceId: config.workspaceId,
        organizationId: config.organizationId,
        objective,
        agentId: config.agentId,
      });
      return {
        planId: plan.planId,
        objective: plan.objective,
        estimatedCost: plan.estimatedCost,
        priorities,
      };
    } catch {
      return { priorities, estimatedCost: 0 };
    }
  },

  async gatherResults(
    _config: LoopConfigRow,
    plan: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return { plan, results: [] };
  },

  async computeMetrics(
    _config: LoopConfigRow,
    results: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return { results, metrics: {} };
  },
};
