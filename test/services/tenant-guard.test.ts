import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// Mutable implementation functions for each model
let taskFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let customerFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let dealFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let planFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let goalFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let approvalFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let memoryFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let knowledgeBaseFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let automationFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let ticketFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let agentRunFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let toolDefFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let sandboxRunFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let securityEventFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => null;
let workspaceFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> =
  async () => ({ id: 'ws-1', organizationId: 'org-1' });

const prismaMock = {
  task: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'task.findUnique', args });
      return taskFindUniqueImpl(args);
    },
  },
  customer: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'customer.findUnique', args });
      return customerFindUniqueImpl(args);
    },
  },
  deal: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'deal.findUnique', args });
      return dealFindUniqueImpl(args);
    },
  },
  plan: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'plan.findUnique', args });
      return planFindUniqueImpl(args);
    },
  },
  goal: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'goal.findUnique', args });
      return goalFindUniqueImpl(args);
    },
  },
  approval: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'approval.findUnique', args });
      return approvalFindUniqueImpl(args);
    },
  },
  memory: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
  },
  knowledgeBase: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeBase.findUnique', args });
      return knowledgeBaseFindUniqueImpl(args);
    },
  },
  automation: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'automation.findUnique', args });
      return automationFindUniqueImpl(args);
    },
  },
  ticket: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'ticket.findUnique', args });
      return ticketFindUniqueImpl(args);
    },
  },
  agentRun: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.findUnique', args });
      return agentRunFindUniqueImpl(args);
    },
  },
  toolDef: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'toolDef.findUnique', args });
      return toolDefFindUniqueImpl(args);
    },
  },
  sandboxRun: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'sandboxRun.findUnique', args });
      return sandboxRunFindUniqueImpl(args);
    },
  },
  securityEvent: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'securityEvent.findUnique', args });
      return securityEventFindUniqueImpl(args);
    },
  },
  workspace: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'workspace.findUnique', args });
      return workspaceFindUniqueImpl(args);
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
  taskFindUniqueImpl = async () => null;
  customerFindUniqueImpl = async () => null;
  dealFindUniqueImpl = async () => null;
  planFindUniqueImpl = async () => null;
  goalFindUniqueImpl = async () => null;
  approvalFindUniqueImpl = async () => null;
  memoryFindUniqueImpl = async () => null;
  knowledgeBaseFindUniqueImpl = async () => null;
  automationFindUniqueImpl = async () => null;
  ticketFindUniqueImpl = async () => null;
  agentRunFindUniqueImpl = async () => null;
  toolDefFindUniqueImpl = async () => null;
  sandboxRunFindUniqueImpl = async () => null;
  securityEventFindUniqueImpl = async () => null;
  workspaceFindUniqueImpl = async () => ({ id: 'ws-1', organizationId: 'org-1' });
}

const { TenantGuardService } = await import('@/lib/services/tenant-guard');

// ─────────────────────────────────────────────────────────────────────────────
// TenantGuardService
// ─────────────────────────────────────────────────────────────────────────────

