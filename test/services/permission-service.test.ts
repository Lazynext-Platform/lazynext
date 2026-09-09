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

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: FindManyArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: FindManyArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'permission_policy',
    content: JSON.stringify({
      name: 'Access Policy',
      type: 'access',
      description: 'Standard access policy',
      status: 'draft',
      resource: 'documents',
      action: 'read',
      effect: 'allow',
      conditions: '',
      priority: 0,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['permission_policy', 'access', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeRoleRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'permission_role',
    content: JSON.stringify({
      name: 'Admin Role',
      type: 'admin',
      description: 'Administrator role',
      status: 'active',
      permissions: 'all',
      inherits: '',
      scope: 'organization',
      assignable: true,
      notes: '',
    }),
    tags: JSON.stringify(['permission_role', 'admin', 'active']),
    ...overrides,
  });
}

function makeGrantRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-g1',
    type: 'permission_grant',
    content: JSON.stringify({
      name: 'User Access Grant',
      type: 'user',
      description: 'Grant user access to documents',
      status: 'pending',
      principalId: 'user-2',
      principalType: 'user',
      resourceId: 'doc-1',
      resourceType: 'document',
      permissions: 'read',
      grantedBy: 'user-1',
      grantedAt: null,
      expiresAt: null,
      notes: '',
    }),
    tags: JSON.stringify(['permission_grant', 'user', 'pending']),
    ...overrides,
  });
}

function makeCheckRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'permission_check',
    content: JSON.stringify({
      name: 'Access Check',
      type: 'access',
      description: 'Check user access to document',
      status: 'allowed',
      principalId: 'user-2',
      principalType: 'user',
      resourceId: 'doc-1',
      resourceType: 'document',
      action: 'read',
      policyId: 'mem-1',
      result: 'allowed',
      reason: 'Policy allows read access',
      checkedAt: null,
      notes: '',
    }),
    tags: JSON.stringify(['permission_check', 'access', 'allowed']),
    ...overrides,
  });
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { PermissionService } = await import('@/lib/services/permission-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Permission Policies
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionService — Permission Policies', () => {
  beforeEach(() => resetMock());

  it('creates a permission policy with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await PermissionService.createPermissionPolicy('org-1', 'ws-1', {
      name: 'Read Policy', type: 'access',
    }, 'user-1');
    assert.equal(p.name, 'Read Policy');
    assert.equal(p.status, 'draft');
    assert.equal(p.priority, 0);
  });

  it('creates a permission policy with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await PermissionService.createPermissionPolicy('org-1', 'ws-1', {
      name: 'Admin Policy', type: 'admin', description: 'Admin access policy',
      status: 'active', resource: 'settings', action: 'write', effect: 'deny',
      conditions: 'role=admin', priority: 10, notes: 'High priority',
    }, 'user-1');
    assert.equal(p.name, 'Admin Policy');
    assert.equal(p.type, 'admin');
    assert.equal(p.priority, 10);
    assert.equal(p.effect, 'deny');
  });

  it('gets a permission policy by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await PermissionService.getPermissionPolicy('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Access Policy');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'permission_role' });
    const p = await PermissionService.getPermissionPolicy('mem-1');
    assert.equal(p, null);
  });

  it('returns null when permission policy not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await PermissionService.getPermissionPolicy('nope');
    assert.equal(p, null);
  });

  it('lists permission policies by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'permission_policy') return [makeRow()];
      return [];
    };
    const list = await PermissionService.listPermissionPolicies('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Access Policy');
  });

  it('updates a permission policy', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PermissionService.updatePermissionPolicy('mem-1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a permission policy', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PermissionService.deletePermissionPolicy('mem-1');
    assert.equal(ok, true);
  });

  it('activatePermissionPolicy sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PermissionService.activatePermissionPolicy('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deprecatePermissionPolicy sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PermissionService.deprecatePermissionPolicy('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'deprecated');
  });

  it('archivePermissionPolicy sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PermissionService.archivePermissionPolicy('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Permission Roles
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionService — Permission Roles', () => {
  beforeEach(() => resetMock());

  it('creates a permission role with defaults', async () => {
    memCreateImpl = async (args) => makeRoleRow({ content: args.data.content as string });
    const r = await PermissionService.createPermissionRole('org-1', 'ws-1', {
      name: 'Viewer Role', type: 'viewer',
    }, 'user-1');
    assert.equal(r.name, 'Viewer Role');
    assert.equal(r.status, 'active');
    assert.equal(r.assignable, false);
  });

  it('creates a permission role with full input', async () => {
    memCreateImpl = async (args) => makeRoleRow({ content: args.data.content as string });
    const r = await PermissionService.createPermissionRole('org-1', 'ws-1', {
      name: 'Manager Role', type: 'manager', description: 'Manager role',
      status: 'inactive', permissions: 'read,write', inherits: 'viewer',
      scope: 'workspace', assignable: true, notes: 'Custom role',
    }, 'user-1');
    assert.equal(r.name, 'Manager Role');
    assert.equal(r.type, 'manager');
    assert.equal(r.assignable, true);
    assert.equal(r.inherits, 'viewer');
  });

  it('gets a permission role by id', async () => {
    memFindUniqueImpl = async () => makeRoleRow();
    const r = await PermissionService.getPermissionRole('mem-r1');
    assert.ok(r);
    assert.equal(r!.name, 'Admin Role');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRoleRow({ type: 'permission_policy' });
    const r = await PermissionService.getPermissionRole('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when permission role not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await PermissionService.getPermissionRole('nope');
    assert.equal(r, null);
  });

  it('lists permission roles by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'permission_role') return [makeRoleRow()];
      return [];
    };
    const list = await PermissionService.listPermissionRoles('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a permission role', async () => {
    memFindUniqueImpl = async () => makeRoleRow();
    memUpdateImpl = async (args) => makeRoleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await PermissionService.updatePermissionRole('mem-r1', { status: 'inactive' });
    assert.ok(r);
    assert.equal(r!.status, 'inactive');
  });

  it('deletes a permission role', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await PermissionService.deletePermissionRole('mem-r1');
    assert.equal(ok, true);
  });

  it('activatePermissionRole sets status to active', async () => {
    memFindUniqueImpl = async () => makeRoleRow();
    memUpdateImpl = async (args) => makeRoleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await PermissionService.activatePermissionRole('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'active');
  });

  it('deactivatePermissionRole sets status to inactive', async () => {
    memFindUniqueImpl = async () => makeRoleRow();
    memUpdateImpl = async (args) => makeRoleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await PermissionService.deactivatePermissionRole('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'inactive');
  });

  it('deprecatePermissionRole sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeRoleRow();
    memUpdateImpl = async (args) => makeRoleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await PermissionService.deprecatePermissionRole('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'deprecated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Permission Grants
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionService — Permission Grants', () => {
  beforeEach(() => resetMock());

  it('creates a permission grant with defaults', async () => {
    memCreateImpl = async (args) => makeGrantRow({ content: args.data.content as string });
    const g = await PermissionService.createPermissionGrant('org-1', 'ws-1', {
      name: 'Team Grant', type: 'team',
    }, 'user-1');
    assert.equal(g.name, 'Team Grant');
    assert.equal(g.status, 'pending');
    assert.equal(g.principalId, '');
  });

  it('creates a permission grant with full input', async () => {
    memCreateImpl = async (args) => makeGrantRow({ content: args.data.content as string });
    const g = await PermissionService.createPermissionGrant('org-1', 'ws-1', {
      name: 'Agent Grant', type: 'agent', description: 'Agent access grant',
      status: 'active', principalId: 'agent-1', principalType: 'agent',
      resourceId: 'tool-1', resourceType: 'tool', permissions: 'execute',
      grantedBy: 'admin', grantedAt: '2028-01-01', expiresAt: '2028-12-31',
      notes: 'Temporary grant',
    }, 'user-1');
    assert.equal(g.name, 'Agent Grant');
    assert.equal(g.type, 'agent');
    assert.equal(g.principalId, 'agent-1');
    assert.equal(g.resourceId, 'tool-1');
  });

  it('gets a permission grant by id', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    const g = await PermissionService.getPermissionGrant('mem-g1');
    assert.ok(g);
    assert.equal(g!.name, 'User Access Grant');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeGrantRow({ type: 'permission_policy' });
    const g = await PermissionService.getPermissionGrant('mem-g1');
    assert.equal(g, null);
  });

  it('returns null when permission grant not found', async () => {
    memFindUniqueImpl = async () => null;
    const g = await PermissionService.getPermissionGrant('nope');
    assert.equal(g, null);
  });

  it('lists permission grants by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'permission_grant') return [makeGrantRow()];
      return [];
    };
    const list = await PermissionService.listPermissionGrants('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a permission grant', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await PermissionService.updatePermissionGrant('mem-g1', { status: 'active' });
    assert.ok(g);
    assert.equal(g!.status, 'active');
  });

  it('deletes a permission grant', async () => {
    memDeleteImpl = async () => ({ id: 'mem-g1' });
    const ok = await PermissionService.deletePermissionGrant('mem-g1');
    assert.equal(ok, true);
  });

  it('grantPermission sets status to active', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await PermissionService.grantPermission('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'active');
  });

  it('revokePermission sets status to revoked', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await PermissionService.revokePermission('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'revoked');
  });

  it('expirePermission sets status to expired', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await PermissionService.expirePermission('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'expired');
  });

  it('pendingPermission sets status to pending', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await PermissionService.pendingPermission('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'pending');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Permission Checks
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionService — Permission Checks', () => {
  beforeEach(() => resetMock());

  it('creates a permission check with defaults', async () => {
    memCreateImpl = async (args) => makeCheckRow({ content: args.data.content as string });
    const c = await PermissionService.createPermissionCheck('org-1', 'ws-1', {
      name: 'Read Check', type: 'access',
    }, 'user-1');
    assert.equal(c.name, 'Read Check');
    assert.equal(c.status, 'allowed');
    assert.equal(c.principalId, '');
  });

  it('creates a permission check with full input', async () => {
    memCreateImpl = async (args) => makeCheckRow({ content: args.data.content as string });
    const c = await PermissionService.createPermissionCheck('org-1', 'ws-1', {
      name: 'Admin Check', type: 'admin', description: 'Admin access check',
      status: 'denied', principalId: 'user-3', principalType: 'user',
      resourceId: 'settings', resourceType: 'config', action: 'delete',
      policyId: 'mem-2', result: 'denied', reason: 'No admin policy',
      checkedAt: '2028-01-01', notes: 'Blocked',
    }, 'user-1');
    assert.equal(c.name, 'Admin Check');
    assert.equal(c.type, 'admin');
    assert.equal(c.principalId, 'user-3');
    assert.equal(c.policyId, 'mem-2');
  });

  it('gets a permission check by id', async () => {
    memFindUniqueImpl = async () => makeCheckRow();
    const c = await PermissionService.getPermissionCheck('mem-c1');
    assert.ok(c);
    assert.equal(c!.name, 'Access Check');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCheckRow({ type: 'permission_policy' });
    const c = await PermissionService.getPermissionCheck('mem-c1');
    assert.equal(c, null);
  });

  it('returns null when permission check not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await PermissionService.getPermissionCheck('nope');
    assert.equal(c, null);
  });

  it('lists permission checks by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'permission_check') return [makeCheckRow()];
      return [];
    };
    const list = await PermissionService.listPermissionChecks('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a permission check', async () => {
    memFindUniqueImpl = async () => makeCheckRow();
    memUpdateImpl = async (args) => makeCheckRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await PermissionService.updatePermissionCheck('mem-c1', { status: 'denied' });
    assert.ok(c);
    assert.equal(c!.status, 'denied');
  });

  it('deletes a permission check', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await PermissionService.deletePermissionCheck('mem-c1');
    assert.equal(ok, true);
  });

  it('allowCheck sets status to allowed', async () => {
    memFindUniqueImpl = async () => makeCheckRow();
    memUpdateImpl = async (args) => makeCheckRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await PermissionService.allowCheck('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'allowed');
  });

  it('denyCheck sets status to denied', async () => {
    memFindUniqueImpl = async () => makeCheckRow();
    memUpdateImpl = async (args) => makeCheckRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await PermissionService.denyCheck('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'denied');
  });

  it('conditionalCheck sets status to conditional', async () => {
    memFindUniqueImpl = async () => makeCheckRow();
    memUpdateImpl = async (args) => makeCheckRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await PermissionService.conditionalCheck('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'conditional');
  });

  it('errorCheck sets status to error', async () => {
    memFindUniqueImpl = async () => makeCheckRow();
    memUpdateImpl = async (args) => makeCheckRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await PermissionService.errorCheck('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getPermissionMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'permission_policy') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'access', status: 'active', description: '', resource: '', action: '', effect: 'allow', conditions: '', priority: 0, notes: '' }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'P2', type: 'access', status: 'draft', description: '', resource: '', action: '', effect: 'allow', conditions: '', priority: 0, notes: '' }) }),
      ];
      if (t === 'permission_role') return [
        makeRoleRow({ content: JSON.stringify({ name: 'R1', type: 'admin', status: 'active', description: '', permissions: '', inherits: '', scope: '', assignable: false, notes: '' }) }),
      ];
      if (t === 'permission_grant') return [
        makeGrantRow({ content: JSON.stringify({ name: 'G1', type: 'user', status: 'active', description: '', principalId: '', principalType: '', resourceId: '', resourceType: '', permissions: '', grantedBy: '', grantedAt: null, expiresAt: null, notes: '' }) }),
      ];
      if (t === 'permission_check') return [
        makeCheckRow({ content: JSON.stringify({ name: 'C1', type: 'access', status: 'allowed', description: '', principalId: '', principalType: '', resourceId: '', resourceType: '', action: '', policyId: '', result: '', reason: '', checkedAt: null, notes: '' }) }),
        makeCheckRow({ id: 'c2', content: JSON.stringify({ name: 'C2', type: 'access', status: 'denied', description: '', principalId: '', principalType: '', resourceId: '', resourceType: '', action: '', policyId: '', result: '', reason: '', checkedAt: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await PermissionService.getPermissionMetrics('org-1');
    assert.equal(m.activePolicies, 1);
    assert.equal(m.activeRoles, 1);
    assert.equal(m.activeGrants, 1);
    assert.equal(m.allowedChecks, 1);
    assert.equal(m.deniedChecks, 1);
  });

  it('getPermissionStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'permission_policy') return [makeRow()];
      if (t === 'permission_role') return [makeRoleRow()];
      if (t === 'permission_grant') return [makeGrantRow()];
      if (t === 'permission_check') return [makeCheckRow()];
      return [];
    };
    const s = await PermissionService.getPermissionStats('org-1');
    assert.equal(s.policyCount, 1);
    assert.equal(s.roleCount, 1);
    assert.equal(s.grantCount, 1);
    assert.equal(s.checkCount, 1);
    assert.equal(s.byPolicyType['access'], 1);
    assert.equal(s.byRoleType['admin'], 1);
    assert.equal(s.byGrantType['user'], 1);
    assert.equal(s.byCheckType['access'], 1);
  });
});
