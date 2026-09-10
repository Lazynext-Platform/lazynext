import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type AgentDefFindFirstArgs = {
  where: { workspaceId: string; name: string };
  select?: Record<string, boolean>;
};

type AgentDefFindManyArgs = {
  where: { workspaceId: string };
  select?: Record<string, boolean>;
};

type AgentDefCreateArgs = {
  data: {
    workspaceId: string;
    name: string;
    role: string;
    modelProvider: string;
    modelName: string;
    instructions: string;
    toolIds: string;
    capabilities: string;
    permissions: string;
    enabled: boolean;
  };
  select?: Record<string, boolean>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let agentDefFindFirstImpl: (args: AgentDefFindFirstArgs) => Promise<unknown> =
  async () => null;
let agentDefFindManyImpl: (args: AgentDefFindManyArgs) => Promise<unknown[]> =
  async () => [];
let agentDefCreateImpl: (args: AgentDefCreateArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  agentDef: {
    findFirst: (args: AgentDefFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'agentDef.findFirst', args });
      return agentDefFindFirstImpl(args);
    },
    findMany: (args: AgentDefFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'agentDef.findMany', args });
      return agentDefFindManyImpl(args);
    },
    create: (args: AgentDefCreateArgs): Promise<unknown> => {
      calls.push({ method: 'agentDef.create', args });
      return agentDefCreateImpl(args);
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

function resetMock(): void {
  calls.length = 0;
  agentDefFindFirstImpl = async () => null;
  agentDefFindManyImpl = async () => [];
  agentDefCreateImpl = async () => ({});
}

const { AgentSeedService } = await import('@/lib/services/agent-seed');

// ─────────────────────────────────────────────────────────────────────────────
// AgentSeedService
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentSeedService', () => {
  beforeEach(() => { resetMock(); });

  describe('seedDefaultAgents', () => {
    it('creates all 6 default agents when none exist', async () => {
      agentDefFindFirstImpl = async () => null;
      const createdNames: string[] = [];
      agentDefCreateImpl = async (args: AgentDefCreateArgs) => {
        createdNames.push(args.data.name);
        return {
          id: `agent-${args.data.role}`,
          name: args.data.name,
          role: args.data.role,
          workspaceId: args.data.workspaceId,
        };
      };

      const result = await AgentSeedService.seedDefaultAgents('ws-1', 'org-1', 'user-1');

      assert.equal(result.length, 6);
      assert.equal(createdNames.length, 6);
      assert.ok(result.every((a) => a.isNew === true));
      assert.ok(createdNames.includes('Growth Manager'));
      assert.ok(createdNames.includes('Design Lead'));
      assert.ok(createdNames.includes('Engineering Lead'));
      assert.ok(createdNames.includes('Research Analyst'));
      assert.ok(createdNames.includes('Product Manager'));
      assert.ok(createdNames.includes('Operations Manager'));
    });

    it('skips agents that already exist', async () => {
      let callCount = 0;
      agentDefFindFirstImpl = async (args: AgentDefFindFirstArgs) => {
        callCount++;
        // Return existing for Growth Manager only
        if (args.where.name === 'Growth Manager') {
          return {
            id: 'existing-growth',
            name: 'Growth Manager',
            role: 'growth',
            workspaceId: args.where.workspaceId,
          };
        }
        return null;
      };
      agentDefCreateImpl = async (args: AgentDefCreateArgs) => ({
        id: `agent-${args.data.role}`,
        name: args.data.name,
        role: args.data.role,
        workspaceId: args.data.workspaceId,
      });

      const result = await AgentSeedService.seedDefaultAgents('ws-1', 'org-1', 'user-1');

      assert.equal(result.length, 6);
      const growth = result.find((a) => a.name === 'Growth Manager');
      assert.ok(growth);
      assert.equal(growth!.isNew, false);
      assert.equal(growth!.id, 'existing-growth');
      const design = result.find((a) => a.name === 'Design Lead');
      assert.ok(design);
      assert.equal(design!.isNew, true);
    });

    it('checks by name + workspaceId', async () => {
      agentDefFindFirstImpl = async (args: AgentDefFindFirstArgs) => {
        assert.equal(args.where.workspaceId, 'ws-1');
        assert.equal(typeof args.where.name, 'string');
        return null;
      };
      agentDefCreateImpl = async () => ({
        id: 'x',
        name: 'x',
        role: 'x',
        workspaceId: 'ws-1',
      });

      await AgentSeedService.seedDefaultAgents('ws-1', 'org-1', 'user-1');

      const findFirstCalls = calls.filter((c) => c.method === 'agentDef.findFirst');
      assert.equal(findFirstCalls.length, 6);
    });

    it('creates agents with correct role from template', async () => {
      agentDefFindFirstImpl = async () => null;
      const roles: string[] = [];
      agentDefCreateImpl = async (args: AgentDefCreateArgs) => {
        roles.push(args.data.role);
        return {
          id: `agent-${args.data.role}`,
          name: args.data.name,
          role: args.data.role,
          workspaceId: args.data.workspaceId,
        };
      };

      await AgentSeedService.seedDefaultAgents('ws-1', 'org-1', 'user-1');

      assert.ok(roles.includes('growth'));
      assert.ok(roles.includes('design'));
      assert.ok(roles.includes('engineering'));
      assert.ok(roles.includes('research'));
      assert.ok(roles.includes('product'));
      assert.ok(roles.includes('operations'));
    });

    it('stores tool names in toolIds as JSON array', async () => {
      agentDefFindFirstImpl = async () => null;
      let growthToolIds = '';
      agentDefCreateImpl = async (args: AgentDefCreateArgs) => {
        if (args.data.role === 'growth') {
          growthToolIds = args.data.toolIds;
        }
        return {
          id: `agent-${args.data.role}`,
          name: args.data.name,
          role: args.data.role,
          workspaceId: args.data.workspaceId,
        };
      };

      await AgentSeedService.seedDefaultAgents('ws-1', 'org-1', 'user-1');

      const tools = JSON.parse(growthToolIds);
      assert.ok(Array.isArray(tools));
      assert.ok(tools.includes('creative.generateBrief'));
      assert.ok(tools.includes('company_query'));
      assert.ok(tools.includes('task_create'));
    });

    it('returns created list with isNew flag', async () => {
      agentDefFindFirstImpl = async (args) => {
        if (args.where.name === 'Design Lead') {
          return { id: 'existing', name: 'Design Lead', role: 'design', workspaceId: 'ws-1' };
        }
        return null;
      };
      agentDefCreateImpl = async (args) => ({
        id: `new-${args.data.role}`,
        name: args.data.name,
        role: args.data.role,
        workspaceId: args.data.workspaceId,
      });

      const result = await AgentSeedService.seedDefaultAgents('ws-1', 'org-1', 'user-1');

      const newAgents = result.filter((a) => a.isNew);
      const existingAgents = result.filter((a) => !a.isNew);
      assert.equal(newAgents.length, 5);
      assert.equal(existingAgents.length, 1);
      assert.equal(existingAgents[0].name, 'Design Lead');
    });

    it('continues on create error (skips failed agent)', async () => {
      agentDefFindFirstImpl = async () => null;
      let createCount = 0;
      agentDefCreateImpl = async (args: AgentDefCreateArgs) => {
        createCount++;
        if (args.data.role === 'growth') {
          throw new Error('DB error');
        }
        return {
          id: `agent-${args.data.role}`,
          name: args.data.name,
          role: args.data.role,
          workspaceId: args.data.workspaceId,
        };
      };

      const result = await AgentSeedService.seedDefaultAgents('ws-1', 'org-1', 'user-1');

      // Growth failed, so only 5 agents in result
      assert.equal(result.length, 5);
      assert.ok(!result.find((a) => a.name === 'Growth Manager'));
      assert.equal(createCount, 6);
    });

    it('sets enabled=true for all created agents', async () => {
      agentDefFindFirstImpl = async () => null;
      const enabledFlags: boolean[] = [];
      agentDefCreateImpl = async (args: AgentDefCreateArgs) => {
        enabledFlags.push(args.data.enabled);
        return {
          id: `agent-${args.data.role}`,
          name: args.data.name,
          role: args.data.role,
          workspaceId: args.data.workspaceId,
        };
      };

      await AgentSeedService.seedDefaultAgents('ws-1', 'org-1', 'user-1');

      assert.equal(enabledFlags.length, 6);
      assert.ok(enabledFlags.every((e) => e === true));
    });
  });

  describe('listDefaultAgentTemplates', () => {
    it('returns all 6 templates', () => {
      const templates = AgentSeedService.listDefaultAgentTemplates();
      assert.equal(templates.length, 6);
      const roles = templates.map((t) => t.role);
      assert.ok(roles.includes('growth'));
      assert.ok(roles.includes('design'));
      assert.ok(roles.includes('engineering'));
      assert.ok(roles.includes('research'));
      assert.ok(roles.includes('product'));
      assert.ok(roles.includes('operations'));
    });

    it('returns templates with tools array', () => {
      const templates = AgentSeedService.listDefaultAgentTemplates();
      const growth = templates.find((t) => t.role === 'growth');
      assert.ok(growth);
      assert.ok(Array.isArray(growth!.tools));
      assert.ok(growth!.tools.length > 0);
    });
  });

  describe('checkSeededAgents', () => {
    it('returns status for all templates with exists flag', async () => {
      agentDefFindManyImpl = async () => [
        { id: 'a1', name: 'Growth Manager', role: 'growth' },
      ];

      const status = await AgentSeedService.checkSeededAgents('ws-1');

      assert.equal(status.length, 6);
      const growth = status.find((s) => s.name === 'Growth Manager');
      assert.ok(growth);
      assert.equal(growth!.exists, true);
      assert.equal(growth!.agentId, 'a1');
      const design = status.find((s) => s.name === 'Design Lead');
      assert.ok(design);
      assert.equal(design!.exists, false);
    });

    it('returns empty exists on error (safePrisma fallback)', async () => {
      agentDefFindManyImpl = async () => { throw new Error('DB down'); };

      const status = await AgentSeedService.checkSeededAgents('ws-1');

      assert.equal(status.length, 6);
      assert.ok(status.every((s) => s.exists === false));
    });
  });

  describe('seedAllDefaultAgents (alias)', () => {
    it('is an alias for seedDefaultAgents', async () => {
      agentDefFindFirstImpl = async () => null;
      agentDefCreateImpl = async (args) => ({
        id: `agent-${args.data.role}`,
        name: args.data.name,
        role: args.data.role,
        workspaceId: args.data.workspaceId,
      });

      const result = await AgentSeedService.seedAllDefaultAgents('ws-1', 'org-1', 'user-1');

      assert.equal(result.length, 6);
      assert.ok(result.every((a) => a.isNew === true));
    });
  });
});
