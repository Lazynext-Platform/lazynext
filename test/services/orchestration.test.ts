import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: Record<string, unknown>;
};
type MemoryFindUniqueArgs = { where: { id: string } };
type MemoryCreateArgs = { data: Record<string, unknown> };
type MemoryUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type MemoryCountArgs = { where: Record<string, unknown> };

type TaskFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};
type TaskFindUniqueArgs = { where: { id: string }; select?: Record<string, unknown> };
type TaskUpdateArgs = { where: { id: string }; data: Record<string, unknown>; select?: Record<string, unknown> };
type TaskCreateArgs = { data: Record<string, unknown> };
type TaskCountArgs = { where: Record<string, unknown> };

type AgentDefFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};
type AgentDefFindUniqueArgs = { where: { id: string }; select?: Record<string, unknown> };

type GoalFindUniqueArgs = { where: { id: string }; select?: Record<string, unknown> };
type PlanFindManyArgs = { where: Record<string, unknown>; select?: Record<string, unknown> };

type ProjectFindUniqueArgs = { where: { id: string }; select?: Record<string, unknown> };
type WorkspaceFindUniqueArgs = { where: { id: string }; select?: Record<string, unknown> };

type EventCreateArgs = { data: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── Prisma mock implementations ──

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> = async () => ({});
let memoryCountImpl: (args: MemoryCountArgs) => Promise<number> = async () => 0;

let taskFindManyImpl: (args: TaskFindManyArgs) => Promise<unknown[]> = async () => [];
let taskFindUniqueImpl: (args: TaskFindUniqueArgs) => Promise<unknown> = async () => null;
let taskUpdateImpl: (args: TaskUpdateArgs) => Promise<unknown> = async () => ({});
let taskCreateImpl: (args: TaskCreateArgs) => Promise<unknown> = async () => ({ id: 'subtask-1' });
let taskCountImpl: (args: TaskCountArgs) => Promise<number> = async () => 0;

let agentDefFindManyImpl: (args: AgentDefFindManyArgs) => Promise<unknown[]> = async () => [];
let agentDefFindUniqueImpl: (args: AgentDefFindUniqueArgs) => Promise<unknown> = async () => null;

let goalFindUniqueImpl: (args: GoalFindUniqueArgs) => Promise<unknown> = async () => null;
let planFindManyImpl: (args: PlanFindManyArgs) => Promise<unknown[]> = async () => [];

let projectFindUniqueImpl: (args: ProjectFindUniqueArgs) => Promise<unknown> = async () => null;
let workspaceFindUniqueImpl: (args: WorkspaceFindUniqueArgs) => Promise<unknown> = async () => ({ organizationId: 'org-1' });

let eventCreateImpl: (args: EventCreateArgs) => Promise<unknown> = async () => ({ id: 'evt-1' });

// ── MemoryService mock ──

let memoryServiceCreateImpl: (input: Record<string, unknown>) => Promise<unknown> = async () => ({ id: 'mem-1' });

// ── EventService mock ──

let eventServiceEmitImpl: (input: Record<string, unknown>) => Promise<unknown> = async () => ({ id: 'evt-1' });

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    count: (args: MemoryCountArgs): Promise<number> => {
      calls.push({ method: 'memory.count', args });
      return memoryCountImpl(args);
    },
  },
  task: {
    findMany: (args: TaskFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
    findUnique: (args: TaskFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'task.findUnique', args });
      return taskFindUniqueImpl(args);
    },
    update: (args: TaskUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'task.update', args });
      return taskUpdateImpl(args);
    },
    create: (args: TaskCreateArgs): Promise<unknown> => {
      calls.push({ method: 'task.create', args });
      return taskCreateImpl(args);
    },
    count: (args: TaskCountArgs): Promise<number> => {
      calls.push({ method: 'task.count', args });
      return taskCountImpl(args);
    },
  },
  agentDef: {
    findMany: (args: AgentDefFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'agentDef.findMany', args });
      return agentDefFindManyImpl(args);
    },
    findUnique: (args: AgentDefFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'agentDef.findUnique', args });
      return agentDefFindUniqueImpl(args);
    },
  },
  goal: {
    findUnique: (args: GoalFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'goal.findUnique', args });
      return goalFindUniqueImpl(args);
    },
  },
  plan: {
    findMany: (args: PlanFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'plan.findMany', args });
      return planFindManyImpl(args);
    },
  },
  project: {
    findUnique: (args: ProjectFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'project.findUnique', args });
      return projectFindUniqueImpl(args);
    },
  },
  workspace: {
    findUnique: (args: WorkspaceFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'workspace.findUnique', args });
      return workspaceFindUniqueImpl(args);
    },
  },
  event: {
    create: (args: EventCreateArgs): Promise<unknown> => {
      calls.push({ method: 'event.create', args });
      return eventCreateImpl(args);
    },
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

mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      create: (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'MemoryService.create', args: input });
        return memoryServiceCreateImpl(input);
      },
      assembleContext: async () => ({ memories: [], summary: '0 memories' }),
    },
  },
});

mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'EventService.emit', args: input });
        return eventServiceEmitImpl(input);
      },
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({ id: 'mem-1', createdAt: new Date('2024-01-01') });
  memoryUpdateImpl = async () => ({ id: 'mem-1' });
  memoryCountImpl = async () => 0;

  taskFindManyImpl = async () => [];
  taskFindUniqueImpl = async () => null;
  taskUpdateImpl = async () => ({ id: 'task-1', title: 'Task', status: 'in_progress', assignedAgentId: 'agent-2', projectId: 'proj-1' });
  taskCreateImpl = async () => ({ id: 'subtask-1' });
  taskCountImpl = async () => 0;

  agentDefFindManyImpl = async () => [];
  agentDefFindUniqueImpl = async () => null;

  goalFindUniqueImpl = async () => null;
  planFindManyImpl = async () => [];

  projectFindUniqueImpl = async () => null;
  workspaceFindUniqueImpl = async () => ({ organizationId: 'org-1' });

  eventCreateImpl = async () => ({ id: 'evt-1' });

  memoryServiceCreateImpl = async () => ({ id: 'mem-1', createdAt: new Date('2024-01-01') });
  eventServiceEmitImpl = async () => ({ id: 'evt-1' });
}

const { OrchestrationService } = await import('@/lib/services/orchestration');

// ─────────────────────────────────────────────────────────────────────────────
// OrchestrationService
// ─────────────────────────────────────────────────────────────────────────────

