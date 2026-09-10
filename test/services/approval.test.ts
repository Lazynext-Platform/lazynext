import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type ApprovalFindUniqueArgs = {
  where: { id: string };
};

type ApprovalCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    agentRunId?: string | null;
    toolCallId?: string | null;
    taskId?: string | null;
    action: string;
    description: string;
    riskLevel?: string;
    estimatedCost?: number;
    affectedResources: string;
    requestedBy: string;
    expiresAt: Date;
  };
};

type ApprovalUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type ApprovalUpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

const calls: { method: string; args?: unknown }[] = [];

let approvalFindUniqueImpl: (args: ApprovalFindUniqueArgs) => Promise<unknown> = async () => null;
let approvalCreateImpl: (args: ApprovalCreateArgs) => Promise<unknown> = async () => ({});
let approvalUpdateImpl: (args: ApprovalUpdateArgs) => Promise<unknown> = async () => ({});
let approvalUpdateManyImpl: (args: ApprovalUpdateManyArgs) => Promise<{ count: number }> = async () => ({ count: 0 });

const prismaMock = {
  approval: {
    findUnique: (args: ApprovalFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'approval.findUnique', args });
      return approvalFindUniqueImpl(args);
    },
    findMany: (): Promise<unknown[]> => {
      calls.push({ method: 'approval.findMany' });
      return Promise.resolve([]);
    },
    create: (args: ApprovalCreateArgs): Promise<unknown> => {
      calls.push({ method: 'approval.create', args });
      return approvalCreateImpl(args);
    },
    update: (args: ApprovalUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'approval.update', args });
      return approvalUpdateImpl(args);
    },
    updateMany: (args: ApprovalUpdateManyArgs): Promise<{ count: number }> => {
      calls.push({ method: 'approval.updateMany', args });
      return approvalUpdateManyImpl(args);
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
  approvalFindUniqueImpl = async () => null;
  approvalCreateImpl = async () => ({});
  approvalUpdateImpl = async () => ({});
  approvalUpdateManyImpl = async () => ({ count: 0 });
}

const { ApprovalService } = await import('@/lib/services/approval');

describe('ApprovalService', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('request', () => {
    it('creates an approval request with default 24h expiry', async () => {
      approvalCreateImpl = async (args: ApprovalCreateArgs) => {
        assert.equal(args.data.action, 'deploy_code');
        assert.equal(args.data.riskLevel, 'high');
        assert.ok(args.data.expiresAt);
        return { id: 'apr-1', ...args.data };
      };

      const result = await ApprovalService.request({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        action: 'deploy_code',
        description: 'Deploy to production',
        riskLevel: 'high',
        requestedBy: 'agent-1',
      });

      assert.ok(result);
      assert.equal(result.id, 'apr-1');
    });

    it('uses custom expiry when provided', async () => {
      const customExpiry = new Date('2026-12-31');
      approvalCreateImpl = async (args: ApprovalCreateArgs) => {
        assert.equal(args.data.expiresAt.getTime(), customExpiry.getTime());
        return { id: 'apr-1', expiresAt: args.data.expiresAt };
      };

      await ApprovalService.request({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        action: 'send_email',
        description: 'Send campaign email',
        requestedBy: 'user-1',
        expiresAt: customExpiry,
      });
    });
  });

  describe('approve', () => {
    it('approves a pending request', async () => {
      approvalFindUniqueImpl = async () =>
        ({ id: 'apr-1', status: 'pending', expiresAt: new Date(Date.now() + 3600000) });
      approvalUpdateImpl = async (args: ApprovalUpdateArgs) => {
        assert.equal(args.data.status, 'approved');
        assert.equal(args.data.approverId, 'user-1');
        assert.equal(args.data.decision, 'approved');
        return { id: 'apr-1', status: 'approved' };
      };

      const result = await ApprovalService.approve('apr-1', 'user-1', 'Looks good');
      assert.ok(result);
      assert.equal(result.status, 'approved');
    });

    it('returns null when approval is not pending', async () => {
      approvalFindUniqueImpl = async () =>
        ({ id: 'apr-1', status: 'approved', expiresAt: new Date() });

      const result = await ApprovalService.approve('apr-1', 'user-1');
      assert.equal(result, null);
    });

    it('expires the approval if past expiry time', async () => {
      approvalFindUniqueImpl = async () =>
        ({ id: 'apr-1', status: 'pending', expiresAt: new Date(Date.now() - 3600000) });
      approvalUpdateImpl = async (args: ApprovalUpdateArgs) => {
        assert.equal(args.data.status, 'expired');
        return { id: 'apr-1', status: 'expired' };
      };

      const result = await ApprovalService.approve('apr-1', 'user-1');
      assert.ok(result);
      assert.equal(result.status, 'expired');
    });
  });

  describe('reject', () => {
    it('rejects a pending request', async () => {
      approvalFindUniqueImpl = async () =>
        ({ id: 'apr-1', status: 'pending', expiresAt: new Date(Date.now() + 3600000) });
      approvalUpdateImpl = async (args: ApprovalUpdateArgs) => {
        assert.equal(args.data.status, 'rejected');
        assert.equal(args.data.decision, 'rejected');
        return { id: 'apr-1', status: 'rejected' };
      };

      const result = await ApprovalService.reject('apr-1', 'user-1', 'Too risky');
      assert.ok(result);
      assert.equal(result.status, 'rejected');
    });
  });

  describe('cancel', () => {
    it('cancels a pending request', async () => {
      approvalFindUniqueImpl = async () =>
        ({ id: 'apr-1', status: 'pending' });
      approvalUpdateImpl = async (args: ApprovalUpdateArgs) => {
        assert.equal(args.data.status, 'cancelled');
        return { id: 'apr-1', status: 'cancelled' };
      };

      const result = await ApprovalService.cancel('apr-1');
      assert.ok(result);
      assert.equal(result.status, 'cancelled');
    });
  });

  describe('expireStale', () => {
    it('expires all stale pending approvals', async () => {
      approvalUpdateManyImpl = async () =>
        ({ count: 3 });

      const count = await ApprovalService.expireStale();
      assert.equal(count, 3);
    });
  });
});
