import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── In-memory store for autonomy_loop rows (keyed by agentId / sourceId) ──

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

const store = new Map<string, MemoryRow>();
let nextId = 0;

type FindFirstArgs = { where: Record<string, unknown>; select?: unknown; orderBy?: unknown };
type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type CreateArgs = { data: Record<string, unknown> };
type UpdateManyArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };

let memFindFirstImpl: (args: FindFirstArgs) => Promise<unknown> = async () => null;
let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateManyImpl: (args: UpdateManyArgs) => Promise<unknown> = async () => ({ count: 0 });
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  memory: {
    findFirst: (args: FindFirstArgs): Promise<unknown> => { calls.push({ method: 'memory.findFirst', args }); return memFindFirstImpl(args); },
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    updateMany: (args: UpdateManyArgs): Promise<unknown> => { calls.push({ method: 'memory.updateMany', args }); return memUpdateManyImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

// ── Service mocks ──

mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      assembleContext: async (): Promise<unknown> => ({ memories: [], summary: '0 memories' }),
      create: async (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'MemoryService.create', args: input });
        return { id: 'mem-lesson-1', ...input };
      },
    },
  },
});

mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: async (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'EventService.emit', args: input });
        return { id: 'evt-1' };
      },
    },
  },
});

let budgetCheckImpl: (input: Record<string, unknown>) => Promise<unknown> = async () => ({ allowed: true, remainingCredits: 1000 });

mock.module('@/lib/services/budget', {
  namedExports: {
    BudgetService: {
      check: (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'BudgetService.check', args: input });
        return budgetCheckImpl(input);
      },
    },
  },
});

mock.module('@/lib/services/planner', {
  namedExports: {
    Planner: {
      plan: async (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'Planner.plan', args: input });
        return { planId: 'plan-1', objective: input.objective, estimatedCost: 1 };
      },
    },
  },
});

mock.module('@/lib/services/agent-runtime', {
  namedExports: {
    AgentRuntime: {
      run: async (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'AgentRuntime.run', args: input });
        return { status: 'completed', agentRunId: 'run-1' };
      },
    },
  },
});

// ── Store-backed mock implementations ──

