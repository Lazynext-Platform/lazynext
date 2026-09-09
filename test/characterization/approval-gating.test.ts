import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup — approval gating characterization tests
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type ApprovalFindUniqueArgs = {
  where: { id: string };
};

type ApprovalFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
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

let approvalFindUniqueImpl: (args: ApprovalFindUniqueArgs) => Promise<unknown> = async () => null;
let approvalFindManyImpl: (args: ApprovalFindManyArgs) => Promise<unknown[]> = async () => [];
let approvalCreateImpl: (args: ApprovalCreateArgs) => Promise<unknown> = async () => ({});
let approvalUpdateImpl: (args: ApprovalUpdateArgs) => Promise<unknown> = async () => ({});
let approvalUpdateManyImpl: (args: ApprovalUpdateManyArgs) => Promise<{ count: number }> = async () => ({ count: 0 });

const prismaMock = {
  approval: {
    findUnique: (args: ApprovalFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'approval.findUnique', args });
      return approvalFindUniqueImpl(args);
    },
    findMany: (args: ApprovalFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'approval.findMany', args });
      return approvalFindManyImpl(args);
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
  approvalFindManyImpl = async () => [];
  approvalCreateImpl = async () => ({});
  approvalUpdateImpl = async () => ({});
  approvalUpdateManyImpl = async () => ({ count: 0 });
}

const { ApprovalService } = await import('@/lib/services/approval');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — ApprovalService.request
// ─────────────────────────────────────────────────────────────────────────────

