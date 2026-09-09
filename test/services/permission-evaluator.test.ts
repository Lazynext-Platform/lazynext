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

// ── Prisma mock (memory-backed) ──

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

// ── Service mocks ──

let listPermissionPoliciesImpl: (orgId: string, opts: Record<string, unknown>) => Promise<unknown[]> = async () => [];
let listPermissionGrantsImpl: (orgId: string, opts: Record<string, unknown>) => Promise<unknown[]> = async () => [];
let listPermissionRolesImpl: (orgId: string, opts: Record<string, unknown>) => Promise<unknown[]> = async () => [];
let createPermissionCheckImpl: (orgId: string, wsId: string, input: Record<string, unknown>, createdBy: string) => Promise<unknown> = async () => ({ id: 'chk-1' });

mock.module('@/lib/services/permission-service', {
  namedExports: {
    PermissionService: {
      listPermissionPolicies: (orgId: string, opts: Record<string, unknown>): Promise<unknown[]> => {
        calls.push({ method: 'PermissionService.listPermissionPolicies', args: { orgId, opts } });
        return listPermissionPoliciesImpl(orgId, opts);
      },
      listPermissionGrants: (orgId: string, opts: Record<string, unknown>): Promise<unknown[]> => {
        calls.push({ method: 'PermissionService.listPermissionGrants', args: { orgId, opts } });
        return listPermissionGrantsImpl(orgId, opts);
      },
      listPermissionRoles: (orgId: string, opts: Record<string, unknown>): Promise<unknown[]> => {
        calls.push({ method: 'PermissionService.listPermissionRoles', args: { orgId, opts } });
        return listPermissionRolesImpl(orgId, opts);
      },
      createPermissionCheck: (orgId: string, wsId: string, input: Record<string, unknown>, createdBy: string): Promise<unknown> => {
        calls.push({ method: 'PermissionService.createPermissionCheck', args: { orgId, wsId, input, createdBy } });
        return createPermissionCheckImpl(orgId, wsId, input, createdBy);
      },
    },
  },
});

let getByNameImpl: (workspaceId: string, name: string) => Promise<unknown> = async () => null;
let checkAgentAllowedImpl: (toolId: string, agentRole: string) => Promise<boolean> = async () => true;

mock.module('@/lib/services/tool-registry', {
  namedExports: {
    ToolRegistryService: {
      getByName: (workspaceId: string, name: string): Promise<unknown> => {
        calls.push({ method: 'ToolRegistryService.getByName', args: { workspaceId, name } });
        return getByNameImpl(workspaceId, name);
      },
      checkAgentAllowed: (toolId: string, agentRole: string): Promise<boolean> => {
        calls.push({ method: 'ToolRegistryService.checkAgentAllowed', args: { toolId, agentRole } });
        return checkAgentAllowedImpl(toolId, agentRole);
      },
    },
  },
});

let budgetCheckImpl: (input: Record<string, unknown>) => Promise<unknown> = async () => ({ allowed: true, remainingCredits: 1000 });

mock.module('@/lib/services/budget', {
  namedExports: {
    BudgetService: {
      check: (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'BudgetService.check', args: input });
        return budgetCheckImpl(input);
      },
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
  listPermissionPoliciesImpl = async () => [];
  listPermissionGrantsImpl = async () => [];
  listPermissionRolesImpl = async () => [];
  createPermissionCheckImpl = async () => ({ id: 'chk-1' });
  getByNameImpl = async () => null;
  checkAgentAllowedImpl = async () => true;
  budgetCheckImpl = async () => ({ allowed: true, remainingCredits: 1000 });
}

const { PermissionEvaluator } = await import('@/lib/services/permission-evaluator');

function baseCtx(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    principalId: 'user-1',
    principalType: 'user',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    resource: 'company',
    resourceType: 'company',
    action: 'read',
    environment: 'local',
    ...overrides,
  };
}

