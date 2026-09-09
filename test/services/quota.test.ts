import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type QuotaFindUniqueArgs = {
  where: { workspaceId: string } | { id: string };
  select?: Record<string, unknown>;
};

type QuotaCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string;
    maxAgents?: number;
    maxTasks?: number;
    maxDocuments?: number;
    maxAutomations?: number;
    maxTickets?: number;
    maxStorageMb?: number;
    maxAgentRunsPerDay?: number;
    maxSandboxRunsPerDay?: number;
  };
};

type QuotaUpdateArgs = {
  where: { workspaceId: string };
  data: Record<string, number>;
};

type WorkspaceFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

type CountArgs = {
  where: Record<string, unknown>;
};

type FindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

const defaultQuotaRecord = {
  id: 'quota-1',
  organizationId: 'org-1',
  workspaceId: 'ws-1',
  maxAgents: 10,
  maxTasks: 1000,
  maxDocuments: 500,
  maxAutomations: 50,
  maxTickets: 500,
  maxStorageMb: 5000,
  maxAgentRunsPerDay: 100,
  maxSandboxRunsPerDay: 50,
};

let quotaFindUniqueImpl: (args: QuotaFindUniqueArgs) => Promise<unknown> =
  async () => null;
let quotaCreateImpl: (args: QuotaCreateArgs) => Promise<unknown> =
  async () => ({ ...defaultQuotaRecord });
let quotaUpdateImpl: (args: QuotaUpdateArgs) => Promise<unknown> =
  async () => ({ ...defaultQuotaRecord });

let workspaceFindUniqueImpl: (args: WorkspaceFindUniqueArgs) => Promise<unknown> =
  async () => ({ id: 'ws-1', organizationId: 'org-1' });

let agentDefCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;
let taskCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;
let documentCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;
let automationCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;
let ticketCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;
let agentRunCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;
let sandboxRunCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;

let projectFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> =
  async () => [{ id: 'proj-1' }];

const prismaMock = {
  workspaceQuota: {
    findUnique: (args: QuotaFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'workspaceQuota.findUnique', args });
      return quotaFindUniqueImpl(args);
    },
    create: (args: QuotaCreateArgs): Promise<unknown> => {
      calls.push({ method: 'workspaceQuota.create', args });
      return quotaCreateImpl(args);
    },
    update: (args: QuotaUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'workspaceQuota.update', args });
      return quotaUpdateImpl(args);
    },
  },
  workspace: {
    findUnique: (args: WorkspaceFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'workspace.findUnique', args });
      return workspaceFindUniqueImpl(args);
    },
  },
  agentDef: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'agentDef.count', args });
      return agentDefCountImpl(args);
    },
  },
  task: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'task.count', args });
      return taskCountImpl(args);
    },
  },
  document: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'document.count', args });
      return documentCountImpl(args);
    },
  },
  automation: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'automation.count', args });
      return automationCountImpl(args);
    },
  },
  ticket: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'ticket.count', args });
      return ticketCountImpl(args);
    },
  },
  agentRun: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'agentRun.count', args });
      return agentRunCountImpl(args);
    },
  },
  sandboxRun: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'sandboxRun.count', args });
      return sandboxRunCountImpl(args);
    },
  },
  project: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'project.findMany', args });
      return projectFindManyImpl(args);
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
  quotaFindUniqueImpl = async () => null;
  quotaCreateImpl = async () => ({ ...defaultQuotaRecord });
  quotaUpdateImpl = async () => ({ ...defaultQuotaRecord });
  workspaceFindUniqueImpl = async () => ({ id: 'ws-1', organizationId: 'org-1' });
  agentDefCountImpl = async () => 0;
  taskCountImpl = async () => 0;
  documentCountImpl = async () => 0;
  automationCountImpl = async () => 0;
  ticketCountImpl = async () => 0;
  agentRunCountImpl = async () => 0;
  sandboxRunCountImpl = async () => 0;
  projectFindManyImpl = async () => [{ id: 'proj-1' }];
}

const { QuotaService } = await import('@/lib/services/quota');

// ─────────────────────────────────────────────────────────────────────────────
// QuotaService
// ─────────────────────────────────────────────────────────────────────────────