function makeLoopRow(
  agentId: string,
  state: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): MemoryRow {
  const merged: Record<string, unknown> = {
    agentId,
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    mode: 'autonomous',
    pauseOnApprovalRequired: true,
    pauseOnBudgetExceeded: true,
    iteration: 0,
    lastStateChange: new Date().toISOString(),
    ...state,
  };
  const currentState = (merged.currentState as string) ?? 'idle';
  // Derive paused/stopped flags from the final currentState so shouldContinue
  // and state handlers see the correct boolean flags.
  merged.paused = merged.paused ?? (currentState === 'paused');
  merged.stopped = merged.stopped ?? (currentState === 'stopped');
  return {
    id: `mem-loop-${++nextId}`,
    workspaceId: merged.workspaceId as string,
    organizationId: merged.organizationId as string,
    type: 'autonomy_loop',
    content: JSON.stringify(merged),
    source: 'system',
    sourceId: agentId,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['autonomy_loop', merged.mode, currentState]),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: agentId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  store.clear();
  nextId = 0;
  budgetCheckImpl = async () => ({ allowed: true, remainingCredits: 1000 });
  memFindFirstImpl = async (args) => {
    const where = args.where as Record<string, unknown>;
    if (where.type === 'autonomy_loop' && where.sourceId) {
      return store.get(where.sourceId as string) ?? null;
    }
    return null;
  };
  memFindManyImpl = async (args) => {
    const where = args.where as Record<string, unknown>;
    const results: MemoryRow[] = [];
    for (const row of store.values()) {
      if (where.organizationId && row.organizationId !== where.organizationId) continue;
      if (where.type && row.type !== where.type) continue;
      results.push(row);
    }
    return results;
  };
  memCreateImpl = async (args) => {
    const data = args.data;
    const row: MemoryRow = {
      id: `mem-loop-${++nextId}`,
      workspaceId: data.workspaceId as string,
      organizationId: data.organizationId as string,
      type: data.type as string,
      content: data.content as string,
      source: (data.source as string) ?? 'system',
      sourceId: (data.sourceId as string) ?? null,
      confidence: (data.confidence as number) ?? 1.0,
      owner: (data.owner as string) ?? null,
      accessPolicy: (data.accessPolicy as string) ?? null,
      lifecycle: (data.lifecycle as string) ?? 'permanent',
      expiresAt: (data.expiresAt as Date) ?? null,
      tags: (data.tags as string) ?? null,
      relatedMemoryIds: null,
      verifiedBy: null,
      verifiedAt: null,
      createdBy: (data.createdBy as string) ?? 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (row.sourceId) store.set(row.sourceId, row);
    return row;
  };
  memUpdateManyImpl = async (args) => {
    const where = args.where as Record<string, unknown>;
    const data = args.data as Record<string, unknown>;
    if (where.type === 'autonomy_loop' && where.sourceId) {
      const row = store.get(where.sourceId as string);
      if (row) {
        if (data.content !== undefined) row.content = data.content as string;
        if (data.tags !== undefined) row.tags = data.tags as string;
        row.updatedAt = new Date();
        return { count: 1 };
      }
    }
    return { count: 0 };
  };
  memDeleteImpl = async (args) => {
    const where = args.where as Record<string, unknown>;
    for (const [agentId, row] of store) {
      if (row.id === where.id) {
        store.delete(agentId);
        return row;
      }
    }
    return null;
  };
}

const { AutonomyLoopService } = await import('@/lib/services/autonomy-loop');

function findCalls(method: string): CallRecord[] {
  return calls.filter((c) => c.method === method);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests — createLoop
// ─────────────────────────────────────────────────────────────────────────────

describe('AutonomyLoopService — createLoop', () => {
  beforeEach(() => resetMock());

  it('creates a new loop in the idle state', async () => {
    const state = await AutonomyLoopService.createLoop({
      agentId: 'agent-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      mode: 'autonomous',
      pauseOnApprovalRequired: true,
      pauseOnBudgetExceeded: true,
    });
    assert.equal(state.agentId, 'agent-1');
    assert.equal(state.currentState, 'idle');
    assert.equal(state.mode, 'autonomous');
    assert.equal(state.iteration, 0);
    assert.equal(state.paused, false);
    assert.equal(state.stopped, false);
  });

  it('emits a loop.created event', async () => {
    await AutonomyLoopService.createLoop({
      agentId: 'agent-2',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      mode: 'manual',
      pauseOnApprovalRequired: true,
      pauseOnBudgetExceeded: true,
    });
    const emitCalls = findCalls('EventService.emit');
    assert.ok(emitCalls.length >= 1);
    const evt = emitCalls[0].args as Record<string, unknown>;
    assert.equal(evt.type, 'autonomy.loop.created');
  });

  it('replaces an existing loop for the same agent', async () => {
    // Seed an existing loop
    store.set('agent-3', makeLoopRow('agent-3', { currentState: 'executing', iteration: 5 }));
    assert.ok(store.has('agent-3'));

    await AutonomyLoopService.createLoop({
      agentId: 'agent-3',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      mode: 'autonomous',
      pauseOnApprovalRequired: true,
      pauseOnBudgetExceeded: true,
    });
    // The new loop should be in idle
    const state = await AutonomyLoopService.getLoopState('agent-3');
    assert.ok(state);
    assert.equal(state!.currentState, 'idle');
    assert.equal(state!.iteration, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — getLoopState
// ─────────────────────────────────────────────────────────────────────────────

describe('AutonomyLoopService — getLoopState', () => {
  beforeEach(() => resetMock());

  it('returns the loop state for an agent', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'planning', iteration: 3 }));
    const state = await AutonomyLoopService.getLoopState('agent-1');
    assert.ok(state);
    assert.equal(state!.agentId, 'agent-1');
    assert.equal(state!.currentState, 'planning');
    assert.equal(state!.iteration, 3);
  });

  it('returns null when no loop exists', async () => {
    const state = await AutonomyLoopService.getLoopState('nope');
    assert.equal(state, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — transitionTo
// ─────────────────────────────────────────────────────────────────────────────

describe('AutonomyLoopService — transitionTo', () => {
  beforeEach(() => resetMock());

  it('transitions from idle to observing (valid)', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'idle' }));
    const state = await AutonomyLoopService.transitionTo('agent-1', 'observing');
    assert.ok(state);
    assert.equal(state!.currentState, 'observing');
  });

  it('returns current state unchanged for an invalid transition', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'idle' }));
    // idle → executing is not a valid transition
    const state = await AutonomyLoopService.transitionTo('agent-1', 'executing');
    assert.ok(state);
    assert.equal(state!.currentState, 'idle');
  });

  it('returns null when no loop exists', async () => {
    const state = await AutonomyLoopService.transitionTo('nope', 'observing');
    assert.equal(state, null);
  });

  it('emits a loop.transition event on a valid transition', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'idle' }));
    await AutonomyLoopService.transitionTo('agent-1', 'observing');
    const emitCalls = findCalls('EventService.emit');
    const transitionEvt = emitCalls.find((c) => {
      const args = c.args as Record<string, unknown>;
      return args.type === 'autonomy.loop.transition';
    });
    assert.ok(transitionEvt);
  });

  it('can transition to paused from any active state', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'executing' }));
    const state = await AutonomyLoopService.transitionTo('agent-1', 'paused');
    assert.ok(state);
    assert.equal(state!.currentState, 'paused');
    assert.equal(state!.paused, true);
  });

  it('can transition to stopped from any active state', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'executing' }));
    const state = await AutonomyLoopService.transitionTo('agent-1', 'stopped');
    assert.ok(state);
    assert.equal(state!.currentState, 'stopped');
    assert.equal(state!.stopped, true);
  });

  it('cannot transition from stopped (terminal)', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'stopped' }));
    const state = await AutonomyLoopService.transitionTo('agent-1', 'observing');
    assert.ok(state);
    assert.equal(state!.currentState, 'stopped');
  });

  it('can transition from failed back to idle', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'failed', error: 'boom' }));
    const state = await AutonomyLoopService.transitionTo('agent-1', 'idle');
    assert.ok(state);
    assert.equal(state!.currentState, 'idle');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — State machine transitions (full cycle)
