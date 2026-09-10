import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let policyCreateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let policyFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let policyFindUniqueImpl: (args: unknown) => Promise<unknown> = async () => null;
let policyUpdateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let policyDeleteImpl: (args: unknown) => Promise<unknown> = async () => ({});
let automationRunCountImpl: (args: unknown) => Promise<number> = async () => 0;
let automationFindUniqueImpl: (args: unknown) => Promise<unknown> = async () => null;

const prismaMock = {
  policy: {
    create: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'policy.create', args });
      return policyCreateImpl(args);
    },
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'policy.findMany', args });
      return policyFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'policy.findUnique', args });
      return policyFindUniqueImpl(args);
    },
    update: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'policy.update', args });
      return policyUpdateImpl(args);
    },
    delete: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'policy.delete', args });
      return policyDeleteImpl(args);
    },
  },
  automationRun: {
    count: (args: unknown): Promise<number> => {
      calls.push({ method: 'automationRun.count', args });
      return automationRunCountImpl(args);
    },
  },
  automation: {
    findUnique: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'automation.findUnique', args });
      return automationFindUniqueImpl(args);
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
  policyCreateImpl = async () => ({});
  policyFindManyImpl = async () => [];
  policyFindUniqueImpl = async () => null;
  policyUpdateImpl = async () => ({});
  policyDeleteImpl = async () => ({});
  automationRunCountImpl = async () => 0;
  automationFindUniqueImpl = async () => null;
}

