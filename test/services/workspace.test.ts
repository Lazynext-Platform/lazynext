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

type MembershipFindManyArgs = { where: Record<string, unknown>; include?: unknown; orderBy?: unknown; take?: number };
type MembershipFindUniqueArgs = { where: Record<string, unknown>; include?: unknown };
type MembershipFindFirstArgs = { where: Record<string, unknown> };
type MembershipCreateArgs = { data: Record<string, unknown> };
type MembershipUpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type MembershipDeleteArgs = { where: Record<string, unknown> };

type WorkspaceFindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type WorkspaceCreateArgs = { data: Record<string, unknown> };

type OrgFindManyArgs = { where: Record<string, unknown> };
type OrgFindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type OrgCreateArgs = { data: Record<string, unknown> };

let membershipFindManyImpl: (args: MembershipFindManyArgs) => Promise<unknown[]> = async () => [];
let membershipFindUniqueImpl: (args: MembershipFindUniqueArgs) => Promise<unknown> = async () => null;
let membershipFindFirstImpl: (args: MembershipFindFirstArgs) => Promise<unknown> = async () => null;
let membershipCreateImpl: (args: MembershipCreateArgs) => Promise<unknown> = async () => ({});
let membershipUpdateImpl: (args: MembershipUpdateArgs) => Promise<unknown> = async () => ({});
let membershipDeleteImpl: (args: MembershipDeleteArgs) => Promise<unknown> = async () => ({});

let workspaceFindUniqueImpl: (args: WorkspaceFindUniqueArgs) => Promise<unknown> = async () => null;
let workspaceCreateImpl: (args: WorkspaceCreateArgs) => Promise<unknown> = async () => ({});

let orgFindManyImpl: (args: OrgFindManyArgs) => Promise<unknown[]> = async () => [];
let orgFindUniqueImpl: (args: OrgFindUniqueArgs) => Promise<unknown> = async () => null;
let orgCreateImpl: (args: OrgCreateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  membership: {
    findMany: (args: MembershipFindManyArgs): Promise<unknown[]> => { calls.push({ method: 'membership.findMany', args }); return membershipFindManyImpl(args); },
    findUnique: (args: MembershipFindUniqueArgs): Promise<unknown> => { calls.push({ method: 'membership.findUnique', args }); return membershipFindUniqueImpl(args); },
    findFirst: (args: MembershipFindFirstArgs): Promise<unknown> => { calls.push({ method: 'membership.findFirst', args }); return membershipFindFirstImpl(args); },
    create: (args: MembershipCreateArgs): Promise<unknown> => { calls.push({ method: 'membership.create', args }); return membershipCreateImpl(args); },
    update: (args: MembershipUpdateArgs): Promise<unknown> => { calls.push({ method: 'membership.update', args }); return membershipUpdateImpl(args); },
    delete: (args: MembershipDeleteArgs): Promise<unknown> => { calls.push({ method: 'membership.delete', args }); return membershipDeleteImpl(args); },
  },
  workspace: {
    findUnique: (args: WorkspaceFindUniqueArgs): Promise<unknown> => { calls.push({ method: 'workspace.findUnique', args }); return workspaceFindUniqueImpl(args); },
    create: (args: WorkspaceCreateArgs): Promise<unknown> => { calls.push({ method: 'workspace.create', args }); return workspaceCreateImpl(args); },
  },
  organization: {
    findMany: (args: OrgFindManyArgs): Promise<unknown[]> => { calls.push({ method: 'organization.findMany', args }); return orgFindManyImpl(args); },
    findUnique: (args: OrgFindUniqueArgs): Promise<unknown> => { calls.push({ method: 'organization.findUnique', args }); return orgFindUniqueImpl(args); },
    create: (args: OrgCreateArgs): Promise<unknown> => { calls.push({ method: 'organization.create', args }); return orgCreateImpl(args); },
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

function makeWorkspaceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ws-1',
    name: 'Acme Workspace',
    slug: 'acme-workspace',
    organizationId: 'org-1',
    defaultLocale: 'en',
    timezone: 'UTC',
    deletedAt: null,
    ...overrides,
  };
}

function makeOrgRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'org-1',
    name: "Acme's Organization",
    slug: 'acmes-organization',
    ownerId: 'user-1',
    plan: 'free',
    ...overrides,
  };
}

function makeMembershipRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    userId: 'user-1',
    workspaceId: 'ws-1',
    role: 'owner',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  membershipFindManyImpl = async () => [];
  membershipFindUniqueImpl = async () => null;
  membershipFindFirstImpl = async () => null;
  membershipCreateImpl = async () => ({});
  membershipUpdateImpl = async () => ({});
  membershipDeleteImpl = async () => ({});
  workspaceFindUniqueImpl = async () => null;
  workspaceCreateImpl = async () => ({});
  orgFindManyImpl = async () => [];
  orgFindUniqueImpl = async () => null;
  orgCreateImpl = async () => ({});
}

const { WorkspaceService } = await import('@/lib/services/workspace');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — WorkspaceService.listForUser / getForUser
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceService — listing & lookup', () => {
  beforeEach(() => resetMock());

  it('listForUser returns workspaces with role, excluding deleted', async () => {
    membershipFindManyImpl = async () => [
      { role: 'owner', workspace: makeWorkspaceRow() },
      { role: 'member', workspace: makeWorkspaceRow({ id: 'ws-2', name: 'Other', slug: 'other', deletedAt: new Date('2024-02-01') }) },
    ];
    const list = await WorkspaceService.listForUser('user-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'ws-1');
    assert.equal(list[0].role, 'owner');
    assert.equal(list[0].name, 'Acme Workspace');
  });

  it('getForUser returns workspace detail with counts', async () => {
    membershipFindUniqueImpl = async () => ({
      role: 'admin',
      workspace: {
        ...makeWorkspaceRow(),
        _count: { memberships: 5, projects: 3 },
      },
    });
    const ws = await WorkspaceService.getForUser('ws-1', 'user-1');
    assert.ok(ws);
    assert.equal(ws!.id, 'ws-1');
    assert.equal(ws!.role, 'admin');
    assert.equal(ws!.memberCount, 5);
    assert.equal(ws!.projectCount, 3);
  });

  it('getForUser returns null when not a member', async () => {
    membershipFindUniqueImpl = async () => null;
    const ws = await WorkspaceService.getForUser('ws-1', 'user-1');
    assert.equal(ws, null);
  });

  it('getForUser returns null when workspace is deleted', async () => {
    membershipFindUniqueImpl = async () => ({
      role: 'owner',
      workspace: { ...makeWorkspaceRow(), deletedAt: new Date('2024-02-01'), _count: { memberships: 1, projects: 0 } },
    });
    const ws = await WorkspaceService.getForUser('ws-1', 'user-1');
    assert.equal(ws, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — WorkspaceService.create
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceService — create', () => {
  beforeEach(() => resetMock());

  it('creates a workspace within an existing org the user owns', async () => {
    orgFindUniqueImpl = async () => makeOrgRow();
    workspaceCreateImpl = async (args) => makeWorkspaceRow({ ...args.data as Record<string, unknown> });
    membershipCreateImpl = async (args) => makeMembershipRow({ ...args.data as Record<string, unknown> });
    const ws = await WorkspaceService.create('user-1', 'New WS', 'org-1');
    assert.equal(ws.id, 'ws-1');
    assert.equal(ws.role, 'owner');
    assert.equal(ws.organizationId, 'org-1');
  });

  it('throws when user does not own the org', async () => {
    orgFindUniqueImpl = async () => makeOrgRow({ ownerId: 'other-user' });
    await assert.rejects(
      () => WorkspaceService.create('user-1', 'New WS', 'org-1'),
      /Not authorized/,
    );
  });

  it('throws when org does not exist', async () => {
    orgFindUniqueImpl = async () => null;
    await assert.rejects(
      () => WorkspaceService.create('user-1', 'New WS', 'org-1'),
      /Not authorized/,
    );
  });

  it('uses existing org when no orgId provided', async () => {
    orgFindManyImpl = async () => [makeOrgRow()];
    orgFindUniqueImpl = async () => makeOrgRow();
    workspaceCreateImpl = async (args) => makeWorkspaceRow({ ...args.data as Record<string, unknown> });
    membershipCreateImpl = async (args) => makeMembershipRow({ ...args.data as Record<string, unknown> });
    const ws = await WorkspaceService.create('user-1', 'New WS');
    assert.equal(ws.organizationId, 'org-1');
  });

  it('creates a new org when user has none and no orgId provided', async () => {
    orgFindManyImpl = async () => [];
    // After orgCreate runs, the findUnique verification must return the created org
    orgFindUniqueImpl = async () => makeOrgRow({ ownerId: 'user-1' });
    orgCreateImpl = async (args) => makeOrgRow({ ...args.data as Record<string, unknown>, ownerId: 'user-1' });
    workspaceCreateImpl = async (args) => makeWorkspaceRow({ ...args.data as Record<string, unknown> });
    membershipCreateImpl = async (args) => makeMembershipRow({ ...args.data as Record<string, unknown> });
    const ws = await WorkspaceService.create('user-1', 'New WS');
    assert.equal(ws.role, 'owner');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — WorkspaceService.ensureDefaultWorkspace
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceService — ensureDefaultWorkspace', () => {
  beforeEach(() => resetMock());

  it('returns existing workspace when user already has one', async () => {
    membershipFindManyImpl = async () => [
      { role: 'owner', workspace: makeWorkspaceRow() },
    ];
    const ws = await WorkspaceService.ensureDefaultWorkspace('user-1', 'Alice');
    assert.equal(ws.id, 'ws-1');
    assert.equal(ws.role, 'owner');
  });

  it('creates default org + workspace when user has none', async () => {
    membershipFindManyImpl = async () => [];
    orgFindUniqueImpl = async () => null;
    workspaceFindUniqueImpl = async () => null;
    orgCreateImpl = async (args) => makeOrgRow({ ...args.data as Record<string, unknown> });
    workspaceCreateImpl = async (args) => makeWorkspaceRow({ ...args.data as Record<string, unknown> });
    membershipCreateImpl = async (args) => makeMembershipRow({ ...args.data as Record<string, unknown> });
    const ws = await WorkspaceService.ensureDefaultWorkspace('user-1', 'Alice');
    assert.equal(ws.role, 'owner');
    assert.equal(ws.organizationId, 'org-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — WorkspaceService member management
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceService — member management', () => {
  beforeEach(() => resetMock());

  it('listMembers returns members with user info', async () => {
    membershipFindFirstImpl = async () => makeMembershipRow();
    membershipFindManyImpl = async () => [
      { id: 'mem-1', role: 'owner', user: { id: 'user-1', name: 'Alice', email: 'a@x.com', image: null }, createdAt: new Date('2024-01-01') },
    ];
    const members = await WorkspaceService.listMembers('ws-1', 'user-1');
    assert.equal(members.length, 1);
    assert.equal(members[0].role, 'owner');
    assert.equal(members[0].user.email, 'a@x.com');
  });

  it('listMembers throws when requester is not a member', async () => {
    membershipFindFirstImpl = async () => null;
    await assert.rejects(
      () => WorkspaceService.listMembers('ws-1', 'user-1'),
      /Not a member/,
    );
  });

  it('addMember succeeds when requester is owner', async () => {
    membershipFindUniqueImpl = async () => makeMembershipRow({ role: 'owner' });
    membershipCreateImpl = async () => ({});
    await WorkspaceService.addMember('ws-1', 'user-1', 'user-2', 'member');
    const createCall = calls.find((c) => c.method === 'membership.create');
    assert.ok(createCall);
  });

  it('addMember throws when requester is only a member', async () => {
    membershipFindUniqueImpl = async () => makeMembershipRow({ role: 'member' });
    await assert.rejects(
      () => WorkspaceService.addMember('ws-1', 'user-1', 'user-2'),
      /Not authorized/,
    );
  });

  it('addMember throws when requester is not a member', async () => {
    membershipFindUniqueImpl = async () => null;
    await assert.rejects(
      () => WorkspaceService.addMember('ws-1', 'user-1', 'user-2'),
      /Not authorized/,
    );
  });

  it('updateMemberRole updates the role', async () => {
    membershipFindUniqueImpl = async () => makeMembershipRow({ role: 'admin' });
    membershipUpdateImpl = async (args) => makeMembershipRow({ ...args.data as Record<string, unknown> });
    await WorkspaceService.updateMemberRole('ws-1', 'user-1', 'user-2', 'admin');
    const updateCall = calls.find((c) => c.method === 'membership.update');
    assert.ok(updateCall);
    assert.equal((updateCall!.args as { data: Record<string, unknown> }).data.role, 'admin');
  });

  it('updateMemberRole throws when requester is only a member', async () => {
    membershipFindUniqueImpl = async () => makeMembershipRow({ role: 'member' });
    await assert.rejects(
      () => WorkspaceService.updateMemberRole('ws-1', 'user-1', 'user-2', 'admin'),
      /Not authorized/,
    );
  });

  it('removeMember deletes the membership', async () => {
    membershipFindUniqueImpl = async () => makeMembershipRow({ role: 'admin' });
    membershipDeleteImpl = async () => ({});
    await WorkspaceService.removeMember('ws-1', 'user-1', 'user-2');
    const deleteCall = calls.find((c) => c.method === 'membership.delete');
    assert.ok(deleteCall);
  });

  it('removeMember throws when trying to remove the owner', async () => {
    // requester is owner, target is also owner
    membershipFindUniqueImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      const compound = where.userId_workspaceId as { userId: string; workspaceId: string };
      if (compound.userId === 'user-1') return makeMembershipRow({ role: 'owner' });
      if (compound.userId === 'user-2') return makeMembershipRow({ role: 'owner', userId: 'user-2' });
      return null;
    };
    await assert.rejects(
      () => WorkspaceService.removeMember('ws-1', 'user-1', 'user-2'),
      /Cannot remove the owner/,
    );
  });

  it('removeMember throws when requester is only a member', async () => {
    membershipFindUniqueImpl = async () => makeMembershipRow({ role: 'member' });
    await assert.rejects(
      () => WorkspaceService.removeMember('ws-1', 'user-1', 'user-2'),
      /Not authorized/,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — slug helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceService — slug helpers', () => {
  beforeEach(() => resetMock());

  it('orgSlugExists returns slug when found', async () => {
    orgFindUniqueImpl = async () => ({ slug: 'acme' });
    const result = await WorkspaceService.orgSlugExists('acme');
    assert.equal(result, 'acme');
  });

  it('orgSlugExists returns null when not found', async () => {
    orgFindUniqueImpl = async () => null;
    const result = await WorkspaceService.orgSlugExists('acme');
    assert.equal(result, null);
  });

  it('wsSlugExists returns slug when found', async () => {
    workspaceFindUniqueImpl = async () => ({ slug: 'acme' });
    const result = await WorkspaceService.wsSlugExists('acme');
    assert.equal(result, 'acme');
  });

  it('wsSlugExists returns null when not found', async () => {
    workspaceFindUniqueImpl = async () => null;
    const result = await WorkspaceService.wsSlugExists('acme');
    assert.equal(result, null);
  });
});