describe('OrchestrationService', () => {
  beforeEach(() => { resetMock(); });

  // ── createCollaboration ──
  describe('createCollaboration', () => {
    it('creates a collaboration record as a Memory with collaboration tags', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'decision');
        const tags = JSON.parse(args.data.tags as string) as string[];
        assert.ok(tags.includes('collaboration'));
        assert.ok(tags.includes('orchestration'));
        return { id: 'collab-1', createdAt: new Date('2024-01-01') };
      };

      const result = await OrchestrationService.createCollaboration('ws-1', 'org-1', {
        title: 'Q4 Campaign',
        description: 'Launch Q4 campaign',
        participantAgentIds: ['agent-1', 'agent-2'],
        coordinatorAgentId: 'agent-1',
      });

      assert.equal(result.id, 'collab-1');
      assert.equal(result.title, 'Q4 Campaign');
      assert.equal(result.status, 'active');
      assert.equal(result.participantAgentIds.length, 2);
      assert.equal(result.coordinatorAgentId, 'agent-1');
    });

    it('emits an orchestration.collaboration_started event', async () => {
      memoryCreateImpl = async () => ({ id: 'collab-1', createdAt: new Date('2024-01-01') });

      await OrchestrationService.createCollaboration('ws-1', 'org-1', {
        title: 'Test',
        description: 'Test collaboration',
        participantAgentIds: ['agent-1'],
        coordinatorAgentId: 'agent-1',
      });

      const emitCall = calls.find((c) => c.method === 'EventService.emit');
      assert.ok(emitCall);
      const args = emitCall!.args as Record<string, unknown>;
      assert.equal(args.type, 'orchestration.collaboration_started');
    });

    it('stores goalId and planId in the collaboration content', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.goalId, 'goal-1');
        assert.equal(content.planId, 'plan-1');
        return { id: 'collab-1', createdAt: new Date('2024-01-01') };
      };

      await OrchestrationService.createCollaboration('ws-1', 'org-1', {
        goalId: 'goal-1',
        planId: 'plan-1',
        title: 'Test',
        description: 'Test',
        participantAgentIds: ['agent-1'],
        coordinatorAgentId: 'agent-1',
      });
    });
  });

  // ── listCollaborations ──
  describe('listCollaborations', () => {
    it('returns collaborations filtered by collaboration tag', async () => {
      memoryFindManyImpl = async () => ([
        {
          id: 'collab-1',
          content: JSON.stringify({ title: 'Collab 1', description: 'd', participantAgentIds: ['a1'], coordinatorAgentId: 'a1', status: 'active' }),
          tags: JSON.stringify(['collaboration', 'orchestration']),
          sourceId: null,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'mem-2',
          content: JSON.stringify({ title: 'Not a collab' }),
          tags: JSON.stringify(['other']),
          sourceId: null,
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const result = await OrchestrationService.listCollaborations('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'collab-1');
      assert.equal(result[0].title, 'Collab 1');
    });

    it('filters by status when provided', async () => {
      memoryFindManyImpl = async () => ([
        {
          id: 'collab-1',
          content: JSON.stringify({ title: 'Active', description: '', participantAgentIds: [], coordinatorAgentId: 'a1', status: 'active' }),
          tags: JSON.stringify(['collaboration']),
          sourceId: null,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'collab-2',
          content: JSON.stringify({ title: 'Ended', description: '', participantAgentIds: [], coordinatorAgentId: 'a1', status: 'ended' }),
          tags: JSON.stringify(['collaboration']),
          sourceId: null,
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const result = await OrchestrationService.listCollaborations('ws-1', { status: 'active' });
      assert.equal(result.length, 1);
      assert.equal(result[0].status, 'active');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await OrchestrationService.listCollaborations('ws-1');
      assert.deepEqual(result, []);
    });
  });

  // ── delegateTask ──
  describe('delegateTask', () => {
    it('updates the task assignee and status', async () => {
      taskUpdateImpl = async (args: TaskUpdateArgs) => {
        assert.equal(args.data.assignedAgentId, 'agent-2');
        assert.equal(args.data.status, 'in_progress');
        return { id: 'task-1', title: 'Task', status: 'in_progress', assignedAgentId: 'agent-2', projectId: 'proj-1' };
      };

      const result = await OrchestrationService.delegateTask('ws-1', 'collab-1', {
        taskId: 'task-1',
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
      });

      assert.equal(result.assignedAgentId, 'agent-2');
      assert.equal(result.status, 'in_progress');
    });

    it('sets priority when provided', async () => {
      taskUpdateImpl = async (args: TaskUpdateArgs) => {
        assert.equal(args.data.priority, 'high');
        return { id: 'task-1', title: 'Task', status: 'in_progress', assignedAgentId: 'agent-2', projectId: 'proj-1' };
      };

      await OrchestrationService.delegateTask('ws-1', 'collab-1', {
        taskId: 'task-1',
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        priority: 'high',
      });
    });

    it('creates a memory recording the delegation', async () => {
      taskUpdateImpl = async () => ({ id: 'task-1', title: 'Task', status: 'in_progress', assignedAgentId: 'agent-2', projectId: 'proj-1' });

      await OrchestrationService.delegateTask('ws-1', 'collab-1', {
        taskId: 'task-1',
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        instructions: 'Please handle this',
      });

      const memCall = calls.find((c) => c.method === 'MemoryService.create');
      assert.ok(memCall);
      const args = memCall!.args as Record<string, unknown>;
      const tags = args.tags as string[];
      assert.ok(tags.includes('delegation'));
    });

    it('emits an orchestration.task_delegated event', async () => {
      taskUpdateImpl = async () => ({ id: 'task-1', title: 'Task', status: 'in_progress', assignedAgentId: 'agent-2', projectId: 'proj-1' });

      await OrchestrationService.delegateTask('ws-1', 'collab-1', {
        taskId: 'task-1',
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
      });

      const emitCall = calls.find((c) => c.method === 'EventService.emit');
      assert.ok(emitCall);
      const args = emitCall!.args as Record<string, unknown>;
      assert.equal(args.type, 'orchestration.task_delegated');
    });
  });

  // ── shareContext ──
  describe('shareContext', () => {
    it('creates memory records for each recipient agent', async () => {
      let createCount = 0;
      memoryServiceCreateImpl = async () => {
        createCount++;
        return { id: `mem-${createCount}`, content: 'ctx', owner: 'agent-2' };
      };

      const result = await OrchestrationService.shareContext('ws-1', 'collab-1', {
        fromAgentId: 'agent-1',
        toAgentIds: ['agent-2', 'agent-3', 'agent-4'],
        contextKey: 'campaign_data',
        contextValue: 'CTR is 5%',
      });

      assert.equal(result.length, 3);
      assert.equal(createCount, 3);
    });

    it('emits an orchestration.context_shared event', async () => {
      memoryServiceCreateImpl = async () => ({ id: 'mem-1', content: 'ctx', owner: 'agent-2' });

      await OrchestrationService.shareContext('ws-1', 'collab-1', {
        fromAgentId: 'agent-1',
        toAgentIds: ['agent-2'],
        contextKey: 'data',
        contextValue: 'value',
      });

      const emitCall = calls.find((c) => c.method === 'EventService.emit');
      assert.ok(emitCall);
      const args = emitCall!.args as Record<string, unknown>;
      assert.equal(args.type, 'orchestration.context_shared');
    });

    it('uses active_context as default memory type', async () => {
      let capturedType = '';
      memoryServiceCreateImpl = async (input: Record<string, unknown>) => {
        capturedType = input.type as string;
        return { id: 'mem-1', content: 'ctx', owner: 'agent-2' };
      };

      await OrchestrationService.shareContext('ws-1', 'collab-1', {
        fromAgentId: 'agent-1',
        toAgentIds: ['agent-2'],
        contextKey: 'data',
        contextValue: 'value',
      });

      assert.equal(capturedType, 'active_context');
    });
  });

  // ── resolveConflict ──
  describe('resolveConflict', () => {
    it('updates task status to blocked for escalate resolution', async () => {
      let capturedStatus = '';
      taskUpdateImpl = async (args: TaskUpdateArgs) => {
        capturedStatus = args.data.status as string;
        return { id: 'task-1' };
      };

      await OrchestrationService.resolveConflict('ws-1', 'collab-1', {
        taskId: 'task-1',
        conflictingAgentIds: ['agent-1', 'agent-2'],
        resolution: 'escalate',
        decidedBy: 'agent-3',
      });

      assert.equal(capturedStatus, 'blocked');
    });

    it('updates task status to awaiting_approval for manual resolution', async () => {
      let capturedStatus = '';
      taskUpdateImpl = async (args: TaskUpdateArgs) => {
        capturedStatus = args.data.status as string;
        return { id: 'task-1' };
      };

      await OrchestrationService.resolveConflict('ws-1', 'collab-1', {
        taskId: 'task-1',
        conflictingAgentIds: ['agent-1', 'agent-2'],
        resolution: 'manual',
        decidedBy: 'agent-3',
      });

      assert.equal(capturedStatus, 'awaiting_approval');
    });

    it('records the conflict resolution as a memory', async () => {
      taskUpdateImpl = async () => ({ id: 'task-1' });

      const result = await OrchestrationService.resolveConflict('ws-1', 'collab-1', {
        taskId: 'task-1',
        conflictingAgentIds: ['agent-1', 'agent-2'],
        resolution: 'merge',
        decidedBy: 'agent-3',
        notes: 'Combined both approaches',
      });

      assert.equal(result.resolution, 'merge');
      assert.equal(result.decidedBy, 'agent-3');
      assert.equal(result.notes, 'Combined both approaches');
      assert.equal(result.conflictingAgentIds.length, 2);
    });

    it('emits an orchestration.conflict_resolved event', async () => {
      taskUpdateImpl = async () => ({ id: 'task-1' });

      await OrchestrationService.resolveConflict('ws-1', 'collab-1', {
        taskId: 'task-1',
        conflictingAgentIds: ['agent-1', 'agent-2'],
        resolution: 'first',
        decidedBy: 'agent-3',
      });

      const emitCall = calls.find((c) => c.method === 'EventService.emit');
      assert.ok(emitCall);
      const args = emitCall!.args as Record<string, unknown>;
      assert.equal(args.type, 'orchestration.conflict_resolved');
    });
  });

  // ── coordinateHandoff ──
  describe('coordinateHandoff', () => {
    it('updates the task assignee to the new agent', async () => {
      let capturedAssignee = '';
      taskUpdateImpl = async (args: TaskUpdateArgs) => {
        capturedAssignee = args.data.assignedAgentId as string;
        return { id: 'task-1' };
      };

      await OrchestrationService.coordinateHandoff('ws-1', 'collab-1', {
        taskId: 'task-1',
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
      });

      assert.equal(capturedAssignee, 'agent-2');
    });

    it('creates a memory with handoff context', async () => {
      taskUpdateImpl = async () => ({ id: 'task-1' });

      const result = await OrchestrationService.coordinateHandoff('ws-1', 'collab-1', {
        taskId: 'task-1',
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        handoffNotes: 'Halfway done, needs design review',
      });

      assert.equal(result.fromAgentId, 'agent-1');
      assert.equal(result.toAgentId, 'agent-2');
      assert.equal(result.handoffNotes, 'Halfway done, needs design review');
    });

    it('emits an orchestration.handoff_completed event', async () => {
      taskUpdateImpl = async () => ({ id: 'task-1' });

      await OrchestrationService.coordinateHandoff('ws-1', 'collab-1', {
        taskId: 'task-1',
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
      });

      const emitCall = calls.find((c) => c.method === 'EventService.emit');
      assert.ok(emitCall);
      const args = emitCall!.args as Record<string, unknown>;
      assert.equal(args.type, 'orchestration.handoff_completed');
    });
  });

  // ── getCollaborationStatus ──
  describe('getCollaborationStatus', () => {
    it('returns null collaboration when memory not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await OrchestrationService.getCollaborationStatus('nonexistent');

      assert.equal(result.collaboration, null);
      assert.equal(result.participants.length, 0);
    });

    it('returns participant task counts and task summary', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'collab-1',
        content: JSON.stringify({ title: 'Test', description: '', participantAgentIds: ['a1', 'a2'], coordinatorAgentId: 'a1', status: 'active', planId: 'plan-1' }),
        tags: JSON.stringify(['collaboration']),
        sourceId: null,
        createdAt: new Date('2024-01-01'),
        workspaceId: 'ws-1',
      });
      agentDefFindManyImpl = async () => ([
        { id: 'a1', name: 'Agent 1', role: 'growth', workspaceId: 'ws-1' },
        { id: 'a2', name: 'Agent 2', role: 'design', workspaceId: 'ws-1' },
      ]);
      taskCountImpl = async () => 2;
      taskFindManyImpl = async () => ([
        { status: 'done' },
        { status: 'in_progress' },
        { status: 'todo' },
      ]);

      const result = await OrchestrationService.getCollaborationStatus('collab-1');

      assert.ok(result.collaboration);
      assert.equal(result.collaboration!.title, 'Test');
      assert.equal(result.participants.length, 2);
      assert.equal(result.participants[0].name, 'Agent 1');
      assert.equal(result.tasks.total, 3);
      assert.equal(result.tasks.completed, 1);
      assert.equal(result.tasks.inProgress, 1);
      assert.equal(result.tasks.pending, 1);
    });
  });

  // ── getAgentWorkload ──
  describe('getAgentWorkload', () => {
    it('returns agent workload with task counts', async () => {
      agentDefFindUniqueImpl = async () => ({ id: 'a1', name: 'Growth Manager', role: 'growth' });
      taskCountImpl = async (args: TaskCountArgs) => {
        const status = (args.where as Record<string, unknown>).status;
        if (status === 'in_progress') return 3;
        if (status === 'todo') return 2;
        if (typeof status === 'object' && status !== null && 'in' in status) return 5;
        return 0;
      };
      memoryFindManyImpl = async () => ([
        { tags: JSON.stringify(['collaboration']) },
        { tags: JSON.stringify(['collaboration']) },
        { tags: JSON.stringify(['other']) },
      ]);
      memoryCountImpl = async () => 3;

      const result = await OrchestrationService.getAgentWorkload('ws-1', 'a1');

      assert.equal(result.agentId, 'a1');
      assert.equal(result.agentName, 'Growth Manager');
      assert.equal(result.agentRole, 'growth');
      assert.equal(result.activeTasks, 3);
      assert.equal(result.pendingTasks, 2);
      assert.equal(result.completedTasks, 5);
      assert.equal(result.collaborationCount, 2);
    });

    it('returns Unknown agent name when agent not found', async () => {
      agentDefFindUniqueImpl = async () => null;
      taskCountImpl = async () => 0;
      memoryFindManyImpl = async () => [];
      memoryCountImpl = async () => 0;

      const result = await OrchestrationService.getAgentWorkload('ws-1', 'nonexistent');

      assert.equal(result.agentName, 'Unknown');
      assert.equal(result.agentRole, 'custom');
    });
  });

  // ── suggestCollaboration ──
  describe('suggestCollaboration', () => {
    it('returns suggestions matching agent roles to goal keywords', async () => {
      goalFindUniqueImpl = async () => ({
        id: 'goal-1',
        title: 'Launch marketing campaign',
        description: 'Create ads and social content',
        workspaceId: 'ws-1',
      });
      planFindManyImpl = async () => [{ id: 'plan-1' }];
      taskFindManyImpl = async () => ([
        { title: 'Create ad copy', description: 'Write marketing copy' },
      ]);
      agentDefFindManyImpl = async () => ([
        { id: 'a1', name: 'Growth Manager', role: 'growth', capabilities: JSON.stringify(['text', 'reasoning', 'creative_generation']) },
        { id: 'a2', name: 'Design Lead', role: 'design', capabilities: JSON.stringify(['text', 'reasoning', 'vision']) },
        { id: 'a3', name: 'Ops Manager', role: 'operations', capabilities: JSON.stringify(['text', 'reasoning']) },
      ]);

      const result = await OrchestrationService.suggestCollaboration('ws-1', 'org-1', 'goal-1');

      assert.equal(result.goalId, 'goal-1');
      assert.equal(result.goalTitle, 'Launch marketing campaign');
      assert.ok(result.suggestedParticipants.length > 0);
      // Growth agent should match marketing/campaign keywords
      const growthAgent = result.suggestedParticipants.find((s) => s.role === 'growth');
      assert.ok(growthAgent, 'Growth agent should be suggested');
      assert.ok(growthAgent!.matchedTaskCount > 0);
    });

    it('suggests operations agent as coordinator when available', async () => {
      goalFindUniqueImpl = async () => ({
        id: 'goal-1',
        title: 'Improve operations workflow',
        description: 'Automate processes',
        workspaceId: 'ws-1',
      });
      planFindManyImpl = async () => [];
      agentDefFindManyImpl = async () => ([
        { id: 'a1', name: 'Ops Manager', role: 'operations', capabilities: JSON.stringify(['text', 'reasoning']) },
        { id: 'a2', name: 'Growth Manager', role: 'growth', capabilities: JSON.stringify(['text']) },
      ]);

      const result = await OrchestrationService.suggestCollaboration('ws-1', 'org-1', 'goal-1');

      assert.ok(result.suggestedCoordinator);
      assert.equal(result.suggestedCoordinator!.role, 'operations');
    });

    it('returns empty suggestions when goal not found', async () => {
      goalFindUniqueImpl = async () => null;

      const result = await OrchestrationService.suggestCollaboration('ws-1', 'org-1', 'nonexistent');

      assert.equal(result.suggestedParticipants.length, 0);
      assert.equal(result.suggestedCoordinator, null);
    });

    it('returns empty suggestions when no agents available', async () => {
      goalFindUniqueImpl = async () => ({
        id: 'goal-1',
        title: 'Test goal',
        description: '',
        workspaceId: 'ws-1',
      });
      agentDefFindManyImpl = async () => [];

      const result = await OrchestrationService.suggestCollaboration('ws-1', 'org-1', 'goal-1');

      assert.equal(result.suggestedParticipants.length, 0);
      assert.equal(result.suggestedCoordinator, null);
    });
  });

  // ── endCollaboration ──
  describe('endCollaboration', () => {
    it('updates the collaboration memory status to ended', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'collab-1',
        content: JSON.stringify({ title: 'Test', description: '', participantAgentIds: ['a1'], coordinatorAgentId: 'a1', status: 'active', planId: 'plan-1' }),
        tags: JSON.stringify(['collaboration']),
        sourceId: null,
        createdAt: new Date('2024-01-01'),
        workspaceId: 'ws-1',
      });
      taskFindManyImpl = async () => ([
        { status: 'done' },
        { status: 'done' },
        { status: 'in_progress' },
      ]);

      const result = await OrchestrationService.endCollaboration('ws-1', 'collab-1', 'Goal achieved');

      assert.equal(result.collaborationId, 'collab-1');
      assert.equal(result.title, 'Test');
      assert.equal(result.outcome, 'Goal achieved');
      assert.equal(result.tasksTotal, 3);
      assert.equal(result.tasksCompleted, 2);

      // Verify memory.update was called
      const updateCall = calls.find((c) => c.method === 'memory.update');
      assert.ok(updateCall);
    });

    it('emits an orchestration.collaboration_ended event', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'collab-1',
        content: JSON.stringify({ title: 'Test', description: '', participantAgentIds: ['a1'], coordinatorAgentId: 'a1', status: 'active' }),
        tags: JSON.stringify(['collaboration']),
        sourceId: null,
        createdAt: new Date('2024-01-01'),
        workspaceId: 'ws-1',
      });

      await OrchestrationService.endCollaboration('ws-1', 'collab-1', 'Done');

      const emitCall = calls.find((c) => c.method === 'EventService.emit');
      assert.ok(emitCall);
      const args = emitCall!.args as Record<string, unknown>;
      assert.equal(args.type, 'orchestration.collaboration_ended');
    });

    it('records an outcome memory', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'collab-1',
        content: JSON.stringify({ title: 'Test', description: '', participantAgentIds: ['a1'], coordinatorAgentId: 'a1', status: 'active' }),
        tags: JSON.stringify(['collaboration']),
        sourceId: null,
        createdAt: new Date('2024-01-01'),
        workspaceId: 'ws-1',
      });

      await OrchestrationService.endCollaboration('ws-1', 'collab-1', 'Success');

      const memCall = calls.find((c) => c.method === 'MemoryService.create');
      assert.ok(memCall);
      const args = memCall!.args as Record<string, unknown>;
      assert.equal(args.type, 'outcome');
      const tags = args.tags as string[];
      assert.ok(tags.includes('ended'));
    });
  });
});
