import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PermissionPolicyType = 'access' | 'action' | 'resource' | 'data' | 'api' | 'admin' | 'agent' | 'tool' | 'budget' | 'deployment';
export type PermissionPolicyStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type Effect = 'allow' | 'deny' | 'conditional';
export type PermissionRoleType = 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'agent' | 'auditor' | 'custom';
export type PermissionRoleStatus = 'active' | 'inactive' | 'deprecated';
export type PermissionGrantType = 'user' | 'role' | 'agent' | 'team' | 'workspace' | 'organization';
export type PermissionGrantStatus = 'active' | 'revoked' | 'expired' | 'pending';
export type PermissionCheckType = 'access' | 'action' | 'resource' | 'data' | 'api' | 'admin' | 'agent' | 'tool' | 'budget' | 'deployment';
export type PermissionCheckStatus = 'allowed' | 'denied' | 'conditional' | 'error';

// ── Interfaces ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionPolicy {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PermissionPolicyType;
  description: string;
  status: PermissionPolicyStatus;
  resource: string;
  action: string;
  effect: Effect;
  conditions: string;
  priority: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionRole {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PermissionRoleType;
  description: string;
  status: PermissionRoleStatus;
  permissions: string;
  inherits: string;
  scope: string;
  assignable: boolean;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionGrant {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PermissionGrantType;
  description: string;
  status: PermissionGrantStatus;
  principalId: string;
  principalType: string;
  resourceId: string;
  resourceType: string;
  permissions: string;
  grantedBy: string;
  grantedAt: Date | null;
  expiresAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionCheck {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PermissionCheckType;
  description: string;
  status: PermissionCheckStatus;
  principalId: string;
  principalType: string;
  resourceId: string;
  resourceType: string;
  action: string;
  policyId: string;
  result: string;
  reason: string;
  checkedAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionMetrics {
  activePolicies: number;
  activeRoles: number;
  activeGrants: number;
  allowedChecks: number;
  deniedChecks: number;
}

export interface PermissionStats {
  policyCount: number;
  roleCount: number;
  grantCount: number;
  checkCount: number;
  byPolicyType: Record<string, number>;
  byPolicyStatus: Record<string, number>;
  byRoleType: Record<string, number>;
  byRoleStatus: Record<string, number>;
  byGrantType: Record<string, number>;
  byGrantStatus: Record<string, number>;
  byCheckType: Record<string, number>;
  byCheckStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePermissionPolicyInput {
  name: string;
  type: PermissionPolicyType;
  description?: string;
  status?: PermissionPolicyStatus;
  resource?: string;
  action?: string;
  effect?: Effect;
  conditions?: string;
  priority?: number;
  notes?: string;
}

export interface UpdatePermissionPolicyInput {
  name?: string;
  type?: PermissionPolicyType;
  description?: string;
  status?: PermissionPolicyStatus;
  resource?: string;
  action?: string;
  effect?: Effect;
  conditions?: string;
  priority?: number;
  notes?: string;
}

export interface ListPermissionPoliciesOpts {
  type?: PermissionPolicyType;
  status?: PermissionPolicyStatus;
}

export interface CreatePermissionRoleInput {
  name: string;
  type: PermissionRoleType;
  description?: string;
  status?: PermissionRoleStatus;
  permissions?: string;
  inherits?: string;
  scope?: string;
  assignable?: boolean;
  notes?: string;
}

export interface UpdatePermissionRoleInput {
  name?: string;
  type?: PermissionRoleType;
  description?: string;
  status?: PermissionRoleStatus;
  permissions?: string;
  inherits?: string;
  scope?: string;
  assignable?: boolean;
  notes?: string;
}

export interface ListPermissionRolesOpts {
  type?: PermissionRoleType;
  status?: PermissionRoleStatus;
}

export interface CreatePermissionGrantInput {
  name: string;
  type: PermissionGrantType;
  description?: string;
  status?: PermissionGrantStatus;
  principalId?: string;
  principalType?: string;
  resourceId?: string;
  resourceType?: string;
  permissions?: string;
  grantedBy?: string;
  grantedAt?: string;
  expiresAt?: string;
  notes?: string;
}

export interface UpdatePermissionGrantInput {
  name?: string;
  type?: PermissionGrantType;
  description?: string;
  status?: PermissionGrantStatus;
  principalId?: string;
  principalType?: string;
  resourceId?: string;
  resourceType?: string;
  permissions?: string;
  grantedBy?: string;
  grantedAt?: string;
  expiresAt?: string;
  notes?: string;
}

export interface ListPermissionGrantsOpts {
  type?: PermissionGrantType;
  status?: PermissionGrantStatus;
  principalId?: string;
  resourceId?: string;
}

export interface CreatePermissionCheckInput {
  name: string;
  type: PermissionCheckType;
  description?: string;
  status?: PermissionCheckStatus;
  principalId?: string;
  principalType?: string;
  resourceId?: string;
  resourceType?: string;
  action?: string;
  policyId?: string;
  result?: string;
  reason?: string;
  checkedAt?: string;
  notes?: string;
}

export interface UpdatePermissionCheckInput {
  name?: string;
  type?: PermissionCheckType;
  description?: string;
  status?: PermissionCheckStatus;
  principalId?: string;
  principalType?: string;
  resourceId?: string;
  resourceType?: string;
  action?: string;
  policyId?: string;
  result?: string;
  reason?: string;
  checkedAt?: string;
  notes?: string;
}

export interface ListPermissionChecksOpts {
  type?: PermissionCheckType;
  status?: PermissionCheckStatus;
  principalId?: string;
  policyId?: string;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toPermissionPolicy(row: MemoryRow): PermissionPolicy {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PermissionPolicyType) ?? 'access',
    description: (c.description as string) ?? '',
    status: (c.status as PermissionPolicyStatus) ?? 'draft',
    resource: (c.resource as string) ?? '',
    action: (c.action as string) ?? '',
    effect: (c.effect as Effect) ?? 'allow',
    conditions: (c.conditions as string) ?? '',
    priority: (c.priority as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPermissionRole(row: MemoryRow): PermissionRole {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PermissionRoleType) ?? 'member',
    description: (c.description as string) ?? '',
    status: (c.status as PermissionRoleStatus) ?? 'active',
    permissions: (c.permissions as string) ?? '',
    inherits: (c.inherits as string) ?? '',
    scope: (c.scope as string) ?? '',
    assignable: (c.assignable as boolean) ?? false,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPermissionGrant(row: MemoryRow): PermissionGrant {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PermissionGrantType) ?? 'user',
    description: (c.description as string) ?? '',
    status: (c.status as PermissionGrantStatus) ?? 'pending',
    principalId: (c.principalId as string) ?? '',
    principalType: (c.principalType as string) ?? '',
    resourceId: (c.resourceId as string) ?? '',
    resourceType: (c.resourceType as string) ?? '',
    permissions: (c.permissions as string) ?? '',
    grantedBy: (c.grantedBy as string) ?? '',
    grantedAt: c.grantedAt ? new Date(c.grantedAt as string) : null,
    expiresAt: c.expiresAt ? new Date(c.expiresAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPermissionCheck(row: MemoryRow): PermissionCheck {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PermissionCheckType) ?? 'access',
    description: (c.description as string) ?? '',
    status: (c.status as PermissionCheckStatus) ?? 'allowed',
    principalId: (c.principalId as string) ?? '',
    principalType: (c.principalType as string) ?? '',
    resourceId: (c.resourceId as string) ?? '',
    resourceType: (c.resourceType as string) ?? '',
    action: (c.action as string) ?? '',
    policyId: (c.policyId as string) ?? '',
    result: (c.result as string) ?? '',
    reason: (c.reason as string) ?? '',
    checkedAt: c.checkedAt ? new Date(c.checkedAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const PermissionService = {
  // ── Permission Policies ──

  async createPermissionPolicy(organizationId: string, workspaceId: string, input: CreatePermissionPolicyInput, createdBy: string): Promise<PermissionPolicy> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      resource: input.resource ?? '',
      action: input.action ?? '',
      effect: input.effect ?? 'allow',
      conditions: input.conditions ?? '',
      priority: input.priority ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'permission_policy',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['permission_policy', content.type, content.status]),
        createdBy,
      },
    });
    return toPermissionPolicy(row as MemoryRow);
  },

  async getPermissionPolicy(id: string): Promise<PermissionPolicy | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'permission_policy') return null;
    return toPermissionPolicy(row as MemoryRow);
  },

  async listPermissionPolicies(organizationId: string, opts: ListPermissionPoliciesOpts = {}): Promise<PermissionPolicy[]> {
    const where: Record<string, unknown> = { organizationId, type: 'permission_policy' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPermissionPolicy);
  },

  async updatePermissionPolicy(id: string, input: UpdatePermissionPolicyInput): Promise<PermissionPolicy | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.resource !== undefined && { resource: input.resource }),
      ...(input.action !== undefined && { action: input.action }),
      ...(input.effect !== undefined && { effect: input.effect }),
      ...(input.conditions !== undefined && { conditions: input.conditions }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['permission_policy', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPermissionPolicy(row as MemoryRow);
  },

  async deletePermissionPolicy(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activatePermissionPolicy(id: string, _activatedBy: string): Promise<PermissionPolicy | null> {
    return PermissionService.updatePermissionPolicy(id, { status: 'active' });
  },

  async deprecatePermissionPolicy(id: string, _deprecatedBy: string): Promise<PermissionPolicy | null> {
    return PermissionService.updatePermissionPolicy(id, { status: 'deprecated' });
  },

  async archivePermissionPolicy(id: string, _archivedBy: string): Promise<PermissionPolicy | null> {
    return PermissionService.updatePermissionPolicy(id, { status: 'archived' });
  },

  // ── Permission Roles ──

  async createPermissionRole(organizationId: string, workspaceId: string, input: CreatePermissionRoleInput, createdBy: string): Promise<PermissionRole> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      permissions: input.permissions ?? '',
      inherits: input.inherits ?? '',
      scope: input.scope ?? '',
      assignable: input.assignable ?? false,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'permission_role',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['permission_role', content.type, content.status]),
        createdBy,
      },
    });
    return toPermissionRole(row as MemoryRow);
  },

  async getPermissionRole(id: string): Promise<PermissionRole | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'permission_role') return null;
    return toPermissionRole(row as MemoryRow);
  },

  async listPermissionRoles(organizationId: string, opts: ListPermissionRolesOpts = {}): Promise<PermissionRole[]> {
    const where: Record<string, unknown> = { organizationId, type: 'permission_role' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPermissionRole);
  },

  async updatePermissionRole(id: string, input: UpdatePermissionRoleInput): Promise<PermissionRole | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.permissions !== undefined && { permissions: input.permissions }),
      ...(input.inherits !== undefined && { inherits: input.inherits }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.assignable !== undefined && { assignable: input.assignable }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['permission_role', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPermissionRole(row as MemoryRow);
  },

  async deletePermissionRole(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activatePermissionRole(id: string, _activatedBy: string): Promise<PermissionRole | null> {
    return PermissionService.updatePermissionRole(id, { status: 'active' });
  },

  async deactivatePermissionRole(id: string, _deactivatedBy: string): Promise<PermissionRole | null> {
    return PermissionService.updatePermissionRole(id, { status: 'inactive' });
  },

  async deprecatePermissionRole(id: string, _deprecatedBy: string): Promise<PermissionRole | null> {
    return PermissionService.updatePermissionRole(id, { status: 'deprecated' });
  },

  // ── Permission Grants ──

  async createPermissionGrant(organizationId: string, workspaceId: string, input: CreatePermissionGrantInput, createdBy: string): Promise<PermissionGrant> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      principalId: input.principalId ?? '',
      principalType: input.principalType ?? '',
      resourceId: input.resourceId ?? '',
      resourceType: input.resourceType ?? '',
      permissions: input.permissions ?? '',
      grantedBy: input.grantedBy ?? '',
      grantedAt: input.grantedAt ?? null,
      expiresAt: input.expiresAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'permission_grant',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.principalId ?? input.resourceId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['permission_grant', content.type, content.status]),
        createdBy,
      },
    });
    return toPermissionGrant(row as MemoryRow);
  },

  async getPermissionGrant(id: string): Promise<PermissionGrant | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'permission_grant') return null;
    return toPermissionGrant(row as MemoryRow);
  },

  async listPermissionGrants(organizationId: string, opts: ListPermissionGrantsOpts = {}): Promise<PermissionGrant[]> {
    const where: Record<string, unknown> = { organizationId, type: 'permission_grant' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.principalId) conditions.push({ content: { contains: `"principalId":"${opts.principalId}"` } });
    if (opts.resourceId) conditions.push({ content: { contains: `"resourceId":"${opts.resourceId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPermissionGrant);
  },

  async updatePermissionGrant(id: string, input: UpdatePermissionGrantInput): Promise<PermissionGrant | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.principalId !== undefined && { principalId: input.principalId }),
      ...(input.principalType !== undefined && { principalType: input.principalType }),
      ...(input.resourceId !== undefined && { resourceId: input.resourceId }),
      ...(input.resourceType !== undefined && { resourceType: input.resourceType }),
      ...(input.permissions !== undefined && { permissions: input.permissions }),
      ...(input.grantedBy !== undefined && { grantedBy: input.grantedBy }),
      ...(input.grantedAt !== undefined && { grantedAt: input.grantedAt }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['permission_grant', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPermissionGrant(row as MemoryRow);
  },

  async deletePermissionGrant(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async grantPermission(id: string, _grantedBy: string): Promise<PermissionGrant | null> {
    return PermissionService.updatePermissionGrant(id, { status: 'active', grantedAt: new Date().toISOString() });
  },

  async revokePermission(id: string, _revokedBy: string): Promise<PermissionGrant | null> {
    return PermissionService.updatePermissionGrant(id, { status: 'revoked' });
  },

  async expirePermission(id: string, _expiredBy: string): Promise<PermissionGrant | null> {
    return PermissionService.updatePermissionGrant(id, { status: 'expired' });
  },

  async pendingPermission(id: string, _pendingBy: string): Promise<PermissionGrant | null> {
    return PermissionService.updatePermissionGrant(id, { status: 'pending' });
  },

  // ── Permission Checks ──

  async createPermissionCheck(organizationId: string, workspaceId: string, input: CreatePermissionCheckInput, createdBy: string): Promise<PermissionCheck> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'allowed',
      principalId: input.principalId ?? '',
      principalType: input.principalType ?? '',
      resourceId: input.resourceId ?? '',
      resourceType: input.resourceType ?? '',
      action: input.action ?? '',
      policyId: input.policyId ?? '',
      result: input.result ?? '',
      reason: input.reason ?? '',
      checkedAt: input.checkedAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'permission_check',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.principalId ?? input.policyId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['permission_check', content.type, content.status]),
        createdBy,
      },
    });
    return toPermissionCheck(row as MemoryRow);
  },

  async getPermissionCheck(id: string): Promise<PermissionCheck | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'permission_check') return null;
    return toPermissionCheck(row as MemoryRow);
  },

  async listPermissionChecks(organizationId: string, opts: ListPermissionChecksOpts = {}): Promise<PermissionCheck[]> {
    const where: Record<string, unknown> = { organizationId, type: 'permission_check' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.principalId) conditions.push({ content: { contains: `"principalId":"${opts.principalId}"` } });
    if (opts.policyId) conditions.push({ content: { contains: `"policyId":"${opts.policyId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPermissionCheck);
  },

  async updatePermissionCheck(id: string, input: UpdatePermissionCheckInput): Promise<PermissionCheck | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.principalId !== undefined && { principalId: input.principalId }),
      ...(input.principalType !== undefined && { principalType: input.principalType }),
      ...(input.resourceId !== undefined && { resourceId: input.resourceId }),
      ...(input.resourceType !== undefined && { resourceType: input.resourceType }),
      ...(input.action !== undefined && { action: input.action }),
      ...(input.policyId !== undefined && { policyId: input.policyId }),
      ...(input.result !== undefined && { result: input.result }),
      ...(input.reason !== undefined && { reason: input.reason }),
      ...(input.checkedAt !== undefined && { checkedAt: input.checkedAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['permission_check', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPermissionCheck(row as MemoryRow);
  },

  async deletePermissionCheck(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async allowCheck(id: string, _allowedBy: string): Promise<PermissionCheck | null> {
    return PermissionService.updatePermissionCheck(id, { status: 'allowed', checkedAt: new Date().toISOString() });
  },

  async denyCheck(id: string, _deniedBy: string): Promise<PermissionCheck | null> {
    return PermissionService.updatePermissionCheck(id, { status: 'denied', checkedAt: new Date().toISOString() });
  },

  async conditionalCheck(id: string, _conditionalBy: string): Promise<PermissionCheck | null> {
    return PermissionService.updatePermissionCheck(id, { status: 'conditional', checkedAt: new Date().toISOString() });
  },

  async errorCheck(id: string, _erroredBy: string): Promise<PermissionCheck | null> {
    return PermissionService.updatePermissionCheck(id, { status: 'error', checkedAt: new Date().toISOString() });
  },

  // ── Metrics & Stats ──

  async getPermissionMetrics(organizationId: string): Promise<PermissionMetrics> {
    const [policies, roles, grants, checks] = await Promise.all([
      PermissionService.listPermissionPolicies(organizationId),
      PermissionService.listPermissionRoles(organizationId),
      PermissionService.listPermissionGrants(organizationId),
      PermissionService.listPermissionChecks(organizationId),
    ]);
    return {
      activePolicies: policies.filter((p) => p.status === 'active').length,
      activeRoles: roles.filter((r) => r.status === 'active').length,
      activeGrants: grants.filter((g) => g.status === 'active').length,
      allowedChecks: checks.filter((c) => c.status === 'allowed').length,
      deniedChecks: checks.filter((c) => c.status === 'denied').length,
    };
  },

  async getPermissionStats(organizationId: string): Promise<PermissionStats> {
    const [policies, roles, grants, checks] = await Promise.all([
      PermissionService.listPermissionPolicies(organizationId),
      PermissionService.listPermissionRoles(organizationId),
      PermissionService.listPermissionGrants(organizationId),
      PermissionService.listPermissionChecks(organizationId),
    ]);
    const byPolicyType: Record<string, number> = {};
    const byPolicyStatus: Record<string, number> = {};
    const byRoleType: Record<string, number> = {};
    const byRoleStatus: Record<string, number> = {};
    const byGrantType: Record<string, number> = {};
    const byGrantStatus: Record<string, number> = {};
    const byCheckType: Record<string, number> = {};
    const byCheckStatus: Record<string, number> = {};
    for (const p of policies) { byPolicyType[p.type] = (byPolicyType[p.type] ?? 0) + 1; byPolicyStatus[p.status] = (byPolicyStatus[p.status] ?? 0) + 1; }
    for (const r of roles) { byRoleType[r.type] = (byRoleType[r.type] ?? 0) + 1; byRoleStatus[r.status] = (byRoleStatus[r.status] ?? 0) + 1; }
    for (const g of grants) { byGrantType[g.type] = (byGrantType[g.type] ?? 0) + 1; byGrantStatus[g.status] = (byGrantStatus[g.status] ?? 0) + 1; }
    for (const c of checks) { byCheckType[c.type] = (byCheckType[c.type] ?? 0) + 1; byCheckStatus[c.status] = (byCheckStatus[c.status] ?? 0) + 1; }
    return {
      policyCount: policies.length,
      roleCount: roles.length,
      grantCount: grants.length,
      checkCount: checks.length,
      byPolicyType, byPolicyStatus, byRoleType, byRoleStatus, byGrantType, byGrantStatus, byCheckType, byCheckStatus,
    };
  },
};