describe('ApprovalService — characterization (request)', () => {
  beforeEach(() => resetMock());

  it('creates a pending approval request with default 24h expiry', async () => {
    approvalCreateImpl = async (args: ApprovalCreateArgs) => {
      assert.equal(args.data.action, 'tool.deploy_code');
      assert.equal(args.data.description, 'Agent wants to execute deploy_code');
      assert.equal(args.data.riskLevel, 'high');
      assert.equal(args.data.requestedBy, 'run-1');
      assert.ok(args.data.expiresAt);
      return { id: 'apr-1', status: 'pending', ...args.data };
    };

    const result = await ApprovalService.request({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      action: 'tool.deploy_code',
      description: 'Agent wants to execute deploy_code',
      riskLevel: 'high',
      estimatedCost: 5,
      requestedBy: 'run-1',
    });

    assert.ok(result);
    assert.equal(result.id, 'apr-1');
    assert.equal(result.status, 'pending');
  });

  it('uses custom expiry when provided', async () => {
    const customExpiry = new Date('2028-06-30');
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

  it('defaults riskLevel to medium when not provided', async () => {
    approvalCreateImpl = async (args: ApprovalCreateArgs) => {
      assert.equal(args.data.riskLevel, 'medium');
      return { id: 'apr-1' };
    };

    await ApprovalService.request({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      action: 'read_data',
      description: 'Read company data',
      requestedBy: 'user-1',
    });
  });

  it('serializes affectedResources as JSON', async () => {
    approvalCreateImpl = async (args: ApprovalCreateArgs) => {
      assert.deepEqual(JSON.parse(args.data.affectedResources), ['doc-1', 'doc-2']);
      return { id: 'apr-1' };
    };

    await ApprovalService.request({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      action: 'delete_docs',
      description: 'Delete multiple documents',
      requestedBy: 'user-1',
      affectedResources: ['doc-1', 'doc-2'],
    });
  });

  it('truncates action to 200 characters', async () => {
    const longAction = 'A'.repeat(300);
    approvalCreateImpl = async (args: ApprovalCreateArgs) => {
      assert.equal(args.data.action.length, 200);
      return { id: 'apr-1' };
    };

    await ApprovalService.request({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      action: longAction,
      description: 'Test',
      requestedBy: 'user-1',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — ApprovalService.approve
// ─────────────────────────────────────────────────────────────────────────────

describe('ApprovalService — characterization (approve)', () => {
  beforeEach(() => resetMock());

  it('changes status to approved for a pending request', async () => {
    approvalFindUniqueImpl = async () => ({
      id: 'apr-1', status: 'pending', expiresAt: new Date(Date.now() + 3600000),
    });
    approvalUpdateImpl = async (args: ApprovalUpdateArgs) => {
      assert.equal(args.data.status, 'approved');
      assert.equal(args.data.approverId, 'user-1');
      assert.equal(args.data.decision, 'approved');
      assert.ok(args.data.decidedAt);
      return { id: 'apr-1', status: 'approved' };
    };

    const result = await ApprovalService.approve('apr-1', 'user-1', 'Looks good');
    assert.ok(result);
    assert.equal(result.status, 'approved');
  });

  it('stores the approver note', async () => {
    approvalFindUniqueImpl = async () => ({
      id: 'apr-1', status: 'pending', expiresAt: new Date(Date.now() + 3600000),
    });
    approvalUpdateImpl = async (args: ApprovalUpdateArgs) => {
      assert.equal(args.data.note, 'Approved by manager');
      return { id: 'apr-1', status: 'approved' };
    };

    await ApprovalService.approve('apr-1', 'user-1', 'Approved by manager');
  });

  it('returns null when approval is not pending', async () => {
    approvalFindUniqueImpl = async () => ({
      id: 'apr-1', status: 'approved', expiresAt: new Date(Date.now() + 3600000),
    });

    const result = await ApprovalService.approve('apr-1', 'user-1');
    assert.equal(result, null);
  });

  it('returns null when approval does not exist', async () => {
    approvalFindUniqueImpl = async () => null;

    const result = await ApprovalService.approve('nope', 'user-1');
    assert.equal(result, null);
  });

  it('expires the approval if past expiry time', async () => {
    approvalFindUniqueImpl = async () => ({
      id: 'apr-1', status: 'pending', expiresAt: new Date(Date.now() - 3600000),
    });
    approvalUpdateImpl = async (args: ApprovalUpdateArgs) => {
      assert.equal(args.data.status, 'expired');
      return { id: 'apr-1', status: 'expired' };
    };

    const result = await ApprovalService.approve('apr-1', 'user-1');
    assert.ok(result);
    assert.equal(result.status, 'expired');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — ApprovalService.reject
// ─────────────────────────────────────────────────────────────────────────────

describe('ApprovalService — characterization (reject)', () => {
  beforeEach(() => resetMock());

  it('changes status to rejected for a pending request', async () => {
    approvalFindUniqueImpl = async () => ({
      id: 'apr-1', status: 'pending', expiresAt: new Date(Date.now() + 3600000),
    });
    approvalUpdateImpl = async (args: ApprovalUpdateArgs) => {
      assert.equal(args.data.status, 'rejected');
      assert.equal(args.data.approverId, 'user-1');
      assert.equal(args.data.decision, 'rejected');
      assert.ok(args.data.decidedAt);
      return { id: 'apr-1', status: 'rejected' };
    };

    const result = await ApprovalService.reject('apr-1', 'user-1', 'Too risky');
    assert.ok(result);
    assert.equal(result.status, 'rejected');
  });

  it('returns null when approval is not pending', async () => {
    approvalFindUniqueImpl = async () => ({
      id: 'apr-1', status: 'rejected', expiresAt: new Date(Date.now() + 3600000),
    });

    const result = await ApprovalService.reject('apr-1', 'user-1');
    assert.equal(result, null);
  });

  it('returns null when approval does not exist', async () => {
    approvalFindUniqueImpl = async () => null;

    const result = await ApprovalService.reject('nope', 'user-1');
    assert.equal(result, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — ApprovalService.cancel
// ─────────────────────────────────────────────────────────────────────────────

describe('ApprovalService — characterization (cancel)', () => {
  beforeEach(() => resetMock());

  it('changes status to cancelled for a pending request', async () => {
    approvalFindUniqueImpl = async () => ({
      id: 'apr-1', status: 'pending',
    });
    approvalUpdateImpl = async (args: ApprovalUpdateArgs) => {
      assert.equal(args.data.status, 'cancelled');
      assert.ok(args.data.decidedAt);
      return { id: 'apr-1', status: 'cancelled' };
    };

    const result = await ApprovalService.cancel('apr-1');
    assert.ok(result);
    assert.equal(result.status, 'cancelled');
  });

  it('returns null when approval is not pending', async () => {
    approvalFindUniqueImpl = async () => ({
      id: 'apr-1', status: 'cancelled',
    });

    const result = await ApprovalService.cancel('apr-1');
    assert.equal(result, null);
  });

  it('returns null when approval does not exist', async () => {
    approvalFindUniqueImpl = async () => null;

    const result = await ApprovalService.cancel('nope');
    assert.equal(result, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — ApprovalService.expireStale
// ─────────────────────────────────────────────────────────────────────────────

describe('ApprovalService — characterization (expireStale)', () => {
  beforeEach(() => resetMock());

  it('expires all stale pending approvals and returns the count', async () => {
    approvalUpdateManyImpl = async () => ({ count: 3 });

    const count = await ApprovalService.expireStale();
    assert.equal(count, 3);
    assert.equal(calls.filter((c) => c.method === 'approval.updateMany').length, 1);
  });

  it('returns 0 when no stale approvals exist', async () => {
    approvalUpdateManyImpl = async () => ({ count: 0 });

    const count = await ApprovalService.expireStale();
    assert.equal(count, 0);
  });

  it('filters by pending status and past expiresAt', async () => {
    approvalUpdateManyImpl = async (args: ApprovalUpdateManyArgs) => {
      assert.equal(args.data.status, 'expired');
      const where = args.where as Record<string, unknown>;
      assert.equal(where.status, 'pending');
      assert.ok(where.expiresAt);
      return { count: 2 };
    };

    const count = await ApprovalService.expireStale();
    assert.equal(count, 2);
  });
});
