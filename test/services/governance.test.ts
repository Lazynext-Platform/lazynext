import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type PolicyFindManyArgs = {
  where: { organizationId: string; type?: string; status?: string; workspaceId?: string };
  orderBy?: Record<string, unknown>;
  take?: number;
};

type PolicyFindUniqueArgs = {
  where: { id: string };
};

type PolicyCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    title: string;
    description: string | null;
    type: string;
    status: string;
    rules: string;
    effectiveFrom: Date;
    effectiveUntil: Date | null;
    createdBy: string | null;
  };
};

type PolicyUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type CheckFindManyArgs = {
  where: { organizationId: string; status?: string; severity?: string; workspaceId?: string };
  orderBy?: Record<string, unknown>;
  take?: number;
};

type CheckCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    policyId: string | null;
    checkName: string;
    description: string | null;
    status: string;
    severity: string;
    details: string;
    remediation: string | null;
  };
};

type CheckUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type RetentionFindManyArgs = {
  where: { organizationId: string };
  orderBy?: Record<string, unknown>;
};

type RetentionCreateArgs = {
  data: {
    organizationId: string;
    dataType: string;
    retentionDays: number;
    action: string;
    enabled: boolean;
  };
};

type RetentionUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type WorkspaceFindManyArgs = {
  where: { organizationId: string };
  select?: Record<string, unknown>;
};

type MembershipFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
  distinct?: string[];
};

type PlatformConnectionFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};

type AuditEventFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: Record<string, unknown>;
};

type EventFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};

type TicketFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};

type SandboxRunFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};

type WorkspaceQuotaFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── Mutable implementation functions ──

let policyFindManyImpl: (args: PolicyFindManyArgs) => Promise<unknown[]> = async () => [];
let policyFindUniqueImpl: (args: PolicyFindUniqueArgs) => Promise<unknown> = async () => null;
let policyCreateImpl: (args: PolicyCreateArgs) => Promise<unknown> = async () => ({});
let policyUpdateImpl: (args: PolicyUpdateArgs) => Promise<unknown> = async () => ({});

let checkFindManyImpl: (args: CheckFindManyArgs) => Promise<unknown[]> = async () => [];
let checkCreateImpl: (args: CheckCreateArgs) => Promise<unknown> = async () => ({});
let checkUpdateImpl: (args: CheckUpdateArgs) => Promise<unknown> = async () => ({});

let retentionFindManyImpl: (args: RetentionFindManyArgs) => Promise<unknown[]> = async () => [];
let retentionCreateImpl: (args: RetentionCreateArgs) => Promise<unknown> = async () => ({});
let retentionUpdateImpl: (args: RetentionUpdateArgs) => Promise<unknown> = async () => ({});

