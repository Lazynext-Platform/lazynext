import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── Mock prisma ──
type TaskCreateArgs = { data: Record<string, unknown> };
type TaskUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type ProjectFindFirstArgs = { where: Record<string, unknown>; select: Record<string, unknown> };
type MemoryFindManyArgs = { where: Record<string, unknown>; take: number; orderBy: Record<string, unknown> };
type ToolDefFindFirstArgs = { where: Record<string, unknown> };
type ToolDefCreateArgs = { data: Record<string, unknown> };

let taskCreateImpl: (args: TaskCreateArgs) => Promise<unknown> = async () => ({ id: 'task-1' });
let taskUpdateImpl: (args: TaskUpdateArgs) => Promise<unknown> = async () => ({});
let projectFindFirstImpl: (args: ProjectFindFirstArgs) => Promise<unknown> = async () => ({ id: 'proj-1' });
let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> = async () => [];
let toolDefFindFirstImpl: (args: ToolDefFindFirstArgs) => Promise<unknown> = async () => null;
let toolDefCreateImpl: (args: ToolDefCreateArgs) => Promise<unknown> = async () => ({ id: 'td-1' });

const calls: { method: string; args?: unknown }[] = [];

const prismaMock = {
  task: {
    create: (args: TaskCreateArgs): Promise<unknown> => {
      calls.push({ method: 'task.create', args });
      return taskCreateImpl(args);
    },
    update: (args: TaskUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'task.update', args });
      return taskUpdateImpl(args);
    },
  },
  project: {
    findFirst: (args: ProjectFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'project.findFirst', args });
      return projectFindFirstImpl(args);
    },
  },
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
  },
  toolDef: {
    findFirst: (args: ToolDefFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'toolDef.findFirst', args });
      return toolDefFindFirstImpl(args);
    },
    create: (args: ToolDefCreateArgs): Promise<unknown> => {
      calls.push({ method: 'toolDef.create', args });
      return toolDefCreateImpl(args);
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

mock.module('@/lib/atlas', {
  namedExports: {
    atlasChat: async () => 'Mock LLM response',
    submitGen: async () => ({ id: 'gen-1' }),
    pollOnce: async () => ({ status: 'completed', output: {} }),
    DEFAULT_CHAT_MODEL: 'test-model',
  },
});

mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      assembleContext: async () => ({ memories: [], summary: '0 memories' }),
      create: async () => ({ id: 'mem-1' }),
    },
  },
});

mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: async () => ({ id: 'evt-1' }),
    },
  },
});

// Mock the agent-runtime registerToolExecutor so importing built-in.ts doesn't fail
mock.module('@/lib/services/agent-runtime', {
  namedExports: {
    registerToolExecutor: (_name: string, _executor: unknown) => {},
    unregisterToolExecutor: (_name: string) => {},
  },
});

const { BUILT_IN_TOOLS, seedBuiltInTools } = await import('@/lib/tools/built-in');

function resetMock(): void {
  calls.length = 0;
  taskCreateImpl = async () => ({ id: 'task-1' });
  taskUpdateImpl = async () => ({});
  projectFindFirstImpl = async () => ({ id: 'proj-1' });
  memoryFindManyImpl = async () => [];
  toolDefFindFirstImpl = async () => null;
  toolDefCreateImpl = async () => ({ id: 'td-1' });
}

describe('Built-in Tools', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('BUILT_IN_TOOLS', () => {
    it('contains at least 10 tool definitions', () => {
      assert.ok(BUILT_IN_TOOLS.length >= 10);
    });

    it('each tool has required fields', () => {
      for (const tool of BUILT_IN_TOOLS) {
        assert.ok(tool.name, `Tool missing name`);
        assert.ok(tool.description, `Tool ${tool.name} missing description`);
        assert.ok(tool.category, `Tool ${tool.name} missing category`);
        assert.ok(tool.riskCategory, `Tool ${tool.name} missing riskCategory`);
        assert.ok(tool.timeoutSec > 0, `Tool ${tool.name} has invalid timeout`);
        assert.ok(tool.allowedRoles.length > 0, `Tool ${tool.name} has no allowed roles`);
      }
    });

    it('includes web_search tool', () => {
      const tool = BUILT_IN_TOOLS.find((t) => t.name === 'web_search');
      assert.ok(tool);
      assert.equal(tool!.category, 'research');
    });

    it('includes atlas_generate tool', () => {
      const tool = BUILT_IN_TOOLS.find((t) => t.name === 'atlas_generate');
      assert.ok(tool);
      assert.equal(tool!.category, 'creative');
    });

    it('includes github_search tool', () => {
      const tool = BUILT_IN_TOOLS.find((t) => t.name === 'github_search');
      assert.ok(tool);
      assert.equal(tool!.category, 'code');
    });

    it('includes task_create tool', () => {
      const tool = BUILT_IN_TOOLS.find((t) => t.name === 'task_create');
      assert.ok(tool);
      assert.equal(tool!.category, 'productivity');
    });
  });

  describe('seedBuiltInTools', () => {
    it('seeds all tools when none exist', async () => {
      toolDefFindFirstImpl = async () => null;

      const count = await seedBuiltInTools('ws-1');
      assert.equal(count, BUILT_IN_TOOLS.length);

      const createCalls = calls.filter((c) => c.method === 'toolDef.create');
      assert.equal(createCalls.length, BUILT_IN_TOOLS.length);
    });

    it('skips tools that already exist', async () => {
      toolDefFindFirstImpl = async () => ({ id: 'existing-td' });

      const count = await seedBuiltInTools('ws-1');
      assert.equal(count, 0);

      const createCalls = calls.filter((c) => c.method === 'toolDef.create');
      assert.equal(createCalls.length, 0);
    });

    it('seeds only missing tools', async () => {
      // First tool exists, rest don't
      let callCount = 0;
      toolDefFindFirstImpl = async () => {
        callCount++;
        return callCount === 1 ? { id: 'existing' } : null;
      };

      const count = await seedBuiltInTools('ws-1');
      assert.equal(count, BUILT_IN_TOOLS.length - 1);
    });
  });
});
