import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MockCreativeTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  cost: number;
  capabilities: string[];
  execute?: (input: unknown, context: unknown) => Promise<unknown>;
}

// The set of mock creative tools
let mockTools: MockCreativeTool[] = [];

// Track registered executors
const registeredExecutors = new Map<string, (...args: unknown[]) => Promise<unknown>>();

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// Mock @/lib/creative/tools
mock.module('@/lib/creative/tools', {
  namedExports: {
    listTools: (): MockCreativeTool[] => {
      calls.push({ method: 'listTools' });
      return [...mockTools];
    },
    getTool: (name: string): MockCreativeTool | undefined => {
      calls.push({ method: 'getTool', args: name });
      return mockTools.find((t) => t.name === name);
    },
    registerTool: (tool: MockCreativeTool): void => {
      calls.push({ method: 'registerTool', args: tool.name });
      mockTools.push(tool);
    },
    listToolNames: (): string[] => mockTools.map((t) => t.name),
  },
});

// Mock @/lib/services/agent-runtime
mock.module('@/lib/services/agent-runtime', {
  namedExports: {
    registerToolExecutor: (name: string, executor: (...args: unknown[]) => Promise<unknown>): void => {
      calls.push({ method: 'registerToolExecutor', args: name });
      registeredExecutors.set(name, executor);
    },
    unregisterToolExecutor: (name: string): void => {
      calls.push({ method: 'unregisterToolExecutor', args: name });
      registeredExecutors.delete(name);
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  mockTools = [];
  registeredExecutors.clear();
}

// Helper to create a mock creative tool
function makeTool(name: string, opts?: Partial<MockCreativeTool>): MockCreativeTool {
  return {
    name,
    description: opts?.description || `Tool ${name}`,
    inputSchema: opts?.inputSchema || { type: 'object', properties: {} },
    outputSchema: opts?.outputSchema || { type: 'object', properties: {} },
    cost: opts?.cost ?? 3,
    capabilities: opts?.capabilities || ['text'],
    execute: (opts && 'execute' in opts) ? opts.execute : (async () => ({ result: 'ok' })),
  };
}

const {
  registerCreativeTools,
  getCreativeToolNames,
  unregisterCreativeTools,
  getCreativeToolDefs,
} = await import('@/lib/tools/creative-bridge');

// ─────────────────────────────────────────────────────────────────────────────
// Creative Bridge
// ─────────────────────────────────────────────────────────────────────────────

describe('Creative Bridge', () => {
  beforeEach(() => {
    resetMock();
    unregisterCreativeTools();
  });

  describe('registerCreativeTools', () => {
    it('registers safe creative tools with creative. prefix', async () => {
      mockTools = [
        makeTool('creative.generateBrief'),
        makeTool('creative.generateHooks'),
        makeTool('creative.scoreCombination'),
      ];

      const registered = registerCreativeTools();

      assert.equal(registered.length, 3);
      assert.ok(registered.includes('creative.generateBrief'));
      assert.ok(registered.includes('creative.generateHooks'));
      assert.ok(registered.includes('creative.scoreCombination'));
      assert.ok(registeredExecutors.has('creative.generateBrief'));
      assert.ok(registeredExecutors.has('creative.generateHooks'));
      assert.ok(registeredExecutors.has('creative.scoreCombination'));
    });

    it('excludes unsafe tools (publishing/mutation)', async () => {
      mockTools = [
        makeTool('creative.generateBrief'),
        makeTool('creative.publish', { description: 'Publish ad' }),
        makeTool('creative.launchCampaign', { description: 'Launch campaign' }),
      ];

      const registered = registerCreativeTools();

      assert.equal(registered.length, 1);
      assert.ok(registered.includes('creative.generateBrief'));
      assert.ok(!registered.includes('creative.publish'));
      assert.ok(!registered.includes('creative.launchCampaign'));
    });

    it('skips tools without execute function', async () => {
      mockTools = [
        makeTool('creative.generateBrief'),
        makeTool('creative.contractOnly', { execute: undefined }),
      ];

      const registered = registerCreativeTools();

      assert.equal(registered.length, 1);
      assert.ok(registered.includes('creative.generateBrief'));
      assert.ok(!registered.includes('creative.contractOnly'));
    });

    it('is idempotent (does not duplicate registrations)', async () => {
      mockTools = [makeTool('creative.generateBrief')];

      const first = registerCreativeTools();
      const second = registerCreativeTools();

      assert.equal(first.length, 1);
      assert.equal(second.length, 0);
      assert.equal(registeredExecutors.size, 1);
    });
  });

  describe('getCreativeToolNames', () => {
    it('returns list of registered creative tool names', async () => {
      mockTools = [
        makeTool('creative.generateBrief'),
        makeTool('creative.generateHooks'),
        makeTool('creative.analyzeReference'),
      ];

      registerCreativeTools();
      const names = getCreativeToolNames();

      assert.equal(names.length, 3);
      assert.ok(names.includes('creative.generateBrief'));
      assert.ok(names.includes('creative.generateHooks'));
      assert.ok(names.includes('creative.analyzeReference'));
    });

    it('returns empty array when no tools registered', async () => {
      const names = getCreativeToolNames();
      assert.deepEqual(names, []);
    });
  });

  describe('getCreativeToolDefs', () => {
    it('returns tool defs with category creative', async () => {
      mockTools = [
        makeTool('creative.generateBrief', { description: 'Generate a brief' }),
        makeTool('creative.generateHooks', { description: 'Generate hooks' }),
      ];

      registerCreativeTools();
      const defs = getCreativeToolDefs();

      assert.equal(defs.length, 2);
      assert.ok(defs.every((d) => d.category === 'creative'));
      assert.ok(defs.every((d) => d.riskCategory === 'low'));
      assert.ok(defs.every((d) => d.budgetCategory === 'credits'));
    });
  });

  describe('unregisterCreativeTools', () => {
    it('removes all registered creative tools', async () => {
      mockTools = [
        makeTool('creative.generateBrief'),
        makeTool('creative.generateHooks'),
      ];

      registerCreativeTools();
      assert.equal(registeredExecutors.size, 2);

      unregisterCreativeTools();

      assert.equal(registeredExecutors.size, 0);
      assert.equal(getCreativeToolNames().length, 0);
    });

    it('allows re-registration after unregister', async () => {
      mockTools = [makeTool('creative.generateBrief')];

      registerCreativeTools();
      unregisterCreativeTools();
      const registered = registerCreativeTools();

      assert.equal(registered.length, 1);
      assert.ok(registeredExecutors.has('creative.generateBrief'));
    });
  });

  describe('executor wrapper', () => {
    it('wraps execute function and returns ok result', async () => {
      mockTools = [
        makeTool('creative.generateBrief', {
          execute: async () => ({ brief: 'test brief' }),
        }),
      ];

      registerCreativeTools();
      const executor = registeredExecutors.get('creative.generateBrief');
      assert.ok(executor);

      const result = await executor!(
        { product: 'test' },
        { workspaceId: 'ws-1', organizationId: 'org-1', agentRunId: 'run-1' },
      );

      const r = result as Record<string, unknown>;
      assert.equal(r.tool, 'creative.generateBrief');
      assert.equal(r.ok, true);
      assert.ok(r.output);
      assert.equal(r.cost, 3);
    });

    it('wraps execute function and returns error on failure', async () => {
      mockTools = [
        makeTool('creative.generateBrief', {
          execute: async () => { throw new Error('Generation failed'); },
        }),
      ];

      registerCreativeTools();
      const executor = registeredExecutors.get('creative.generateBrief');
      assert.ok(executor);

      const result = await executor!(
        { product: 'test' },
        { workspaceId: 'ws-1', organizationId: 'org-1', agentRunId: 'run-1' },
      );

      const r = result as Record<string, unknown>;
      assert.equal(r.tool, 'creative.generateBrief');
      assert.equal(r.ok, false);
      assert.equal(r.error, 'Generation failed');
      assert.equal(r.cost, 0);
    });
  });
});