let workspaceFindManyImpl: (args: WorkspaceFindManyArgs) => Promise<unknown[]> = async () => [];
let membershipFindManyImpl: (args: MembershipFindManyArgs) => Promise<unknown[]> = async () => [];
let platformConnectionFindManyImpl: (args: PlatformConnectionFindManyArgs) => Promise<unknown[]> = async () => [];
let auditEventFindManyImpl: (args: AuditEventFindManyArgs) => Promise<unknown[]> = async () => [];
let eventFindManyImpl: (args: EventFindManyArgs) => Promise<unknown[]> = async () => [];
let ticketFindManyImpl: (args: TicketFindManyArgs) => Promise<unknown[]> = async () => [];
let sandboxRunFindManyImpl: (args: SandboxRunFindManyArgs) => Promise<unknown[]> = async () => [];
let workspaceQuotaFindManyImpl: (args: WorkspaceQuotaFindManyArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  policy: {
    findMany: (args: PolicyFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'policy.findMany', args });
      return policyFindManyImpl(args);
    },
    findUnique: (args: PolicyFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'policy.findUnique', args });
      return policyFindUniqueImpl(args);
    },
    create: (args: PolicyCreateArgs): Promise<unknown> => {
      calls.push({ method: 'policy.create', args });
      return policyCreateImpl(args);
    },
    update: (args: PolicyUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'policy.update', args });
      return policyUpdateImpl(args);
    },
  },
  complianceCheck: {
    findMany: (args: CheckFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'complianceCheck.findMany', args });
      return checkFindManyImpl(args);
    },
    create: (args: CheckCreateArgs): Promise<unknown> => {
      calls.push({ method: 'complianceCheck.create', args });
      return checkCreateImpl(args);
    },
    update: (args: CheckUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'complianceCheck.update', args });
      return checkUpdateImpl(args);
    },
  },
  retentionRule: {
    findMany: (args: RetentionFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'retentionRule.findMany', args });
      return retentionFindManyImpl(args);
    },
    create: (args: RetentionCreateArgs): Promise<unknown> => {
      calls.push({ method: 'retentionRule.create', args });
      return retentionCreateImpl(args);
    },
    update: (args: RetentionUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'retentionRule.update', args });
      return retentionUpdateImpl(args);
    },
  },
  workspace: {
    findMany: (args: WorkspaceFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'workspace.findMany', args });
      return workspaceFindManyImpl(args);
    },
  },
  membership: {
    findMany: (args: MembershipFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'membership.findMany', args });
      return membershipFindManyImpl(args);
    },
  },
  platformConnection: {
    findMany: (args: PlatformConnectionFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'platformConnection.findMany', args });
      return platformConnectionFindManyImpl(args);
    },
  },
  auditEvent: {
    findMany: (args: AuditEventFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'auditEvent.findMany', args });
      return auditEventFindManyImpl(args);
    },
  },
  event: {
    findMany: (args: EventFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'event.findMany', args });
      return eventFindManyImpl(args);
    },
  },
  ticket: {
    findMany: (args: TicketFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'ticket.findMany', args });
      return ticketFindManyImpl(args);
    },
  },
  sandboxRun: {
    findMany: (args: SandboxRunFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'sandboxRun.findMany', args });
      return sandboxRunFindManyImpl(args);
    },
  },
  workspaceQuota: {
    findMany: (args: WorkspaceQuotaFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'workspaceQuota.findMany', args });
      return workspaceQuotaFindManyImpl(args);
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
  policyFindManyImpl = async () => [];
  policyFindUniqueImpl = async () => null;
  policyCreateImpl = async () => ({});
  policyUpdateImpl = async () => ({});
  checkFindManyImpl = async () => [];
  checkCreateImpl = async () => ({});
  checkUpdateImpl = async () => ({});
  retentionFindManyImpl = async () => [];
  retentionCreateImpl = async () => ({});
  retentionUpdateImpl = async () => ({});
  workspaceFindManyImpl = async () => [];
  membershipFindManyImpl = async () => [];
  platformConnectionFindManyImpl = async () => [];
  auditEventFindManyImpl = async () => [];
  eventFindManyImpl = async () => [];
  ticketFindManyImpl = async () => [];
  sandboxRunFindManyImpl = async () => [];
  workspaceQuotaFindManyImpl = async () => [];
}

const { GovernanceService } = await import('@/lib/services/governance');

// ─────────────────────────────────────────────────────────────────────────────
// GovernanceService — Policies
// ─────────────────────────────────────────────────────────────────────────────