const { AutomationPolicyService } = await import('@/lib/automation/policy');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AutomationPolicyService', () => {
  beforeEach(() => { resetMock(); });

  describe('createPolicy', () => {
    it('creates a policy with the given config', async () => {
      policyCreateImpl = async (args: unknown) => {
        const data = (args as { data: { organizationId: string; title: string; type: string; rules: string } }).data;
        assert.equal(data.organizationId, 'org-1');
        assert.equal(data.title, 'Default');
        assert.equal(data.type, 'automation');
        const config = JSON.parse(data.rules);
        assert.equal(config.maxConcurrentRuns, 5);
        return {
          id: 'p-1',
          organizationId: 'org-1',
          title: 'Default',
          status: 'active',
          rules: data.rules,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      };

      const policy = await AutomationPolicyService.createPolicy('org-1', {
        name: 'Default',
        maxConcurrentRuns: 5,
      });

      assert.equal(policy.id, 'p-1');
      assert.equal(policy.name, 'Default');
      assert.equal(policy.config.maxConcurrentRuns, 5);
    });

    it('throws when name is missing', async () => {
      await assert.rejects(() => AutomationPolicyService.createPolicy('org-1', { name: '' }), /policy_name_required/);
    });

    it('applies default config values', async () => {
      policyCreateImpl = async (args: unknown) => {
        const data = (args as { data: { rules: string } }).data;
        const config = JSON.parse(data.rules);
        assert.equal(config.maxConcurrentRuns, 10);
        assert.equal(config.maxRunsPerHour, 100);
        assert.equal(config.maxRunsPerDay, 1000);
        return { id: 'p-1', organizationId: 'org-1', title: 'P', status: 'active', rules: data.rules, createdAt: new Date(), updatedAt: new Date() };
      };

      const policy = await AutomationPolicyService.createPolicy('org-1', { name: 'P' });
      assert.equal(policy.config.maxConcurrentRuns, 10);
    });
  });

  describe('listPolicies', () => {
    it('returns policies for an organization', async () => {
      policyFindManyImpl = async () => [
        { id: 'p-1', organizationId: 'org-1', title: 'A', status: 'active', rules: '{"maxConcurrentRuns":3,"maxRunsPerHour":50,"maxRunsPerDay":500,"enabledActions":[],"blockedActions":[],"retryPolicy":{"maxAttempts":3,"initialDelayMs":1000,"maxDelayMs":30000,"backoffMultiplier":2}}', createdAt: new Date(), updatedAt: new Date() },
      ];

      const policies = await AutomationPolicyService.listPolicies('org-1');
      assert.equal(policies.length, 1);
      assert.equal(policies[0].name, 'A');
      assert.equal(policies[0].config.maxConcurrentRuns, 3);
    });
  });

  describe('getPolicy', () => {
    it('returns a policy by id', async () => {
      policyFindUniqueImpl = async () => ({
        id: 'p-1',
        organizationId: 'org-1',
        title: 'A',
        status: 'active',
        type: 'automation',
        rules: '{"maxConcurrentRuns":5,"maxRunsPerHour":100,"maxRunsPerDay":1000,"enabledActions":[],"blockedActions":[],"retryPolicy":{"maxAttempts":3,"initialDelayMs":1000,"maxDelayMs":30000,"backoffMultiplier":2}}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const policy = await AutomationPolicyService.getPolicy('p-1');
      assert.ok(policy);
      assert.equal(policy!.id, 'p-1');
    });

    it('returns null for non-automation policy type', async () => {
      policyFindUniqueImpl = async () => ({
        id: 'p-1',
        organizationId: 'org-1',
        title: 'A',
        status: 'active',
        type: 'operational',
        rules: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const policy = await AutomationPolicyService.getPolicy('p-1');
      assert.equal(policy, null);
    });
  });

  describe('checkPolicy', () => {
    it('allows when no policy exists', async () => {
      policyFindManyImpl = async () => [];
      const result = await AutomationPolicyService.checkPolicy('org-1', 'a-1');
      assert.equal(result.allowed, true);
    });

    it('blocks when concurrent runs exceeded', async () => {
      policyFindManyImpl = async () => [
        { id: 'p-1', organizationId: 'org-1', title: 'A', status: 'active', rules: '{"maxConcurrentRuns":2,"maxRunsPerHour":100,"maxRunsPerDay":1000,"enabledActions":[],"blockedActions":[],"retryPolicy":{"maxAttempts":3,"initialDelayMs":1000,"maxDelayMs":30000,"backoffMultiplier":2}}', createdAt: new Date(), updatedAt: new Date() },
      ];
      automationRunCountImpl = async (args: unknown) => {
        const where = (args as { where: { status?: string } }).where;
        if (where.status === 'running') return 2;
        return 0;
      };

      const result = await AutomationPolicyService.checkPolicy('org-1', 'a-1');
      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'max_concurrent_runs_exceeded');
    });

    it('blocks when hourly rate limit exceeded', async () => {
      policyFindManyImpl = async () => [
        { id: 'p-1', organizationId: 'org-1', title: 'A', status: 'active', rules: '{"maxConcurrentRuns":10,"maxRunsPerHour":5,"maxRunsPerDay":1000,"enabledActions":[],"blockedActions":[],"retryPolicy":{"maxAttempts":3,"initialDelayMs":1000,"maxDelayMs":30000,"backoffMultiplier":2}}', createdAt: new Date(), updatedAt: new Date() },
      ];
      automationRunCountImpl = async (args: unknown) => {
        const where = (args as { where: { status?: string; startedAt?: unknown } }).where;
        if (where.status === 'running') return 0;
        if (where.startedAt) return 5; // hourly count
        return 0;
      };

      const result = await AutomationPolicyService.checkPolicy('org-1', 'a-1');
      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'hourly_rate_limit_exceeded');
    });

    it('blocks when daily rate limit exceeded', async () => {
      policyFindManyImpl = async () => [
        { id: 'p-1', organizationId: 'org-1', title: 'A', status: 'active', rules: '{"maxConcurrentRuns":10,"maxRunsPerHour":100,"maxRunsPerDay":5,"enabledActions":[],"blockedActions":[],"retryPolicy":{"maxAttempts":3,"initialDelayMs":1000,"maxDelayMs":30000,"backoffMultiplier":2}}', createdAt: new Date(), updatedAt: new Date() },
      ];
      let callCount = 0;
      automationRunCountImpl = async (args: unknown) => {
        callCount++;
        const where = (args as { where: { status?: string; startedAt?: unknown } }).where;
        if (where.status === 'running') return 0;
        // First startedAt call = hourly (return 0), second = daily (return 5)
        if (where.startedAt) {
          if (callCount === 2) return 0; // hourly
          return 5; // daily
        }
        return 0;
      };

      const result = await AutomationPolicyService.checkPolicy('org-1', 'a-1');
      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'daily_rate_limit_exceeded');
    });

    it('blocks when action is in blocklist', async () => {
      policyFindManyImpl = async () => [
        { id: 'p-1', organizationId: 'org-1', title: 'A', status: 'active', rules: '{"maxConcurrentRuns":10,"maxRunsPerHour":100,"maxRunsPerDay":1000,"enabledActions":[],"blockedActions":["delete_record"],"retryPolicy":{"maxAttempts":3,"initialDelayMs":1000,"maxDelayMs":30000,"backoffMultiplier":2}}', createdAt: new Date(), updatedAt: new Date() },
      ];
      automationRunCountImpl = async () => 0;
      automationFindUniqueImpl = async () => ({
        definition: '{"actions":[{"type":"delete_record","config":{}}]}',
      });

      const result = await AutomationPolicyService.checkPolicy('org-1', 'a-1');
      assert.equal(result.allowed, false);
      assert.match(result.reason!, /action_blocked/);
    });

    it('allows when all checks pass', async () => {
      policyFindManyImpl = async () => [
        { id: 'p-1', organizationId: 'org-1', title: 'A', status: 'active', rules: '{"maxConcurrentRuns":10,"maxRunsPerHour":100,"maxRunsPerDay":1000,"enabledActions":[],"blockedActions":[],"retryPolicy":{"maxAttempts":3,"initialDelayMs":1000,"maxDelayMs":30000,"backoffMultiplier":2}}', createdAt: new Date(), updatedAt: new Date() },
      ];
      automationRunCountImpl = async () => 0;
      automationFindUniqueImpl = async () => ({
        definition: '{"actions":[{"type":"webhook","config":{}}]}',
      });

      const result = await AutomationPolicyService.checkPolicy('org-1', 'a-1');
      assert.equal(result.allowed, true);
    });
  });

  describe('getPolicySummary', () => {
    it('returns summary with usage stats', async () => {
      policyFindManyImpl = async () => [
        { id: 'p-1', organizationId: 'org-1', title: 'A', status: 'active', rules: '{"maxConcurrentRuns":10,"maxRunsPerHour":100,"maxRunsPerDay":1000,"enabledActions":[],"blockedActions":[],"retryPolicy":{"maxAttempts":3,"initialDelayMs":1000,"maxDelayMs":30000,"backoffMultiplier":2}}', createdAt: new Date(), updatedAt: new Date() },
        { id: 'p-2', organizationId: 'org-1', title: 'B', status: 'draft', rules: '{"maxConcurrentRuns":5,"maxRunsPerHour":50,"maxRunsPerDay":500,"enabledActions":[],"blockedActions":[],"retryPolicy":{"maxAttempts":3,"initialDelayMs":1000,"maxDelayMs":30000,"backoffMultiplier":2}}', createdAt: new Date(), updatedAt: new Date() },
      ];
      automationRunCountImpl = async (args: unknown) => {
        const where = (args as { where: { status?: string; startedAt?: unknown } }).where;
        if (where.status === 'running') return 3;
        if (where.startedAt) return 10;
        return 0;
      };

      const summary = await AutomationPolicyService.getPolicySummary('org-1');
      assert.equal(summary.total, 2);
      assert.equal(summary.active, 1);
      assert.equal(summary.currentConcurrentRuns, 3);
    });
  });

  describe('deletePolicy', () => {
    it('deletes a policy', async () => {
      let deleted = false;
      policyDeleteImpl = async () => { deleted = true; return {}; };
      const result = await AutomationPolicyService.deletePolicy('p-1');
      assert.equal(result.ok, true);
      assert.equal(deleted, true);
    });
  });
});
