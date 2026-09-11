import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── Mock prisma ──
type AgentDefFindUniqueArgs = { where: { id: string } };
type AgentRunCreateArgs = { data: Record<string, unknown> };
type AgentRunUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type AgentRunFindFirstArgs = { where: Record<string, unknown> };
type AgentRunFindUniqueArgs = { where: { id: string } };

let agentDefFindUniqueImpl: (args: AgentDefFindUniqueArgs) => Promise<unknown> = async () => null;
let agentRunCreateImpl: (args: AgentRunCreateArgs) => Promise<unknown> = async () => ({ id: 'run-1' });
let agentRunUpdateImpl: (args: AgentRunUpdateArgs) => Promise<unknown> = async () => ({});
let agentRunFindFirstImpl: (args: AgentRunFindFirstArgs) => Promise<unknown> = async () => null;
let agentRunFindUniqueImpl: (args: AgentRunFindUniqueArgs) => Promise<unknown> = async () => null;

const calls: { method: string; args?: unknown }[] = [];

const prismaMock = {
  agentDef: {
    findUnique: (args: AgentDefFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'agentDef.findUnique', args });
      return agentDefFindUniqueImpl(args);
    },
  },
  agentRun: {
    create: (args: AgentRunCreateArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.create', args });
      return agentRunCreateImpl(args);
    },
    update: (args: AgentRunUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.update', args });
      return agentRunUpdateImpl(args);
    },
    findFirst: (args: AgentRunFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.findFirst', args });
      return agentRunFindFirstImpl(args);
    },
    findUnique: (args: AgentRunFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.findUnique', args });
      return agentRunFindUniqueImpl(args);
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

// Mock atlasChat
let atlasChatImpl: (messages: unknown[], model: string, maxTokens: number, timeoutMs: number) => Promise<string> =
  async () => 'I have completed the task.';

mock.module('@/lib/atlas', {
  namedExports: {
    atlasChat: (messages: unknown[], model: string, maxTokens: number, timeoutMs: number): Promise<string> => {
      calls.push({ method: 'atlasChat', args: { model, maxTokens } });
      return atlasChatImpl(messages, model, maxTokens, timeoutMs);
    },
    DEFAULT_CHAT_MODEL: 'test-model',
  },
});

// Mock services
mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      assembleContext: async () => ({ memories: [], summary: '0 memories' }),
      create: async () => ({ id: 'mem-1' }),
      createEpisodic: async () => ({ id: 'epi-1' }),
      listEpisodic: async () => [],
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

mock.module('@/lib/services/budget', {
  namedExports: {
    BudgetService: {
      check: async () => ({ allowed: true, remainingCredits: Infinity, remainingUsd: Infinity }),
      recordSpend: async () => ({ id: 'be-1' }),
    },
  },
});

mock.module('@/lib/services/approval', {
  namedExports: {
    ApprovalService: {
      request: async () => ({ id: 'apr-1', status: 'pending' }),
    },
  },
});

mock.module('@/lib/services/tool-registry', {
  namedExports: {
    ToolRegistryService: {
      getByName: async () => null,
      get: async () => null,
      checkAgentAllowed: async () => true,
    },
    ToolCallService: {
      start: async () => ({ id: 'tc-1' }),
      complete: async () => ({}),
      fail: async () => ({}),
    },
  },
});

const { AgentRuntime } = await import('@/lib/services/agent-runtime');

function resetMock(): void {
  calls.length = 0;
  agentDefFindUniqueImpl = async () => null;
  agentRunCreateImpl = async () => ({ id: 'run-1' });
  agentRunUpdateImpl = async () => ({});
  agentRunFindFirstImpl = async () => null;
  agentRunFindUniqueImpl = async () => null;
  atlasChatImpl = async () => 'I have completed the task.';
}

describe('AgentRuntime', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('run', () => {
    it('fails when agent not found', async () => {
      agentDefFindUniqueImpl = async () => null;

      const result = await AgentRuntime.run({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        agentId: 'nonexistent',
        objective: 'Test objective',
      });

      assert.equal(result.status, 'failed');
      assert.equal(result.error, 'Agent not found or disabled');
    });

    it('fails when agent is disabled', async () => {
      agentDefFindUniqueImpl = async () => ({
        id: 'agent-1',
        name: 'Test Agent',
        role: 'custom',
        enabled: false,
        instructions: 'Test',
        modelName: 'test-model',
        capabilities: '[]',
        verificationPolicy: '{}',
        timeoutSec: 30,
      });

      const result = await AgentRuntime.run({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        agentId: 'agent-1',
        objective: 'Test objective',
      });

      assert.equal(result.status, 'failed');
      assert.equal(result.error, 'Agent not found or disabled');
    });

    it('returns existing run when idempotency key matches', async () => {
      agentDefFindUniqueImpl = async () => ({
        id: 'agent-1',
        name: 'Test Agent',
        role: 'custom',
        enabled: true,
        instructions: 'Test',
        modelName: 'test-model',
        capabilities: '[]',
        verificationPolicy: '{}',
        timeoutSec: 30,
      });
      agentRunFindFirstImpl = async () => ({
        id: 'existing-run',
        status: 'completed',
        output: '{"result": "done"}',
        toolCalls: '[]',
        tokensUsed: 100,
        costCredits: 5,
        verification: null,
      });

      const result = await AgentRuntime.run({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        agentId: 'agent-1',
        objective: 'Test objective',
        idempotencyKey: 'key-123',
      });

      assert.equal(result.id, 'existing-run');
      assert.equal(result.status, 'completed');
    });

    it('creates a run and executes it', async () => {
      agentDefFindUniqueImpl = async () => ({
        id: 'agent-1',
        name: 'Test Agent',
        role: 'custom',
        enabled: true,
        instructions: 'You are a test agent.',
        modelName: 'test-model',
        capabilities: '[]',
        verificationPolicy: '{}',
        timeoutSec: 30,
      });
      agentRunCreateImpl = async () => ({ id: 'run-1' });
      atlasChatImpl = async () => 'Task completed successfully.';

      const result = await AgentRuntime.run({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        agentId: 'agent-1',
        objective: 'Do something',
      });

      assert.equal(result.status, 'completed');
      assert.ok(result.output);
      assert.ok(result.output.response);
    });
  });

  describe('parseToolCalls', () => {
    it('parses tool calls from LLM response', () => {
      const response = `I'll use a tool to help.

TOOL: web_search
INPUT: {"query": "test query"}

That's the result.`;

      const calls = AgentRuntime.parseToolCalls(response);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].tool, 'web_search');
      assert.deepEqual(calls[0].input, { query: 'test query' });
    });

    it('parses multiple tool calls', () => {
      const response = `TOOL: web_search
INPUT: {"query": "first"}

TOOL: read_company
INPUT: {"id": "org-1"}
`;

      const calls = AgentRuntime.parseToolCalls(response);
      assert.equal(calls.length, 2);
      assert.equal(calls[0].tool, 'web_search');
      assert.equal(calls[1].tool, 'read_company');
    });

    it('returns empty array when no tool calls', () => {
      const calls = AgentRuntime.parseToolCalls('Just a regular response with no tools.');
      assert.equal(calls.length, 0);
    });

    it('handles malformed JSON input gracefully', () => {
      const response = `TOOL: web_search
INPUT: {invalid json}`;

      const calls = AgentRuntime.parseToolCalls(response);
      assert.equal(calls.length, 1);
      assert.ok(calls[0].input.raw);
    });
  });

  describe('parseOutput', () => {
    it('removes tool call lines and returns the rest', () => {
      const response = `TOOL: web_search
INPUT: {"query": "test"}
Here is my final response.`;

      const output = AgentRuntime.parseOutput(response);
      assert.ok(output.response);
      assert.equal(output.response, 'Here is my final response.');
    });

    it('includes timestamp', () => {
      const output = AgentRuntime.parseOutput('Test response');
      assert.ok(output.timestamp);
    });
  });

  describe('verifyOutput', () => {
    it('passes when output is not empty', async () => {
      const result = await AgentRuntime.verifyOutput(
        { verificationPolicy: '{}' },
        { workspaceId: 'ws-1', organizationId: 'org-1', agentId: 'a-1', objective: 'test' },
        { response: 'Done' },
      );
      assert.equal(result.passed, true);
    });

    it('fails when output is empty', async () => {
      const result = await AgentRuntime.verifyOutput(
        { verificationPolicy: '{"criteria": ["output_not_empty"]}' },
        { workspaceId: 'ws-1', organizationId: 'org-1', agentId: 'a-1', objective: 'test' },
        {},
      );
      assert.equal(result.passed, false);
      assert.ok(result.failures.length > 0);
    });
  });

  describe('cancelRun', () => {
    it('updates run status to cancelled', async () => {
      let updatedData: Record<string, unknown> | null = null;
      agentRunUpdateImpl = async (args: AgentRunUpdateArgs) => {
        updatedData = args.data as Record<string, unknown>;
        return {};
      };

      await AgentRuntime.cancelRun('run-1');
      assert.ok(updatedData);
      assert.equal((updatedData as Record<string, unknown>).status, 'cancelled');
    });
  });
});