function findCall(method: string): CallRecord | undefined {
  return calls.find((c) => c.method === method);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests — checkPermission (combined)
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionEvaluator — checkPermission', () => {
  beforeEach(() => resetMock());

  it('returns allow when all layers allow', async () => {
    // Provide an owner role so the role policy layer returns allow for a user
    // with no explicit grants.
    listPermissionRolesImpl = async () => [{ type: 'owner', status: 'active' }];
    const result = await PermissionEvaluator.checkPermission(baseCtx() as never);
    assert.equal(result.decision, 'allow');
    assert.ok(result.layers.length > 0);
    assert.ok(result.evaluatedAt);
  });

  it('returns deny when a company policy denies', async () => {
    listPermissionPoliciesImpl = async () => [
      { resource: 'company', action: 'read', effect: 'deny', workspaceId: '' },
    ];
    const result = await PermissionEvaluator.checkPermission(baseCtx() as never);
    assert.equal(result.decision, 'deny');
    // Short-circuits on deny — company_policy is layer 1
    const denied = result.layers.find((l) => l.result === 'deny');
    assert.ok(denied);
    assert.equal(denied!.layer, 'company_policy');
  });

  it('returns require_approval when a company policy is conditional', async () => {
    listPermissionPoliciesImpl = async () => [
      { resource: 'company', action: 'read', effect: 'conditional', workspaceId: '' },
    ];
    const result = await PermissionEvaluator.checkPermission(baseCtx() as never);
    assert.equal(result.decision, 'require_approval');
  });

  it('returns require_approval for deploy action (resource policy)', async () => {
    const result = await PermissionEvaluator.checkPermission(
      baseCtx({ action: 'deploy', resource: 'app', resourceType: 'deployment' }) as never,
    );
    assert.equal(result.decision, 'require_approval');
  });

  it('returns allow_with_limit for medium-risk agent action (risk policy)', async () => {
    // Provide an allow grant so the role policy layer does not override with
    // require_approval (which is more restrictive than allow_with_limit).
    listPermissionGrantsImpl = async () => [
      {
        status: 'active',
        resourceId: '*',
        resourceType: '*',
        permissions: JSON.stringify(['read']),
      },
    ];
    const result = await PermissionEvaluator.checkPermission(
      baseCtx({ principalType: 'agent', riskLevel: 'medium' }) as never,
    );
    assert.equal(result.decision, 'allow_with_limit');
  });

  it('returns require_approval for high-risk action (risk policy)', async () => {
    const result = await PermissionEvaluator.checkPermission(
      baseCtx({ riskLevel: 'high' }) as never,
    );
    assert.equal(result.decision, 'require_approval');
  });

  it('short-circuits on deny and stops evaluating further layers', async () => {
    listPermissionPoliciesImpl = async () => [
      { resource: '*', action: '*', effect: 'deny', workspaceId: '' },
    ];
    const result = await PermissionEvaluator.checkPermission(baseCtx() as never);
    assert.equal(result.decision, 'deny');
    // Only the company_policy layer should have run (deny short-circuits)
    assert.equal(result.layers.length, 1);
    assert.equal(result.layers[0].layer, 'company_policy');
  });

  it('records the decision via PermissionService.createPermissionCheck', async () => {
    await PermissionEvaluator.checkPermission(baseCtx() as never);
    assert.ok(findCall('PermissionService.createPermissionCheck'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Layer evaluators
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionEvaluator — evaluateCompanyPolicy', () => {
  beforeEach(() => resetMock());

  it('returns allow when no policies exist', async () => {
    const decision = await PermissionEvaluator.evaluateCompanyPolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });

  it('returns deny when a matching deny policy exists', async () => {
    listPermissionPoliciesImpl = async () => [
      { resource: 'company', action: 'read', effect: 'deny', workspaceId: '' },
    ];
    const decision = await PermissionEvaluator.evaluateCompanyPolicy(baseCtx() as never);
    assert.equal(decision, 'deny');
  });

  it('returns require_approval when a matching conditional policy exists', async () => {
    listPermissionPoliciesImpl = async () => [
      { resource: 'company', action: 'read', effect: 'conditional', workspaceId: '' },
    ];
    const decision = await PermissionEvaluator.evaluateCompanyPolicy(baseCtx() as never);
    assert.equal(decision, 'require_approval');
  });

  it('matches wildcard resource and action', async () => {
    listPermissionPoliciesImpl = async () => [
      { resource: '*', action: '*', effect: 'deny', workspaceId: '' },
    ];
    const decision = await PermissionEvaluator.evaluateCompanyPolicy(baseCtx() as never);
    assert.equal(decision, 'deny');
  });

  it('skips non-matching policies', async () => {
    listPermissionPoliciesImpl = async () => [
      { resource: 'other', action: 'write', effect: 'deny', workspaceId: '' },
    ];
    const decision = await PermissionEvaluator.evaluateCompanyPolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });
});

describe('PermissionEvaluator — evaluateWorkspacePolicy', () => {
  beforeEach(() => resetMock());

  it('returns allow when no policies exist', async () => {
    const decision = await PermissionEvaluator.evaluateWorkspacePolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });

  it('returns deny when a matching workspace deny policy exists', async () => {
    listPermissionPoliciesImpl = async () => [
      { resource: 'company', action: 'read', effect: 'deny', workspaceId: 'ws-1' },
    ];
    const decision = await PermissionEvaluator.evaluateWorkspacePolicy(baseCtx() as never);
    assert.equal(decision, 'deny');
  });

  it('skips policies for other workspaces', async () => {
    listPermissionPoliciesImpl = async () => [
      { resource: 'company', action: 'read', effect: 'deny', workspaceId: 'ws-other' },
    ];
    const decision = await PermissionEvaluator.evaluateWorkspacePolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });
});

describe('PermissionEvaluator — evaluateRolePolicy', () => {
  beforeEach(() => resetMock());

  it('returns require_approval for a user with no grants or roles', async () => {
    const decision = await PermissionEvaluator.evaluateRolePolicy(baseCtx() as never);
    assert.equal(decision, 'require_approval');
  });

  it('returns allow when an explicit allow grant matches', async () => {
    listPermissionGrantsImpl = async () => [
      {
        status: 'active',
        resourceId: '*',
        resourceType: '*',
        permissions: JSON.stringify(['read']),
      },
    ];
    const decision = await PermissionEvaluator.evaluateRolePolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });

  it('returns deny when an explicit deny grant exists', async () => {
    listPermissionGrantsImpl = async () => [
      {
        status: 'active',
        resourceId: '*',
        resourceType: '*',
        permissions: JSON.stringify(['deny:read']),
      },
    ];
    const decision = await PermissionEvaluator.evaluateRolePolicy(baseCtx() as never);
    assert.equal(decision, 'deny');
  });

  it('returns allow_with_limit when a limit grant exists', async () => {
    listPermissionGrantsImpl = async () => [
      {
        status: 'active',
        resourceId: '*',
        resourceType: '*',
        permissions: JSON.stringify(['limit:read']),
      },
    ];
    const decision = await PermissionEvaluator.evaluateRolePolicy(baseCtx() as never);
    assert.equal(decision, 'allow_with_limit');
  });

  it('returns allow when an owner role exists', async () => {
    listPermissionRolesImpl = async () => [
      { type: 'owner', status: 'active' },
    ];
    const decision = await PermissionEvaluator.evaluateRolePolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });

  it('returns require_approval for an agent with no grants', async () => {
    const decision = await PermissionEvaluator.evaluateRolePolicy(
      baseCtx({ principalType: 'agent' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });
});

describe('PermissionEvaluator — evaluateToolPolicy', () => {
  beforeEach(() => resetMock());

  it('returns allow when resource is not a tool', async () => {
    const decision = await PermissionEvaluator.evaluateToolPolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });

  it('returns allow when tool is unknown (not registered)', async () => {
    getByNameImpl = async () => null;
    const decision = await PermissionEvaluator.evaluateToolPolicy(
      baseCtx({ resource: 'tool.github', resourceType: 'tool' }) as never,
    );
    assert.equal(decision, 'allow');
  });

  it('returns deny when the tool is disabled', async () => {
    getByNameImpl = async () => ({ id: 'tool-1', enabled: false, riskCategory: 'low' });
    const decision = await PermissionEvaluator.evaluateToolPolicy(
      baseCtx({ resource: 'tool.github', resourceType: 'tool' }) as never,
    );
    assert.equal(decision, 'deny');
  });

  it('returns deny when the agent is not allowed to use the tool', async () => {
    getByNameImpl = async () => ({ id: 'tool-1', enabled: true, riskCategory: 'low' });
    checkAgentAllowedImpl = async () => false;
    const decision = await PermissionEvaluator.evaluateToolPolicy(
      baseCtx({ resource: 'tool.github', resourceType: 'tool', principalType: 'agent' }) as never,
    );
    assert.equal(decision, 'deny');
  });

  it('returns require_approval for a high-risk tool', async () => {
    getByNameImpl = async () => ({ id: 'tool-1', enabled: true, riskCategory: 'high' });
    checkAgentAllowedImpl = async () => true;
    const decision = await PermissionEvaluator.evaluateToolPolicy(
      baseCtx({ resource: 'tool.github', resourceType: 'tool', principalType: 'agent' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns allow_with_limit for a medium-risk tool', async () => {
    getByNameImpl = async () => ({ id: 'tool-1', enabled: true, riskCategory: 'medium' });
    checkAgentAllowedImpl = async () => true;
    const decision = await PermissionEvaluator.evaluateToolPolicy(
      baseCtx({ resource: 'tool.github', resourceType: 'tool', principalType: 'agent' }) as never,
    );
    assert.equal(decision, 'allow_with_limit');
  });
});

describe('PermissionEvaluator — evaluateResourcePolicy', () => {
  beforeEach(() => resetMock());

  it('returns require_approval for deploy action', async () => {
    const decision = await PermissionEvaluator.evaluateResourcePolicy(
      baseCtx({ action: 'deploy' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns require_approval for delete action', async () => {
    const decision = await PermissionEvaluator.evaluateResourcePolicy(
      baseCtx({ action: 'delete' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns require_approval for non-read on deployment resource', async () => {
    const decision = await PermissionEvaluator.evaluateResourcePolicy(
      baseCtx({ action: 'update', resourceType: 'deployment' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns allow for read on deployment resource', async () => {
    const decision = await PermissionEvaluator.evaluateResourcePolicy(
      baseCtx({ action: 'read', resourceType: 'deployment' }) as never,
    );
    assert.equal(decision, 'allow');
  });

  it('returns require_approval for non-read on billing resource', async () => {
    const decision = await PermissionEvaluator.evaluateResourcePolicy(
      baseCtx({ action: 'update', resourceType: 'billing' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns allow for read on billing resource', async () => {
    const decision = await PermissionEvaluator.evaluateResourcePolicy(
      baseCtx({ action: 'read', resourceType: 'billing' }) as never,
    );
    assert.equal(decision, 'allow');
  });

  it('returns allow for a normal read action', async () => {
    const decision = await PermissionEvaluator.evaluateResourcePolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });
});

describe('PermissionEvaluator — evaluateEnvironmentPolicy', () => {
  beforeEach(() => resetMock());

  it('returns allow in local environment', async () => {
    const decision = await PermissionEvaluator.evaluateEnvironmentPolicy(
      baseCtx({ environment: 'local' }) as never,
    );
    assert.equal(decision, 'allow');
  });

  it('returns require_approval for agent non-read in production', async () => {
    const decision = await PermissionEvaluator.evaluateEnvironmentPolicy(
      baseCtx({ environment: 'production', principalType: 'agent', action: 'write' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns require_approval for delete in production', async () => {
    const decision = await PermissionEvaluator.evaluateEnvironmentPolicy(
      baseCtx({ environment: 'production', action: 'delete' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns require_approval for deploy in production', async () => {
    const decision = await PermissionEvaluator.evaluateEnvironmentPolicy(
      baseCtx({ environment: 'production', action: 'deploy' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns require_approval for delete in staging', async () => {
    const decision = await PermissionEvaluator.evaluateEnvironmentPolicy(
      baseCtx({ environment: 'staging', action: 'delete' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns allow for read in production by a user', async () => {
    const decision = await PermissionEvaluator.evaluateEnvironmentPolicy(
      baseCtx({ environment: 'production', principalType: 'user', action: 'read' }) as never,
    );
    assert.equal(decision, 'allow');
  });
});

describe('PermissionEvaluator — evaluateBudgetPolicy', () => {
  beforeEach(() => resetMock());

  it('returns allow when there is no budget impact', async () => {
    const decision = await PermissionEvaluator.evaluateBudgetPolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });

  it('returns deny when over budget', async () => {
    budgetCheckImpl = async () => ({ allowed: false, remainingCredits: 0 });
    const decision = await PermissionEvaluator.evaluateBudgetPolicy(
      baseCtx({ budgetImpact: 100 }) as never,
    );
    assert.equal(decision, 'deny');
  });

  it('returns allow_with_limit when impact exceeds half of remaining', async () => {
    budgetCheckImpl = async () => ({ allowed: true, remainingCredits: 100 });
    const decision = await PermissionEvaluator.evaluateBudgetPolicy(
      baseCtx({ budgetImpact: 60 }) as never,
    );
    assert.equal(decision, 'allow_with_limit');
  });

  it('returns allow when impact is small relative to remaining', async () => {
    budgetCheckImpl = async () => ({ allowed: true, remainingCredits: 1000 });
    const decision = await PermissionEvaluator.evaluateBudgetPolicy(
      baseCtx({ budgetImpact: 10 }) as never,
    );
    assert.equal(decision, 'allow');
  });
});

describe('PermissionEvaluator — evaluateRiskPolicy', () => {
  beforeEach(() => resetMock());

  it('returns allow for low risk', async () => {
    const decision = await PermissionEvaluator.evaluateRiskPolicy(
      baseCtx({ riskLevel: 'low' }) as never,
    );
    assert.equal(decision, 'allow');
  });

  it('returns require_approval for high risk', async () => {
    const decision = await PermissionEvaluator.evaluateRiskPolicy(
      baseCtx({ riskLevel: 'high' }) as never,
    );
    assert.equal(decision, 'require_approval');
  });

  it('returns allow_with_limit for medium risk by an agent', async () => {
    const decision = await PermissionEvaluator.evaluateRiskPolicy(
      baseCtx({ riskLevel: 'medium', principalType: 'agent' }) as never,
    );
    assert.equal(decision, 'allow_with_limit');
  });

  it('returns allow for medium risk by a user', async () => {
    const decision = await PermissionEvaluator.evaluateRiskPolicy(
      baseCtx({ riskLevel: 'medium', principalType: 'user' }) as never,
    );
    assert.equal(decision, 'allow');
  });

  it('defaults to low risk when riskLevel is not specified', async () => {
    const decision = await PermissionEvaluator.evaluateRiskPolicy(baseCtx() as never);
    assert.equal(decision, 'allow');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — recordDecision
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionEvaluator — recordDecision', () => {
  beforeEach(() => resetMock());

  it('records an allow decision with status allowed', async () => {
    const ctx = baseCtx();
    const result = {
      decision: 'allow' as const,
      reason: 'All layers allowed',
      layers: [],
      evaluatedAt: new Date(),
    };
    await PermissionEvaluator.recordDecision(ctx as never, result);
    const call = findCall('PermissionService.createPermissionCheck');
    assert.ok(call);
    const input = (call!.args as { input: Record<string, unknown> }).input;
    assert.equal(input.status, 'allowed');
    assert.equal(input.result, 'allow');
  });

  it('records a deny decision with status denied', async () => {
    const ctx = baseCtx();
    const result = {
      decision: 'deny' as const,
      reason: 'Denied',
      layers: [],
      evaluatedAt: new Date(),
    };
    await PermissionEvaluator.recordDecision(ctx as never, result);
    const call = findCall('PermissionService.createPermissionCheck');
    assert.ok(call);
    const input = (call!.args as { input: Record<string, unknown> }).input;
    assert.equal(input.status, 'denied');
    assert.equal(input.result, 'deny');
  });

  it('records a require_approval decision with status conditional', async () => {
    const ctx = baseCtx();
    const result = {
      decision: 'require_approval' as const,
      reason: 'Needs approval',
      layers: [],
      evaluatedAt: new Date(),
    };
    await PermissionEvaluator.recordDecision(ctx as never, result);
    const call = findCall('PermissionService.createPermissionCheck');
    assert.ok(call);
    const input = (call!.args as { input: Record<string, unknown> }).input;
    assert.equal(input.status, 'conditional');
    assert.equal(input.result, 'require_approval');
  });

  it('records an allow_with_limit decision with status conditional', async () => {
    const ctx = baseCtx();
    const result = {
      decision: 'allow_with_limit' as const,
      reason: 'Allowed with limit',
      layers: [],
      evaluatedAt: new Date(),
    };
    await PermissionEvaluator.recordDecision(ctx as never, result);
    const call = findCall('PermissionService.createPermissionCheck');
    assert.ok(call);
    const input = (call!.args as { input: Record<string, unknown> }).input;
    assert.equal(input.status, 'conditional');
    assert.equal(input.result, 'allow_with_limit');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — reasonFor
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionEvaluator — reasonFor', () => {
  const ctx = baseCtx({ action: 'read', resource: 'company' });

  it('builds a deny reason', () => {
    const reason = PermissionEvaluator.reasonFor('company_policy', 'deny', ctx as never);
    assert.ok(reason.includes('denied'));
    assert.ok(reason.includes('read'));
    assert.ok(reason.includes('company'));
  });

  it('builds a require_approval reason', () => {
    const reason = PermissionEvaluator.reasonFor('risk_policy', 'require_approval', ctx as never);
    assert.ok(reason.includes('requires approval'));
  });

  it('builds an allow_with_limit reason', () => {
    const reason = PermissionEvaluator.reasonFor('budget_policy', 'allow_with_limit', ctx as never);
    assert.ok(reason.includes('with limits'));
  });

  it('builds an allow reason', () => {
    const reason = PermissionEvaluator.reasonFor('role_policy', 'allow', ctx as never);
    assert.ok(reason.includes('allowed'));
  });
});
