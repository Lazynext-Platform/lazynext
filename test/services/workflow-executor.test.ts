import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryRecord {
  id: string;
  content: string;
  type: string;
  organizationId: string;
  workspaceId: string;
  tags: string | null;
  updatedAt: Date;
  createdAt: Date;
}

interface EventRecord {
  id: string;
  type: string;
  source: string;
  sourceId: string;
  organizationId: string;
  content: string;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindUniqueImpl: (args: unknown) => Promise<MemoryRecord | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;

let eventCreateImpl: (args: unknown) => Promise<EventRecord> = async () => ({}) as EventRecord;
let eventFindUniqueImpl: (args: unknown) => Promise<EventRecord | null> = async () => null;
let eventFindManyImpl: (args: unknown) => Promise<EventRecord[]> = async () => [];
let eventUpdateImpl: (args: unknown) => Promise<EventRecord> = async () => ({}) as EventRecord;

const prismaMock = {
  memory: {
    findUnique: (args: unknown): Promise<MemoryRecord | null> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<MemoryRecord> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<MemoryRecord> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
  },
  event: {
    create: (args: unknown): Promise<EventRecord> => {
      calls.push({ method: 'event.create', args });
      return eventCreateImpl(args);
    },
    findUnique: (args: unknown): Promise<EventRecord | null> => {
      calls.push({ method: 'event.findUnique', args });
      return eventFindUniqueImpl(args);
    },
    findMany: (args: unknown): Promise<EventRecord[]> => {
      calls.push({ method: 'event.findMany', args });
      return eventFindManyImpl(args);
    },
    update: (args: unknown): Promise<EventRecord> => {
      calls.push({ method: 'event.update', args });
      return eventUpdateImpl(args);
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

function makeMemoryRecord(id: string, data: Record<string, unknown>, orgId = 'org-1', wsId = 'ws-1'): MemoryRecord {
  return {
    id,
    content: JSON.stringify(data),
    type: 'workflow_definition',
    organizationId: orgId,
    workspaceId: wsId,
    tags: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

function makeEventRecord(id: string, execData: Record<string, unknown>): EventRecord {
  return {
    id,
    type: 'workflow_execution',
    source: 'workflow_executor',
    sourceId: execData.workflowId as string,
    organizationId: 'org-1',
    content: JSON.stringify(execData),
    metadata: JSON.stringify({ workflowId: execData.workflowId, status: execData.status }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({}) as MemoryRecord;
  memoryUpdateImpl = async () => ({}) as MemoryRecord;
  eventCreateImpl = async () => ({}) as EventRecord;
  eventFindUniqueImpl = async () => null;
  eventFindManyImpl = async () => [];
  eventUpdateImpl = async () => ({}) as EventRecord;
}

const { WorkflowExecutor, evaluateCondition, resolveVariable } = await import('@/lib/services/workflow-executor');

// Build a simple workflow definition for tests
function makeSimpleWorkflow() {
  return {
    id: 'wf-1',
    name: 'Test WF',
    description: undefined,
    nodes: [
      { id: 'trigger_1', type: 'trigger' as const, name: 'Trigger', config: { type: 'manual' }, position: { x: 0, y: 0 } },
      { id: 'action_1', type: 'action' as const, name: 'Create Task', config: { action: 'create_task', title: 'Test' }, position: { x: 100, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'action_1' },
    ],
    variables: [],
    config: {},
    version: 1,
    status: 'published' as const,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowExecutor', () => {
  beforeEach(() => { resetMock(); });

  describe('execute', () => {
    it('executes a simple workflow from trigger to action', async () => {
      const wf = makeSimpleWorkflow();
      memoryFindUniqueImpl = async (args: unknown) => {
        const a = args as { where: { id: string }; select?: Record<string, unknown> };
        if (a.select?.organizationId) {
          return { ...makeMemoryRecord('wf-1', {}), organizationId: 'org-1' } as MemoryRecord;
        }
        return makeMemoryRecord('wf-1', wf);
      };
      eventCreateImpl = async () => ({}) as EventRecord;

      const exec = await WorkflowExecutor.execute('wf-1', {}, { organizationId: 'org-1' });

      assert.equal(exec.workflowId, 'wf-1');
      assert.equal(exec.status, 'completed');
      assert.ok(exec.nodeExecutions.length >= 1);
      // The action node should be in the path
      const actionExec = exec.nodeExecutions.find((n) => n.nodeId === 'action_1');
      assert.ok(actionExec);
      assert.equal(actionExec!.status, 'completed');
    });

    it('throws when workflow not found', async () => {
      memoryFindUniqueImpl = async () => null;
      await assert.rejects(
        () => WorkflowExecutor.execute('nope', {}, { organizationId: 'org-1' }),
        /workflow_not_found/,
      );
    });

    it('throws when trigger node is missing', async () => {
      const wf = { ...makeSimpleWorkflow(), nodes: [{ id: 'a1', type: 'action' as const, name: 'A', config: { action: 'create_task' }, position: { x: 0, y: 0 } }] };
      memoryFindUniqueImpl = async (args: unknown) => {
        const a = args as { where: { id: string }; select?: Record<string, unknown> };
        if (a.select?.organizationId) return { ...makeMemoryRecord('wf-1', {}), organizationId: 'org-1' } as MemoryRecord;
        return makeMemoryRecord('wf-1', wf);
      };

      await assert.rejects(
        () => WorkflowExecutor.execute('wf-1', {}, { organizationId: 'org-1' }),
        /missing_trigger_node/,
      );
    });

    it('seeds workflow variable defaults into context', async () => {
      const wf = {
        ...makeSimpleWorkflow(),
        variables: [
          { name: 'threshold', type: 'number' as const, defaultValue: 50 },
        ],
      };
      memoryFindUniqueImpl = async (args: unknown) => {
        const a = args as { where: { id: string }; select?: Record<string, unknown> };
        if (a.select?.organizationId) return { ...makeMemoryRecord('wf-1', {}), organizationId: 'org-1' } as MemoryRecord;
        return makeMemoryRecord('wf-1', wf);
      };
      eventCreateImpl = async () => ({}) as EventRecord;

      const exec = await WorkflowExecutor.execute('wf-1', {}, { organizationId: 'org-1' });
      assert.equal(exec.variables.threshold, 50);
    });
  });

  describe('executeNode', () => {
    it('executes a trigger node and returns next nodes', async () => {
      const wf = makeSimpleWorkflow();
      const context = {
        workflow: wf,
        variables: {},
        nodeExecutions: [],
        nodeOutputs: {},
        path: [],
        dryRun: false,
      };
      const result = await WorkflowExecutor.executeNode(wf.nodes[0], context);
      assert.equal(result.status, 'completed');
      assert.deepEqual(result.nextNodes, ['action_1']);
    });

    it('executes an action node in dry-run mode', async () => {
      const wf = makeSimpleWorkflow();
      const context = {
        workflow: wf,
        variables: {},
        nodeExecutions: [],
        nodeOutputs: {},
        path: [],
        dryRun: true,
      };
      const result = await WorkflowExecutor.executeNode(wf.nodes[1], context);
      assert.equal(result.status, 'completed');
      assert.ok(result.output && typeof result.output === 'object');
    });

    it('returns waiting status for approval node', async () => {
      const node = { id: 'ap1', type: 'approval' as const, name: 'Approve', config: { approverId: 'u1' }, position: { x: 0, y: 0 } };
      const context = {
        workflow: makeSimpleWorkflow(),
        variables: {},
        nodeExecutions: [],
        nodeOutputs: {},
        path: [],
        dryRun: false,
      };
      const result = await WorkflowExecutor.executeNode(node, context);
      assert.equal(result.status, 'waiting');
    });

    it('returns failed for unknown node type', async () => {
      const node = { id: 'x1', type: 'nonexistent' as never, name: 'X', config: {}, position: { x: 0, y: 0 } };
      const context = {
        workflow: makeSimpleWorkflow(),
        variables: {},
        nodeExecutions: [],
        nodeOutputs: {},
        path: [],
        dryRun: false,
      };
      const result = await WorkflowExecutor.executeNode(node, context);
      assert.equal(result.status, 'failed');
    });

    it('executes a delay node in dry-run without waiting', async () => {
      const node = { id: 'd1', type: 'delay' as const, name: 'Delay', config: { duration: 1, unit: 'seconds' }, position: { x: 0, y: 0 } };
      const context = {
        workflow: makeSimpleWorkflow(),
        variables: {},
        nodeExecutions: [],
        nodeOutputs: {},
        path: [],
        dryRun: true,
      };
      const result = await WorkflowExecutor.executeNode(node, context);
      assert.equal(result.status, 'completed');
      assert.ok(result.output && typeof result.output === 'object');
    });
  });

  describe('evaluateCondition', () => {
    const baseContext = {
      workflow: makeSimpleWorkflow(),
      variables: { score: 75, name: 'hello world', tags: ['a', 'b'], emptyVal: '', items: [] },
      nodeExecutions: [],
      nodeOutputs: {},
      path: [],
      dryRun: false,
    };

    it('evaluates eq operator', () => {
      assert.equal(evaluateCondition({ field: 'name', operator: 'eq', value: 'hello world', branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'name', operator: 'eq', value: 'nope', branches: { true: '', false: '' } }, baseContext), false);
    });

    it('evaluates ne operator', () => {
      assert.equal(evaluateCondition({ field: 'name', operator: 'ne', value: 'nope', branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'name', operator: 'ne', value: 'hello world', branches: { true: '', false: '' } }, baseContext), false);
    });

    it('evaluates gt / lt / gte / lte operators', () => {
      assert.equal(evaluateCondition({ field: 'score', operator: 'gt', value: 50, branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'score', operator: 'gt', value: 100, branches: { true: '', false: '' } }, baseContext), false);
      assert.equal(evaluateCondition({ field: 'score', operator: 'lt', value: 100, branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'score', operator: 'lt', value: 50, branches: { true: '', false: '' } }, baseContext), false);
      assert.equal(evaluateCondition({ field: 'score', operator: 'gte', value: 75, branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'score', operator: 'lte', value: 75, branches: { true: '', false: '' } }, baseContext), true);
    });

    it('evaluates contains operator (string and array)', () => {
      assert.equal(evaluateCondition({ field: 'name', operator: 'contains', value: 'hello', branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'tags', operator: 'contains', value: 'a', branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'name', operator: 'contains', value: 'xyz', branches: { true: '', false: '' } }, baseContext), false);
    });

    it('evaluates startsWith and endsWith operators', () => {
      assert.equal(evaluateCondition({ field: 'name', operator: 'startsWith', value: 'hello', branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'name', operator: 'endsWith', value: 'world', branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'name', operator: 'startsWith', value: 'world', branches: { true: '', false: '' } }, baseContext), false);
    });

    it('evaluates in and notIn operators', () => {
      assert.equal(evaluateCondition({ field: 'score', operator: 'in', value: [75, 80], branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'score', operator: 'in', value: [1, 2], branches: { true: '', false: '' } }, baseContext), false);
      assert.equal(evaluateCondition({ field: 'score', operator: 'notIn', value: [1, 2], branches: { true: '', false: '' } }, baseContext), true);
    });

    it('evaluates empty and notEmpty operators', () => {
      assert.equal(evaluateCondition({ field: 'emptyVal', operator: 'empty', value: undefined, branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'items', operator: 'empty', value: undefined, branches: { true: '', false: '' } }, baseContext), true);
      assert.equal(evaluateCondition({ field: 'name', operator: 'empty', value: undefined, branches: { true: '', false: '' } }, baseContext), false);
      assert.equal(evaluateCondition({ field: 'name', operator: 'notEmpty', value: undefined, branches: { true: '', false: '' } }, baseContext), true);
    });
  });

  describe('resolveVariable', () => {
    it('resolves a direct variable', () => {
      const ctx = { workflow: makeSimpleWorkflow(), variables: { foo: 'bar' }, nodeExecutions: [], nodeOutputs: {}, path: [], dryRun: false };
      assert.equal(resolveVariable('{{foo}}', ctx), 'bar');
    });

    it('resolves a node output via dot path', () => {
      const ctx = {
        workflow: makeSimpleWorkflow(),
        variables: {},
        nodeExecutions: [],
        nodeOutputs: { action_1: { title: 'Hello' } },
        path: [],
        dryRun: false,
      };
      assert.equal(resolveVariable('{{nodes.action_1.output.title}}', ctx), 'Hello');
    });

    it('returns undefined for unknown variable', () => {
      const ctx = { workflow: makeSimpleWorkflow(), variables: {}, nodeExecutions: [], nodeOutputs: {}, path: [], dryRun: false };
      assert.equal(resolveVariable('{{unknown}}', ctx), undefined);
    });
  });

  describe('testRun', () => {
    it('dry-runs a workflow and returns path and nodes', async () => {
      const wf = makeSimpleWorkflow();
      memoryFindUniqueImpl = async (args: unknown) => {
        const a = args as { where: { id: string }; select?: Record<string, unknown> };
        if (a.select?.organizationId) return { ...makeMemoryRecord('wf-1', {}), organizationId: 'org-1' } as MemoryRecord;
        return makeMemoryRecord('wf-1', wf);
      };

      const result = await WorkflowExecutor.testRun('wf-1', {});
      assert.ok(result.nodes.length >= 1);
      assert.ok(result.path.includes('action_1'));
      assert.ok(typeof result.duration === 'number');
    });
  });

  describe('getExecution', () => {
    it('returns an execution by id', async () => {
      eventFindUniqueImpl = async () => makeEventRecord('exec-1', {
        workflowId: 'wf-1', status: 'completed', startedAt: new Date().toISOString(),
        variables: {}, nodeExecutions: [], completedAt: new Date().toISOString(),
      });

      const exec = await WorkflowExecutor.getExecution('exec-1');
      assert.ok(exec);
      assert.equal(exec!.id, 'exec-1');
      assert.equal(exec!.status, 'completed');
    });

    it('returns null when not found', async () => {
      eventFindUniqueImpl = async () => null;
      const exec = await WorkflowExecutor.getExecution('nope');
      assert.equal(exec, null);
    });

    it('returns null when type is not workflow_execution', async () => {
      eventFindUniqueImpl = async () => ({ ...makeEventRecord('exec-1', { workflowId: 'wf-1', status: 'completed', startedAt: '', variables: {}, nodeExecutions: [] }), type: 'other' });
      const exec = await WorkflowExecutor.getExecution('exec-1');
      assert.equal(exec, null);
    });
  });

  describe('cancelExecution', () => {
    it('cancels a running execution', async () => {
      eventFindUniqueImpl = async () => makeEventRecord('exec-1', {
        workflowId: 'wf-1', status: 'running', startedAt: new Date().toISOString(),
        variables: {}, nodeExecutions: [],
      });
      eventUpdateImpl = async () => ({}) as EventRecord;

      const exec = await WorkflowExecutor.cancelExecution('exec-1');
      assert.ok(exec);
      assert.equal(exec!.status, 'cancelled');
      assert.ok(exec!.completedAt);
    });

    it('returns the execution unchanged if already completed', async () => {
      eventFindUniqueImpl = async () => makeEventRecord('exec-1', {
        workflowId: 'wf-1', status: 'completed', startedAt: '', variables: {}, nodeExecutions: [], completedAt: '',
      });

      const exec = await WorkflowExecutor.cancelExecution('exec-1');
      assert.ok(exec);
      assert.equal(exec!.status, 'completed');
    });
  });

  describe('resumeExecution', () => {
    it('resumes an approval-waiting execution as completed when approved', async () => {
      eventFindUniqueImpl = async () => makeEventRecord('exec-1', {
        workflowId: 'wf-1', status: 'waiting_approval', startedAt: '', variables: {}, nodeExecutions: [],
      });
      eventUpdateImpl = async () => ({}) as EventRecord;

      const exec = await WorkflowExecutor.resumeExecution('exec-1', { approved: true, approverId: 'u1' });
      assert.ok(exec);
      assert.equal(exec!.status, 'completed');
    });

    it('fails the execution when rejected', async () => {
      eventFindUniqueImpl = async () => makeEventRecord('exec-1', {
        workflowId: 'wf-1', status: 'waiting_approval', startedAt: '', variables: {}, nodeExecutions: [],
      });
      eventUpdateImpl = async () => ({}) as EventRecord;

      const exec = await WorkflowExecutor.resumeExecution('exec-1', { approved: false, approverId: 'u1', comment: 'no' });
      assert.ok(exec);
      assert.equal(exec!.status, 'failed');
    });

    it('returns the execution unchanged if not in waiting/paused state', async () => {
      eventFindUniqueImpl = async () => makeEventRecord('exec-1', {
        workflowId: 'wf-1', status: 'completed', startedAt: '', variables: {}, nodeExecutions: [], completedAt: '',
      });

      const exec = await WorkflowExecutor.resumeExecution('exec-1', { approved: true });
      assert.ok(exec);
      assert.equal(exec!.status, 'completed');
    });
  });

  describe('getExecutions', () => {
    it('lists executions for a workflow', async () => {
      eventFindManyImpl = async () => [
        makeEventRecord('exec-1', { workflowId: 'wf-1', status: 'completed', startedAt: '', variables: {}, nodeExecutions: [] }),
        makeEventRecord('exec-2', { workflowId: 'wf-1', status: 'failed', startedAt: '', variables: {}, nodeExecutions: [] }),
      ];

      const execs = await WorkflowExecutor.getExecutions('wf-1');
      assert.equal(execs.length, 2);
      assert.equal(execs[0].id, 'exec-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      eventFindManyImpl = async () => { throw new Error('DB down'); };
      const execs = await WorkflowExecutor.getExecutions('wf-1');
      assert.deepEqual(execs, []);
    });
  });
});