// ─────────────────────────────────────────────────────────────────────────────

describe('AutonomyLoopService — state machine cycle', () => {
  beforeEach(() => resetMock());

  it('walks idle → observing → understanding → ... → continuing → idle', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'idle' }));

    const sequence: string[] = ['observing', 'understanding', 'prioritizing', 'planning', 'executing', 'measuring', 'learning', 'continuing'];

    for (const next of sequence) {
      const state = await AutonomyLoopService.transitionTo('agent-1', next as never);
      assert.ok(state);
      assert.equal(state!.currentState, next, `expected transition to ${next}`);
    }

    // continuing → idle is valid
    const finalState = await AutonomyLoopService.transitionTo('agent-1', 'idle');
    assert.ok(finalState);
    assert.equal(finalState!.currentState, 'idle');
  });

  it('walks continuing → observing (loop again)', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'continuing' }));
    const state = await AutonomyLoopService.transitionTo('agent-1', 'observing');
    assert.ok(state);
    assert.equal(state!.currentState, 'observing');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — pause / resume / stop / fail
// ─────────────────────────────────────────────────────────────────────────────

describe('AutonomyLoopService — pause', () => {
  beforeEach(() => resetMock());

  it('pauses an active loop', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'executing' }));
    const state = await AutonomyLoopService.pause('agent-1');
    assert.ok(state);
    assert.equal(state!.currentState, 'paused');
    assert.equal(state!.paused, true);
  });
});