describe('QuotaService', () => {
  beforeEach(() => { resetMock(); });

  describe('getQuota', () => {
    it('returns existing quota without creating a new one', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });

      const result = await QuotaService.getQuota('ws-1');

      assert.ok(result);
      assert.equal((result as { workspaceId: string }).workspaceId, 'ws-1');
      assert.equal(calls[0].method, 'workspaceQuota.findUnique');
      // Should not have called create
      const createCalls = calls.filter((c) => c.method === 'workspaceQuota.create');
      assert.equal(createCalls.length, 0);
    });

    it('creates a default quota when none exists', async () => {
      quotaFindUniqueImpl = async () => null;
      quotaCreateImpl = async (args: QuotaCreateArgs) => {
        assert.equal(args.data.organizationId, 'org-1');
        assert.equal(args.data.workspaceId, 'ws-1');
        assert.equal(args.data.maxAgents, 10);
        assert.equal(args.data.maxTasks, 1000);
        return { ...defaultQuotaRecord, ...args.data };
      };

      const result = await QuotaService.getQuota('ws-1');

      assert.ok(result);
      assert.equal((result as { workspaceId: string }).workspaceId, 'ws-1');
      const createCalls = calls.filter((c) => c.method === 'workspaceQuota.create');
      assert.equal(createCalls.length, 1);
    });

    it('returns null when workspace does not exist', async () => {
      quotaFindUniqueImpl = async () => null;
      workspaceFindUniqueImpl = async () => null;

      const result = await QuotaService.getQuota('nonexistent');
      assert.equal(result, null);
    });
  });

  describe('updateQuota', () => {
    it('updates quota limits for a workspace', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      quotaUpdateImpl = async (args: QuotaUpdateArgs) => {
        assert.equal(args.where.workspaceId, 'ws-1');
        assert.equal(args.data.maxAgents, 20);
        assert.equal(args.data.maxTasks, 2000);
        return { ...defaultQuotaRecord, maxAgents: 20, maxTasks: 2000 };
      };

      const result = await QuotaService.updateQuota('ws-1', {
        maxAgents: 20,
        maxTasks: 2000,
      });

      assert.ok(result);
      assert.equal((result as { maxAgents: number }).maxAgents, 20);
      const updateCalls = calls.filter((c) => c.method === 'workspaceQuota.update');
      assert.equal(updateCalls.length, 1);
    });

    it('only updates provided fields', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      quotaUpdateImpl = async (args: QuotaUpdateArgs) => {
        assert.equal(args.data.maxAgents, 15);
        assert.equal(args.data.maxTasks, undefined);
        return { ...defaultQuotaRecord, maxAgents: 15 };
      };

      await QuotaService.updateQuota('ws-1', { maxAgents: 15 });

      const updateCalls = calls.filter((c) => c.method === 'workspaceQuota.update');
      const args = updateCalls[0].args as QuotaUpdateArgs;
      assert.equal(args.data.maxAgents, 15);
      assert.equal(args.data.maxTasks, undefined);
    });
  });

  describe('checkAgentQuota', () => {
    it('returns allowed when under limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      agentDefCountImpl = async () => 5;

      const result = await QuotaService.checkAgentQuota('ws-1');

      assert.equal(result.allowed, true);
      assert.equal(result.current, 5);
      assert.equal(result.max, 10);
    });

    it('returns not allowed when at or over limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      agentDefCountImpl = async () => 10;

      const result = await QuotaService.checkAgentQuota('ws-1');

      assert.equal(result.allowed, false);
      assert.equal(result.current, 10);
      assert.equal(result.max, 10);
    });
  });

  describe('checkTaskQuota', () => {
    it('returns allowed when under limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      projectFindManyImpl = async () => [{ id: 'proj-1' }, { id: 'proj-2' }];
      taskCountImpl = async () => 500;

      const result = await QuotaService.checkTaskQuota('ws-1');

      assert.equal(result.allowed, true);
      assert.equal(result.current, 500);
      assert.equal(result.max, 1000);
    });

    it('returns 0 current when workspace has no projects', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      projectFindManyImpl = async () => [];

      const result = await QuotaService.checkTaskQuota('ws-1');

      assert.equal(result.current, 0);
      assert.equal(result.allowed, true);
    });

    it('returns not allowed when over limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      projectFindManyImpl = async () => [{ id: 'proj-1' }];
      taskCountImpl = async () => 1000;

      const result = await QuotaService.checkTaskQuota('ws-1');

      assert.equal(result.allowed, false);
      assert.equal(result.current, 1000);
    });
  });

  describe('checkDocumentQuota', () => {
    it('returns allowed when under limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      documentCountImpl = async () => 100;

      const result = await QuotaService.checkDocumentQuota('ws-1');

      assert.equal(result.allowed, true);
      assert.equal(result.current, 100);
      assert.equal(result.max, 500);
    });

    it('returns not allowed when at limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      documentCountImpl = async () => 500;

      const result = await QuotaService.checkDocumentQuota('ws-1');

      assert.equal(result.allowed, false);
      assert.equal(result.current, 500);
    });
  });

  describe('checkAutomationQuota', () => {
    it('returns allowed when under limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      automationCountImpl = async () => 25;

      const result = await QuotaService.checkAutomationQuota('ws-1');

      assert.equal(result.allowed, true);
      assert.equal(result.current, 25);
      assert.equal(result.max, 50);
    });
  });

  describe('checkTicketQuota', () => {
    it('returns allowed when under limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      ticketCountImpl = async () => 200;

      const result = await QuotaService.checkTicketQuota('ws-1');

      assert.equal(result.allowed, true);
      assert.equal(result.current, 200);
      assert.equal(result.max, 500);
    });

    it('returns not allowed when over limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      ticketCountImpl = async () => 500;

      const result = await QuotaService.checkTicketQuota('ws-1');

      assert.equal(result.allowed, false);
      assert.equal(result.current, 500);
    });
  });

  describe('checkAgentRunQuota', () => {
    it('returns allowed when under daily limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      agentRunCountImpl = async () => 50;

      const result = await QuotaService.checkAgentRunQuota('ws-1');

      assert.equal(result.allowed, true);
      assert.equal(result.current, 50);
      assert.equal(result.max, 100);
    });

    it('returns not allowed when at daily limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      agentRunCountImpl = async () => 100;

      const result = await QuotaService.checkAgentRunQuota('ws-1');

      assert.equal(result.allowed, false);
      assert.equal(result.current, 100);
    });
  });

  describe('checkSandboxRunQuota', () => {
    it('returns allowed when under daily limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      sandboxRunCountImpl = async () => 25;

      const result = await QuotaService.checkSandboxRunQuota('ws-1');

      assert.equal(result.allowed, true);
      assert.equal(result.current, 25);
      assert.equal(result.max, 50);
    });

    it('returns not allowed when at daily limit', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      sandboxRunCountImpl = async () => 50;

      const result = await QuotaService.checkSandboxRunQuota('ws-1');

      assert.equal(result.allowed, false);
      assert.equal(result.current, 50);
    });
  });

  describe('getUsageSummary', () => {
    it('returns full summary with all quotas and usage', async () => {
      quotaFindUniqueImpl = async () => ({ ...defaultQuotaRecord });
      agentDefCountImpl = async () => 3;
      projectFindManyImpl = async () => [{ id: 'proj-1' }];
      taskCountImpl = async () => 150;
      documentCountImpl = async () => 75;
      automationCountImpl = async () => 10;
      ticketCountImpl = async () => 25;
      agentRunCountImpl = async () => 30;
      sandboxRunCountImpl = async () => 15;

      const result = await QuotaService.getUsageSummary('ws-1');

      assert.ok(result);
      assert.equal(result!.quota.workspaceId, 'ws-1');
      assert.equal(result!.quota.maxAgents, 10);
      assert.equal(result!.usage.agents.current, 3);
      assert.equal(result!.usage.agents.allowed, true);
      assert.equal(result!.usage.tasks.current, 150);
      assert.equal(result!.usage.documents.current, 75);
      assert.equal(result!.usage.automations.current, 10);
      assert.equal(result!.usage.tickets.current, 25);
      assert.equal(result!.usage.agentRuns.current, 30);
      assert.equal(result!.usage.sandboxRuns.current, 15);
    });

    it('returns null when workspace does not exist', async () => {
      quotaFindUniqueImpl = async () => null;
      workspaceFindUniqueImpl = async () => null;

      const result = await QuotaService.getUsageSummary('nonexistent');
      assert.equal(result, null);
    });
  });
});