describe('GovernanceService — Policies', () => {
  beforeEach(() => { resetMock(); });

  describe('listPolicies', () => {
    it('returns policies for an organization', async () => {
      policyFindManyImpl = async () => ([
        { id: 'p1', title: 'Security Policy', type: 'security', status: 'active' },
      ]);

      const result = await GovernanceService.listPolicies('org-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'p1');
      assert.equal(calls[0].method, 'policy.findMany');
      const args = calls[0].args as PolicyFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies type and status filters', async () => {
      policyFindManyImpl = async () => [];

      await GovernanceService.listPolicies('org-1', { type: 'security', status: 'active' });

      const args = calls[0].args as PolicyFindManyArgs;
      assert.equal(args.where.type, 'security');
      assert.equal(args.where.status, 'active');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      policyFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await GovernanceService.listPolicies('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getPolicy', () => {
    it('returns a policy by id', async () => {
      policyFindUniqueImpl = async () => ({ id: 'p1', title: 'Test Policy' });

      const result = await GovernanceService.getPolicy('p1');

      assert.ok(result);
      assert.equal(result.id, 'p1');
      assert.equal(calls[0].method, 'policy.findUnique');
    });

    it('returns null when policy not found', async () => {
      policyFindUniqueImpl = async () => null;

      const result = await GovernanceService.getPolicy('nope');
      assert.equal(result, null);
    });
  });

  describe('createPolicy', () => {
    it('creates a policy with defaults', async () => {
      policyCreateImpl = async (args: PolicyCreateArgs) => {
        assert.equal(args.data.type, 'operational');
        assert.equal(args.data.status, 'active');
        assert.equal(args.data.rules, '[]');
        return { id: 'p1', ...args.data };
      };

      const result = await GovernanceService.createPolicy('org-1', {
        title: 'My Policy',
      });

      assert.ok(result);
      assert.equal(result.id, 'p1');
      assert.equal(calls[0].method, 'policy.create');
    });

    it('serializes rules array to JSON string', async () => {
      policyCreateImpl = async (args: PolicyCreateArgs) => {
        assert.equal(args.data.rules, JSON.stringify([{ rule: 'no-plaintext' }]));
        return { id: 'p1', rules: args.data.rules };
      };

      const result = await GovernanceService.createPolicy('org-1', {
        title: 'Policy',
        rules: [{ rule: 'no-plaintext' }],
      });

      assert.ok(result);
    });

    it('returns null on error', async () => {
      policyCreateImpl = async () => { throw new Error('fail'); };

      const result = await GovernanceService.createPolicy('org-1', { title: 'X' });
      assert.equal(result, null);
    });
  });

  describe('updatePolicy', () => {
    it('increments version on update', async () => {
      policyFindUniqueImpl = async () => ({ id: 'p1', version: 1, status: 'active' });
      policyUpdateImpl = async (args: PolicyUpdateArgs) => {
        const versionOp = args.data.version as { increment: number };
        assert.equal(versionOp.increment, 1);
        return { id: 'p1', ...args.data, version: 2 } as { id: string; version: number };
      };

      const result = await GovernanceService.updatePolicy('p1', { title: 'Updated' });

      assert.ok(result);
      assert.equal(result.version, 2);
    });

    it('returns null when policy not found', async () => {
      policyFindUniqueImpl = async () => null;

      const result = await GovernanceService.updatePolicy('nope', { title: 'X' });
      assert.equal(result, null);
    });
  });

  describe('archivePolicy', () => {
    it('sets status to archived and increments version', async () => {
      policyUpdateImpl = async (args: PolicyUpdateArgs) => {
        assert.equal(args.data.status, 'archived');
        const versionOp = args.data.version as { increment: number };
        assert.equal(versionOp.increment, 1);
        return { id: 'p1', status: 'archived', version: 2 };
      };

      const result = await GovernanceService.archivePolicy('p1');

      assert.ok(result);
      assert.equal(result.status, 'archived');
      assert.equal(calls[0].method, 'policy.update');
    });

    it('returns null on error', async () => {
      policyUpdateImpl = async () => { throw new Error('fail'); };

      const result = await GovernanceService.archivePolicy('p1');
      assert.equal(result, null);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GovernanceService — Compliance Checks
// ─────────────────────────────────────────────────────────────────────────────

describe('GovernanceService — Compliance Checks', () => {
  beforeEach(() => { resetMock(); });

  describe('listChecks', () => {
    it('returns checks for an organization', async () => {
      checkFindManyImpl = async () => ([
        { id: 'c1', checkName: 'token_security', status: 'passed' },
      ]);

      const result = await GovernanceService.listChecks('org-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c1');
      assert.equal(calls[0].method, 'complianceCheck.findMany');
      const args = calls[0].args as CheckFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies status filter', async () => {
      checkFindManyImpl = async () => [];

      await GovernanceService.listChecks('org-1', { status: 'failed' });

      const args = calls[0].args as CheckFindManyArgs;
      assert.equal(args.where.status, 'failed');
    });
  });

  describe('createCheck', () => {
    it('creates a check with defaults', async () => {
      checkCreateImpl = async (args: CheckCreateArgs) => {
        assert.equal(args.data.status, 'pending');
        assert.equal(args.data.severity, 'medium');
        assert.equal(args.data.details, '{}');
        return { id: 'c1', ...args.data };
      };

      const result = await GovernanceService.createCheck('org-1', {
        checkName: 'token_security',
      });

      assert.ok(result);
      assert.equal(result.id, 'c1');
      assert.equal(calls[0].method, 'complianceCheck.create');
    });

    it('serializes details to JSON string', async () => {
      checkCreateImpl = async (args: CheckCreateArgs) => {
        assert.equal(args.data.details, JSON.stringify({ total: 5, plaintext: 2 }));
        return { id: 'c1', details: args.data.details };
      };

      const result = await GovernanceService.createCheck('org-1', {
        checkName: 'token_security',
        details: { total: 5, plaintext: 2 },
      });

      assert.ok(result);
    });
  });

  describe('updateCheck', () => {
    it('updates check status and sets checkedAt', async () => {
      checkUpdateImpl = async (args: CheckUpdateArgs) => {
        assert.equal(args.data.status, 'passed');
        assert.ok(args.data.checkedAt instanceof Date);
        return { id: 'c1', status: 'passed' };
      };

      const result = await GovernanceService.updateCheck('c1', { status: 'passed' });

      assert.ok(result);
      assert.equal(calls[0].method, 'complianceCheck.update');
    });
  });

  describe('runComplianceCheck — token_security', () => {
    it('returns passed when all tokens are encrypted', async () => {
      workspaceFindManyImpl = async () => [{ id: 'ws-1' }];
      membershipFindManyImpl = async () => [{ userId: 'u1' }];
      platformConnectionFindManyImpl = async () => ([
        { id: 'pc1', platform: 'tiktok', accessToken: 'v2:encrypted' },
      ]);

      const result = await GovernanceService.runComplianceCheck('org-1', 'token_security');

      assert.equal(result.status, 'passed');
      assert.equal((result.details as { total: number }).total, 1);
      assert.equal((result.details as { plaintext: number }).plaintext, 0);
    });

    it('returns failed when plaintext tokens exist', async () => {
      workspaceFindManyImpl = async () => [{ id: 'ws-1' }];
      membershipFindManyImpl = async () => [{ userId: 'u1' }];
      platformConnectionFindManyImpl = async () => ([
        { id: 'pc1', platform: 'tiktok', accessToken: 'plaintext-token' },
      ]);

      const result = await GovernanceService.runComplianceCheck('org-1', 'token_security');

      assert.equal(result.status, 'failed');
      assert.equal((result.details as { plaintext: number }).plaintext, 1);
      assert.ok(result.remediation);
    });

    it('returns not_applicable when no workspaces exist', async () => {
      workspaceFindManyImpl = async () => [];

      const result = await GovernanceService.runComplianceCheck('org-1', 'token_security');

      assert.equal(result.status, 'not_applicable');
    });
  });

  describe('runComplianceCheck — workspace_isolation', () => {
    it('returns passed when all workspaces have quotas', async () => {
      workspaceFindManyImpl = async () => [{ id: 'ws-1', name: 'Main' }];
      workspaceQuotaFindManyImpl = async () => [{ workspaceId: 'ws-1' }];

      const result = await GovernanceService.runComplianceCheck('org-1', 'workspace_isolation');

      assert.equal(result.status, 'passed');
      assert.equal((result.details as { missingQuotas: number }).missingQuotas, 0);
    });

    it('returns warning when workspaces are missing quotas', async () => {
      workspaceFindManyImpl = async () => [{ id: 'ws-1', name: 'Main' }];
      workspaceQuotaFindManyImpl = async () => [];

      const result = await GovernanceService.runComplianceCheck('org-1', 'workspace_isolation');

      assert.equal(result.status, 'warning');
      assert.equal((result.details as { missingQuotas: number }).missingQuotas, 1);
      assert.ok(result.remediation);
    });
  });

  describe('runAllChecks', () => {
    it('runs all 4 check types and creates records', async () => {
      workspaceFindManyImpl = async () => [{ id: 'ws-1', name: 'Main' }];
      membershipFindManyImpl = async () => [{ userId: 'u1' }];
      platformConnectionFindManyImpl = async () => [];
      workspaceQuotaFindManyImpl = async () => [{ workspaceId: 'ws-1' }];
      auditEventFindManyImpl = async () => [{ id: 'a1', action: 'test' }];
      retentionFindManyImpl = async () => [];
      checkCreateImpl = async (args: CheckCreateArgs) => ({
        id: `check-${args.data.checkName}`,
        checkName: args.data.checkName,
        status: args.data.status,
      });

      const results = await GovernanceService.runAllChecks('org-1');

      assert.equal(results.length, 4);
      const checkNames = results.map((r) => r.checkName);
      assert.ok(checkNames.includes('token_security'));
      assert.ok(checkNames.includes('workspace_isolation'));
      assert.ok(checkNames.includes('audit_coverage'));
      assert.ok(checkNames.includes('data_retention'));
    });
  });

  describe('getComplianceSummary', () => {
    it('aggregates counts by status and severity', async () => {
      checkFindManyImpl = async () => ([
        { id: 'c1', status: 'passed', severity: 'low' },
        { id: 'c2', status: 'passed', severity: 'low' },
        { id: 'c3', status: 'failed', severity: 'high' },
        { id: 'c4', status: 'warning', severity: 'medium' },
        { id: 'c5', status: 'pending', severity: 'low' },
      ]);

      const summary = await GovernanceService.getComplianceSummary('org-1');

      assert.equal(summary.total, 5);
      assert.equal(summary.byStatus.passed, 2);
      assert.equal(summary.byStatus.failed, 1);
      assert.equal(summary.byStatus.warning, 1);
      assert.equal(summary.byStatus.pending, 1);
      assert.equal(summary.bySeverity.high, 1);
      assert.equal(summary.bySeverity.medium, 1);
      // evaluated = 5 - 1 pending - 0 not_applicable = 4; passed = 2; passRate = 50
      assert.equal(summary.passRate, 50);
    });

    it('returns zero pass rate when no checks', async () => {
      checkFindManyImpl = async () => [];

      const summary = await GovernanceService.getComplianceSummary('org-1');

      assert.equal(summary.total, 0);
      assert.equal(summary.passRate, 0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GovernanceService — Retention Rules
// ─────────────────────────────────────────────────────────────────────────────

describe('GovernanceService — Retention Rules', () => {
  beforeEach(() => { resetMock(); });

  describe('listRetentionRules', () => {
    it('returns retention rules for an organization', async () => {
      retentionFindManyImpl = async () => ([
        { id: 'r1', dataType: 'audit_events', retentionDays: 365 },
      ]);

      const result = await GovernanceService.listRetentionRules('org-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'r1');
      assert.equal(calls[0].method, 'retentionRule.findMany');
      const args = calls[0].args as RetentionFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      retentionFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await GovernanceService.listRetentionRules('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('createRetentionRule', () => {
    it('creates a retention rule with defaults', async () => {
      retentionCreateImpl = async (args: RetentionCreateArgs) => {
        assert.equal(args.data.retentionDays, 365);
        assert.equal(args.data.action, 'archive');
        assert.equal(args.data.enabled, true);
        return { id: 'r1', ...args.data };
      };

      const result = await GovernanceService.createRetentionRule('org-1', {
        dataType: 'audit_events',
      });

      assert.ok(result);
      assert.equal(result.id, 'r1');
      assert.equal(calls[0].method, 'retentionRule.create');
    });

    it('respects custom retention days and action', async () => {
      retentionCreateImpl = async (args: RetentionCreateArgs) => {
        assert.equal(args.data.retentionDays, 90);
        assert.equal(args.data.action, 'delete');
        return { id: 'r1', ...args.data };
      };

      const result = await GovernanceService.createRetentionRule('org-1', {
        dataType: 'events',
        retentionDays: 90,
        action: 'delete',
      });

      assert.ok(result);
    });
  });

  describe('checkRetention', () => {
    it('returns empty when no rules exist', async () => {
      retentionFindManyImpl = async () => [];

      const items = await GovernanceService.checkRetention('org-1');

      assert.deepEqual(items, []);
    });

    it('returns items when records exceed retention period', async () => {
      retentionFindManyImpl = async () => ([
        { id: 'r1', organizationId: 'org-1', dataType: 'audit_events', retentionDays: 30, action: 'archive', enabled: true },
      ]);
      workspaceFindManyImpl = async () => [{ id: 'ws-1' }];
      auditEventFindManyImpl = async () => [{ id: 'a1' }, { id: 'a2' }];

      const items = await GovernanceService.checkRetention('org-1');

      assert.equal(items.length, 1);
      assert.equal(items[0].dataType, 'audit_events');
      assert.equal(items[0].count, 2);
      assert.equal(items[0].action, 'archive');
    });

    it('skips disabled rules', async () => {
      retentionFindManyImpl = async () => ([
        { id: 'r1', organizationId: 'org-1', dataType: 'audit_events', retentionDays: 30, action: 'archive', enabled: false },
      ]);

      const items = await GovernanceService.checkRetention('org-1');

      assert.deepEqual(items, []);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GovernanceService — Dashboard
// ─────────────────────────────────────────────────────────────────────────────

describe('GovernanceService — Dashboard', () => {
  beforeEach(() => { resetMock(); });

  describe('getGovernanceDashboard', () => {
    it('returns combined dashboard data', async () => {
      policyFindManyImpl = async () => ([
        { id: 'p1', status: 'active', type: 'security' },
        { id: 'p2', status: 'draft', type: 'operational' },
      ]);
      checkFindManyImpl = async () => ([
        { id: 'c1', status: 'passed', severity: 'low' },
        { id: 'c2', status: 'failed', severity: 'high' },
      ]);
      retentionFindManyImpl = async () => ([
        { id: 'r1', dataType: 'audit_events', retentionDays: 365, action: 'archive', enabled: true },
      ]);
      workspaceFindManyImpl = async () => [{ id: 'ws-1' }];
      auditEventFindManyImpl = async () => ([
        { id: 'a1', action: 'auth.login', createdAt: new Date() },
      ]);

      const dashboard = await GovernanceService.getGovernanceDashboard('org-1');

      assert.equal(dashboard.policies.total, 2);
      assert.equal(dashboard.policies.active, 1);
      assert.equal(dashboard.policies.draft, 1);
      assert.equal(dashboard.policies.archived, 0);
      assert.equal(dashboard.compliance.total, 2);
      assert.equal(dashboard.compliance.byStatus.passed, 1);
      assert.equal(dashboard.compliance.byStatus.failed, 1);
      assert.equal(dashboard.retention.rulesCount, 1);
      assert.ok(dashboard.recentAudit.length >= 0);
    });

    it('handles empty organization gracefully', async () => {
      policyFindManyImpl = async () => [];
      checkFindManyImpl = async () => [];
      retentionFindManyImpl = async () => [];
      workspaceFindManyImpl = async () => [];
      auditEventFindManyImpl = async () => [];

      const dashboard = await GovernanceService.getGovernanceDashboard('org-1');

      assert.equal(dashboard.policies.total, 0);
      assert.equal(dashboard.compliance.total, 0);
      assert.equal(dashboard.compliance.passRate, 0);
      assert.equal(dashboard.retention.rulesCount, 0);
      assert.equal(dashboard.retention.itemsNeedingAction, 0);
      assert.equal(dashboard.recentAudit.length, 0);
    });
  });
});