describe('TenantGuardService', () => {
  beforeEach(() => { resetMock(); });

  describe('verifyTaskOwnership', () => {
    it('returns true when task belongs to workspace', async () => {
      taskFindUniqueImpl = async () => ({
        project: { workspaceId: 'ws-1' },
      });

      const result = await TenantGuardService.verifyTaskOwnership('task-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when task belongs to different workspace', async () => {
      taskFindUniqueImpl = async () => ({
        project: { workspaceId: 'ws-other' },
      });

      const result = await TenantGuardService.verifyTaskOwnership('task-1', 'ws-1');
      assert.equal(result, false);
    });

    it('returns false when task does not exist', async () => {
      taskFindUniqueImpl = async () => null;

      const result = await TenantGuardService.verifyTaskOwnership('nonexistent', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifyCustomerOwnership', () => {
    it('returns true when customer workspaceId matches', async () => {
      customerFindUniqueImpl = async () => ({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
      });

      const result = await TenantGuardService.verifyCustomerOwnership('cust-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns true when customer organizationId matches workspace org', async () => {
      customerFindUniqueImpl = async () => ({
        workspaceId: null,
        organizationId: 'org-1',
      });
      workspaceFindUniqueImpl = async () => ({
        id: 'ws-1',
        organizationId: 'org-1',
      });

      const result = await TenantGuardService.verifyCustomerOwnership('cust-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when customer belongs to different org', async () => {
      customerFindUniqueImpl = async () => ({
        workspaceId: null,
        organizationId: 'org-other',
      });
      workspaceFindUniqueImpl = async () => ({
        id: 'ws-1',
        organizationId: 'org-1',
      });

      const result = await TenantGuardService.verifyCustomerOwnership('cust-1', 'ws-1');
      assert.equal(result, false);
    });

    it('returns false when customer does not exist', async () => {
      customerFindUniqueImpl = async () => null;

      const result = await TenantGuardService.verifyCustomerOwnership('nonexistent', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifyDealOwnership', () => {
    it('returns true when deal workspaceId matches', async () => {
      dealFindUniqueImpl = async () => ({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
      });

      const result = await TenantGuardService.verifyDealOwnership('deal-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when deal belongs to different workspace', async () => {
      dealFindUniqueImpl = async () => ({
        workspaceId: 'ws-other',
        organizationId: 'org-other',
      });

      const result = await TenantGuardService.verifyDealOwnership('deal-1', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifyPlanOwnership', () => {
    it('returns true when plan workspaceId matches', async () => {
      planFindUniqueImpl = async () => ({ workspaceId: 'ws-1' });

      const result = await TenantGuardService.verifyPlanOwnership('plan-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when plan belongs to different workspace', async () => {
      planFindUniqueImpl = async () => ({ workspaceId: 'ws-other' });

      const result = await TenantGuardService.verifyPlanOwnership('plan-1', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifyGoalOwnership', () => {
    it('returns true when goal workspaceId matches', async () => {
      goalFindUniqueImpl = async () => ({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
      });

      const result = await TenantGuardService.verifyGoalOwnership('goal-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns true when goal organizationId matches workspace org', async () => {
      goalFindUniqueImpl = async () => ({
        workspaceId: null,
        organizationId: 'org-1',
      });
      workspaceFindUniqueImpl = async () => ({
        id: 'ws-1',
        organizationId: 'org-1',
      });

      const result = await TenantGuardService.verifyGoalOwnership('goal-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when goal belongs to different org', async () => {
      goalFindUniqueImpl = async () => ({
        workspaceId: null,
        organizationId: 'org-other',
      });
      workspaceFindUniqueImpl = async () => ({
        id: 'ws-1',
        organizationId: 'org-1',
      });

      const result = await TenantGuardService.verifyGoalOwnership('goal-1', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifyApprovalOwnership', () => {
    it('returns true when approval workspaceId matches', async () => {
      approvalFindUniqueImpl = async () => ({ workspaceId: 'ws-1' });

      const result = await TenantGuardService.verifyApprovalOwnership('appr-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when approval belongs to different workspace', async () => {
      approvalFindUniqueImpl = async () => ({ workspaceId: 'ws-other' });

      const result = await TenantGuardService.verifyApprovalOwnership('appr-1', 'ws-1');
      assert.equal(result, false);
    });

    it('returns false when approval does not exist', async () => {
      approvalFindUniqueImpl = async () => null;

      const result = await TenantGuardService.verifyApprovalOwnership('nonexistent', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifyAgentRunOwnership', () => {
    it('returns true when agent run belongs to workspace via agent', async () => {
      agentRunFindUniqueImpl = async () => ({
        agent: { workspaceId: 'ws-1' },
      });

      const result = await TenantGuardService.verifyAgentRunOwnership('run-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when agent run belongs to different workspace', async () => {
      agentRunFindUniqueImpl = async () => ({
        agent: { workspaceId: 'ws-other' },
      });

      const result = await TenantGuardService.verifyAgentRunOwnership('run-1', 'ws-1');
      assert.equal(result, false);
    });

    it('returns false when agent run does not exist', async () => {
      agentRunFindUniqueImpl = async () => null;

      const result = await TenantGuardService.verifyAgentRunOwnership('nonexistent', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifyToolOwnership', () => {
    it('returns true when tool workspaceId matches', async () => {
      toolDefFindUniqueImpl = async () => ({ workspaceId: 'ws-1' });

      const result = await TenantGuardService.verifyToolOwnership('tool-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when tool belongs to different workspace', async () => {
      toolDefFindUniqueImpl = async () => ({ workspaceId: 'ws-other' });

      const result = await TenantGuardService.verifyToolOwnership('tool-1', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifyKnowledgeBaseOwnership', () => {
    it('returns true when knowledge base workspaceId matches', async () => {
      knowledgeBaseFindUniqueImpl = async () => ({ workspaceId: 'ws-1' });

      const result = await TenantGuardService.verifyKnowledgeBaseOwnership('kb-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when knowledge base belongs to different workspace', async () => {
      knowledgeBaseFindUniqueImpl = async () => ({ workspaceId: 'ws-other' });

      const result = await TenantGuardService.verifyKnowledgeBaseOwnership('kb-1', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifySandboxRunOwnership', () => {
    it('returns true when sandbox run workspaceId matches', async () => {
      sandboxRunFindUniqueImpl = async () => ({ workspaceId: 'ws-1' });

      const result = await TenantGuardService.verifySandboxRunOwnership('run-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when sandbox run belongs to different workspace', async () => {
      sandboxRunFindUniqueImpl = async () => ({ workspaceId: 'ws-other' });

      const result = await TenantGuardService.verifySandboxRunOwnership('run-1', 'ws-1');
      assert.equal(result, false);
    });
  });

  describe('verifySecurityEventOwnership', () => {
    it('returns true when security event workspaceId matches', async () => {
      securityEventFindUniqueImpl = async () => ({ workspaceId: 'ws-1' });

      const result = await TenantGuardService.verifySecurityEventOwnership('evt-1', 'ws-1');
      assert.equal(result, true);
    });

    it('returns false when security event belongs to different workspace', async () => {
      securityEventFindUniqueImpl = async () => ({ workspaceId: 'ws-other' });

      const result = await TenantGuardService.verifySecurityEventOwnership('evt-1', 'ws-1');
      assert.equal(result, false);
    });
  });
});