describe('AutonomyLoopService — resume', () => {
  beforeEach(() => resetMock());

  it('resumes a paused loop to observing', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'paused' }));
    const state = await AutonomyLoopService.resume('agent-1');
    assert.ok(state);
    assert.equal(state!.currentState, 'observing');
    assert.equal(state!.paused, false);
  });

  it('does nothing when the loop is not paused', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'executing' }));
    const state = await AutonomyLoopService.resume('agent-1');
    assert.ok(state);
    assert.equal(state!.currentState, 'executing');
  });

  it('returns null when no loop exists', async () => {
    const state = await AutonomyLoopService.resume('nope');
    assert.equal(state, null);
  });
});

describe('AutonomyLoopService — stop', () => {
  beforeEach(() => resetMock());

  it('stops an active loop (terminal)', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'executing' }));
    const state = await AutonomyLoopService.stop('agent-1');
    assert.ok(state);
    assert.equal(state!.currentState, 'stopped');
    assert.equal(state!.stopped, true);
  });
});

describe('AutonomyLoopService — fail', () => {
  beforeEach(() => resetMock());

  it('marks the loop as failed with an error message', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'executing' }));
    const state = await AutonomyLoopService.fail('agent-1', 'Something went wrong');
    assert.ok(state);
    assert.equal(state!.currentState, 'failed');
    assert.equal(state!.error, 'Something went wrong');
  });

  it('emits a loop.failed event', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'executing' }));
    await AutonomyLoopService.fail('agent-1', 'boom');
    const emitCalls = findCalls('EventService.emit');
    const failedEvt = emitCalls.find((c) => {
      const args = c.args as Record<string, unknown>;
      return args.type === 'autonomy.loop.failed';
    });
    assert.ok(failedEvt);
  });

  it('returns null when no loop exists', async () => {
    const state = await AutonomyLoopService.fail('nope', 'error');
    assert.equal(state, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — runIteration
// ─────────────────────────────────────────────────────────────────────────────

describe('AutonomyLoopService — runIteration', () => {
  beforeEach(() => resetMock());

  it('runs a full iteration for an autonomous loop and continues', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'idle', mode: 'autonomous', iteration: 0 }));
    const state = await AutonomyLoopService.runIteration('agent-1');
    // Autonomous mode → shouldContinue is true → ends in observing
    assert.equal(state.currentState, 'observing');
    // Iteration should have been incremented
    assert.ok(state.iteration >= 1);
  });

  it('runs a full iteration for a manual loop and returns to idle', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'idle', mode: 'manual', iteration: 0 }));
    const state = await AutonomyLoopService.runIteration('agent-1');
    // Manual mode → shouldContinue is false → ends in idle
    assert.equal(state.currentState, 'idle');
  });

  it('returns the current state unchanged when paused', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'paused', mode: 'autonomous' }));
    const state = await AutonomyLoopService.runIteration('agent-1');
    assert.equal(state.currentState, 'paused');
  });

  it('returns the current state unchanged when stopped', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'stopped', mode: 'autonomous' }));
    const state = await AutonomyLoopService.runIteration('agent-1');
    assert.equal(state.currentState, 'stopped');
  });

  it('returns a failed state when no loop exists', async () => {
    const state = await AutonomyLoopService.runIteration('nope');
    assert.equal(state.currentState, 'failed');
    assert.equal(state.error, 'Loop not found');
  });

  it('transitions to idle when maxIterations is reached', async () => {
    store.set('agent-1', makeLoopRow('agent-1', {
      currentState: 'idle',
      mode: 'autonomous',
      iteration: 5,
      maxIterations: 5,
    }));
    const state = await AutonomyLoopService.runIteration('agent-1');
    assert.equal(state.currentState, 'idle');
  });

  it('pauses when budget is exceeded and pauseOnBudgetExceeded is true', async () => {
    budgetCheckImpl = async () => ({ allowed: false, remainingCredits: 0 });
    store.set('agent-1', makeLoopRow('agent-1', {
      currentState: 'idle',
      mode: 'autonomous',
      iteration: 0,
      pauseOnBudgetExceeded: true,
    }));
    const state = await AutonomyLoopService.runIteration('agent-1');
    assert.equal(state.currentState, 'paused');
  });

  it('records a lesson via MemoryService.create during the learn phase', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'idle', mode: 'autonomous', iteration: 0 }));
    await AutonomyLoopService.runIteration('agent-1');
    const createCalls = findCalls('MemoryService.create');
    assert.ok(createCalls.length >= 1);
    const input = createCalls[0].args as Record<string, unknown>;
    assert.equal(input.type, 'lesson');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — shouldContinue
