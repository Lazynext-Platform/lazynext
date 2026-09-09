import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type OrgCreateArgs = {
  data: {
    name: string;
    slug: string;
    ownerId: string;
    description?: string | null;
    mission?: string | null;
    vision?: string | null;
    industry?: string | null;
    website?: string | null;
    targetMarket?: string | null;
  };
};

type OrgUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type OrgFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type WorkspaceCreateArgs = {
  data: { organizationId: string; name: string; slug: string };
};

type MembershipCreateArgs = {
  data: { userId: string; workspaceId: string; role: string };
};

type MembershipCountArgs = {
  where: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let orgCreateImpl: (args: OrgCreateArgs) => Promise<unknown> = async () => ({});
let orgUpdateImpl: (args: OrgUpdateArgs) => Promise<unknown> = async () => ({});
let orgFindUniqueImpl: (args: OrgFindUniqueArgs) => Promise<unknown> = async () => null;
let workspaceCreateImpl: (args: WorkspaceCreateArgs) => Promise<unknown> = async () => ({});
let membershipCreateImpl: (args: MembershipCreateArgs) => Promise<unknown> = async () => ({});
let membershipCountImpl: (args: MembershipCountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  organization: {
    findUnique: (args: OrgFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'organization.findUnique', args });
      return orgFindUniqueImpl(args);
    },
    findMany: (): Promise<unknown[]> => {
      calls.push({ method: 'organization.findMany' });
      return Promise.resolve([]);
    },
    create: (args: OrgCreateArgs): Promise<unknown> => {
      calls.push({ method: 'organization.create', args });
      return orgCreateImpl(args);
    },
    update: (args: OrgUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'organization.update', args });
      return orgUpdateImpl(args);
    },
  },
  workspace: {
    create: (args: WorkspaceCreateArgs): Promise<unknown> => {
      calls.push({ method: 'workspace.create', args });
      return workspaceCreateImpl(args);
    },
  },
  membership: {
    create: (args: MembershipCreateArgs): Promise<unknown> => {
      calls.push({ method: 'membership.create', args });
      return membershipCreateImpl(args);
    },
    count: (args: MembershipCountArgs): Promise<number> => {
      calls.push({ method: 'membership.count', args });
      return membershipCountImpl(args);
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
  orgCreateImpl = async () => ({});
  orgUpdateImpl = async () => ({});
  orgFindUniqueImpl = async () => null;
  workspaceCreateImpl = async () => ({});
  membershipCreateImpl = async () => ({});
  membershipCountImpl = async () => 0;
}

const { CompanyService } = await import('@/lib/services/company');

describe('CompanyService', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('create', () => {
    it('creates a company with a default workspace and owner membership', async () => {
      orgCreateImpl = async () =>
        ({ id: 'org-1', name: 'Acme', slug: 'acme', ownerId: 'user-1' });
      workspaceCreateImpl = async () =>
        ({ id: 'ws-1', name: 'Default', slug: 'acme-default', organizationId: 'org-1' });
      membershipCreateImpl = async () =>
        ({ id: 'mem-1', userId: 'user-1', workspaceId: 'ws-1', role: 'owner' });
      orgUpdateImpl = async () =>
        ({ id: 'org-1', defaultWorkspaceId: 'ws-1' });

      const result = await CompanyService.create('user-1', {
        name: 'Acme Inc.',
        description: 'A test company',
        mission: 'Make the world better',
      });

      assert.equal(result.companyId, 'org-1');
      assert.equal(result.workspaceId, 'ws-1');
      assert.equal(calls.filter((c) => c.method === 'organization.create').length, 1);
      assert.equal(calls.filter((c) => c.method === 'workspace.create').length, 1);
      assert.equal(calls.filter((c) => c.method === 'membership.create').length, 1);
      assert.equal(calls.filter((c) => c.method === 'organization.update').length, 1);
    });

    it('truncates long names to 200 characters', async () => {
      orgCreateImpl = async (args: OrgCreateArgs) => {
        assert.ok(args.data.name.length <= 200);
        return { id: 'org-1', name: args.data.name, slug: 'test', ownerId: 'user-1' };
      };
      workspaceCreateImpl = async () =>
        ({ id: 'ws-1', name: 'Default', slug: 'test-default', organizationId: 'org-1' });
      membershipCreateImpl = async () => ({});
      orgUpdateImpl = async () => ({});

      const longName = 'A'.repeat(300);
      await CompanyService.create('user-1', { name: longName });
    });
  });

  describe('get', () => {
    it('returns company detail with counts', async () => {
      orgFindUniqueImpl = async () =>
        ({
          id: 'org-1',
          name: 'Acme',
          slug: 'acme',
          ownerId: 'user-1',
          plan: 'free',
          description: null,
          mission: 'Test mission',
          vision: null,
          strategy: null,
          industry: 'SaaS',
          website: null,
          targetMarket: null,
          logoUrl: null,
          autonomyMode: 'manual',
          defaultWorkspaceId: 'ws-1',
          _count: { workspaces: 2, goals: 3 },
        });
      membershipCountImpl = async () => 5;

      const result = await CompanyService.get('org-1');

      assert.ok(result);
      assert.equal(result.id, 'org-1');
      assert.equal(result.name, 'Acme');
      assert.equal(result.mission, 'Test mission');
      assert.equal(result.industry, 'SaaS');
      assert.equal(result.workspaceCount, 2);
      assert.equal(result.goalCount, 3);
      assert.equal(result.memberCount, 5);
      assert.equal(result.autonomyMode, 'manual');
    });

    it('returns null when company not found', async () => {
      orgFindUniqueImpl = async () => null;
      membershipCountImpl = async () => 0;

      const result = await CompanyService.get('nonexistent');
      assert.equal(result, null);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      orgFindUniqueImpl = async () =>
        ({ id: 'org-1', ownerId: 'user-1' });
      orgUpdateImpl = async (args: OrgUpdateArgs) => {
        assert.equal(args.data.mission, 'New mission');
        assert.equal(args.data.name, undefined); // not provided
        return { id: 'org-1', ...args.data };
      };

      const result = await CompanyService.update('org-1', 'user-1', { mission: 'New mission' });
      assert.ok(result);
    });

    it('returns null when user is not the owner', async () => {
      orgFindUniqueImpl = async () =>
        ({ id: 'org-1', ownerId: 'other-user' });

      const result = await CompanyService.update('org-1', 'user-1', { mission: 'New' });
      assert.equal(result, null);
    });
  });

  describe('setAutonomyMode', () => {
    it('sets the autonomy mode', async () => {
      orgFindUniqueImpl = async () =>
        ({ id: 'org-1', ownerId: 'user-1' });
      orgUpdateImpl = async (args: OrgUpdateArgs) => {
        assert.equal(args.data.autonomyMode, 'autonomous');
        return { id: 'org-1', autonomyMode: 'autonomous' };
      };

      const result = await CompanyService.setAutonomyMode('org-1', 'user-1', 'autonomous');
      assert.ok(result);
    });
  });
});