// ─────────────────────────────────────────────────────────────────────────────

describe('AutonomyLoopService — shouldContinue', () => {
  beforeEach(() => resetMock());

  it('returns true for autonomous mode', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'continuing', mode: 'autonomous' }));
    const result = await AutonomyLoopService.shouldContinue('agent-1');
    assert.equal(result, true);
  });

  it('returns false for manual mode', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'continuing', mode: 'manual' }));
    const result = await AutonomyLoopService.shouldContinue('agent-1');
    assert.equal(result, false);
  });

  it('returns false when paused', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'paused', mode: 'autonomous' }));
    const result = await AutonomyLoopService.shouldContinue('agent-1');
    assert.equal(result, false);
  });

  it('returns false when stopped', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'stopped', mode: 'autonomous' }));
    const result = await AutonomyLoopService.shouldContinue('agent-1');
    assert.equal(result, false);
  });

  it('returns false when failed', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'failed', mode: 'autonomous' }));
    const result = await AutonomyLoopService.shouldContinue('agent-1');
    assert.equal(result, false);
  });

  it('returns false when maxIterations is reached', async () => {
    store.set('agent-1', makeLoopRow('agent-1', {
      currentState: 'continuing',
      mode: 'autonomous',
      iteration: 10,
      maxIterations: 10,
    }));
    const result = await AutonomyLoopService.shouldContinue('agent-1');
    assert.equal(result, false);
  });

  it('returns false when no loop exists', async () => {
    const result = await AutonomyLoopService.shouldContinue('nope');
    assert.equal(result, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — listActiveLoops
// ─────────────────────────────────────────────────────────────────────────────

describe('AutonomyLoopService — listActiveLoops', () => {
  beforeEach(() => resetMock());

  it('lists active (non-terminal, non-idle) loops for an organization', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'executing' }));
    store.set('agent-2', makeLoopRow('agent-2', { currentState: 'observing' }));
    store.set('agent-3', makeLoopRow('agent-3', { currentState: 'stopped' }));
    store.set('agent-4', makeLoopRow('agent-4', { currentState: 'idle' }));

    const loops = await AutonomyLoopService.listActiveLoops('org-1');
    assert.equal(loops.length, 2);
    const agentIds = loops.map((l) => l.agentId).sort();
    assert.deepEqual(agentIds, ['agent-1', 'agent-2']);
  });

  it('returns an empty array when no loops exist', async () => {
    const loops = await AutonomyLoopService.listActiveLoops('org-1');
    assert.equal(loops.length, 0);
  });

  it('filters by organizationId', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'executing', organizationId: 'org-1' }));
    store.set('agent-2', makeLoopRow('agent-2', { currentState: 'executing', organizationId: 'org-2' }));

    const loops = await AutonomyLoopService.listActiveLoops('org-1');
    assert.equal(loops.length, 1);
    assert.equal(loops[0].agentId, 'agent-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — incrementIteration
// ─────────────────────────────────────────────────────────────────────────────

describe('AutonomyLoopService — incrementIteration', () => {
  beforeEach(() => resetMock());

  it('increments the iteration counter', async () => {
    store.set('agent-1', makeLoopRow('agent-1', { currentState: 'continuing', iteration: 2 }));
    await AutonomyLoopService.incrementIteration('agent-1');
    const state = await AutonomyLoopService.getLoopState('agent-1');
    assert.ok(state);
    assert.equal(state!.iteration, 3);
  });

  it('does nothing when no loop exists', async () => {
    await AutonomyLoopService.incrementIteration('nope');
    // No throw — just no-op
    assert.ok(true);
  });
});
