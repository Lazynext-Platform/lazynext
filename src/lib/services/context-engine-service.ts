import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ContextSnapshotType = 'agent' | 'task' | 'project' | 'goal' | 'plan' | 'meeting' | 'decision' | 'research' | 'incident' | 'operation';
export type ContextSnapshotStatus = 'active' | 'archived' | 'expired' | 'referenced';
export type ContextSourceType = 'memory' | 'document' | 'knowledge' | 'conversation' | 'task' | 'project' | 'goal' | 'plan' | 'metric' | 'event' | 'external' | 'file' | 'research';
export type ContextSourceStatus = 'active' | 'inactive' | 'deprecated' | 'error';
export type ContextRetrievalType = 'semantic' | 'keyword' | 'graph' | 'hybrid' | 'temporal' | 'priority' | 'manual';
export type ContextRetrievalStatus = 'completed' | 'failed' | 'partial' | 'timeout';
export type ContextAssemblyType = 'agent_prompt' | 'task_context' | 'decision_brief' | 'research_context' | 'meeting_brief' | 'incident_context' | 'plan_context' | 'goal_context';
export type ContextAssemblyStatus = 'draft' | 'assembled' | 'delivered' | 'archived';

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

export interface ContextSnapshot {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ContextSnapshotType;
  description: string;
  status: ContextSnapshotStatus;
  agentId: string;
  taskId: string;
  scope: string;
  relevanceScore: number;
  tokens: number;
  expiresAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextSource {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ContextSourceType;
  description: string;
  status: ContextSourceStatus;
  sourceId: string;
  sourceType: string;
  priority: number;
  weight: number;
  lastSynced: Date | null;
  reliability: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextRetrieval {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ContextRetrievalType;
  description: string;
  status: ContextRetrievalStatus;
  query: string;
  sources: string;
  results: string;
  tokens: number;
  latency: number;
  score: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextAssembly {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ContextAssemblyType;
  description: string;
  status: ContextAssemblyStatus;
  agentId: string;
  taskId: string;
  snapshotId: string;
  sources: string;
  tokens: number;
  priority: number;
  assembledAt: Date | null;
  deliveredAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextEngineMetrics {
  activeSnapshots: number;
  activeSources: number;
  completedRetrievals: number;
  deliveredAssemblies: number;
  totalTokens: number;
}

export interface ContextEngineStats {
  snapshotCount: number;
  sourceCount: number;
  retrievalCount: number;
  assemblyCount: number;
  bySnapshotType: Record<string, number>;
  bySnapshotStatus: Record<string, number>;
  bySourceType: Record<string, number>;
  bySourceStatus: Record<string, number>;
  byRetrievalType: Record<string, number>;
  byRetrievalStatus: Record<string, number>;
  byAssemblyType: Record<string, number>;
  byAssemblyStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateContextSnapshotInput {
  name: string;
  type: ContextSnapshotType;
  description?: string;
  status?: ContextSnapshotStatus;
  agentId?: string;
  taskId?: string;
  scope?: string;
  relevanceScore?: number;
  tokens?: number;
  expiresAt?: string;
  notes?: string;
}

export interface UpdateContextSnapshotInput {
  name?: string;
  type?: ContextSnapshotType;
  description?: string;
  status?: ContextSnapshotStatus;
  agentId?: string;
  taskId?: string;
  scope?: string;
  relevanceScore?: number;
  tokens?: number;
  expiresAt?: string;
  notes?: string;
}

export interface ListContextSnapshotsOpts {
  type?: ContextSnapshotType;
  status?: ContextSnapshotStatus;
}

export interface CreateContextSourceInput {
  name: string;
  type: ContextSourceType;
  description?: string;
  status?: ContextSourceStatus;
  sourceId?: string;
  sourceType?: string;
  priority?: number;
  weight?: number;
  lastSynced?: string;
  reliability?: number;
  notes?: string;
}

export interface UpdateContextSourceInput {
  name?: string;
  type?: ContextSourceType;
  description?: string;
  status?: ContextSourceStatus;
  sourceId?: string;
  sourceType?: string;
  priority?: number;
  weight?: number;
  lastSynced?: string;
  reliability?: number;
  notes?: string;
}

export interface ListContextSourcesOpts {
  type?: ContextSourceType;
  status?: ContextSourceStatus;
}

export interface CreateContextRetrievalInput {
  name: string;
  type: ContextRetrievalType;
  description?: string;
  status?: ContextRetrievalStatus;
  query?: string;
  sources?: string;
  results?: string;
  tokens?: number;
  latency?: number;
  score?: number;
  notes?: string;
}

export interface UpdateContextRetrievalInput {
  name?: string;
  type?: ContextRetrievalType;
  description?: string;
  status?: ContextRetrievalStatus;
  query?: string;
  sources?: string;
  results?: string;
  tokens?: number;
  latency?: number;
  score?: number;
  notes?: string;
}

export interface ListContextRetrievalsOpts {
  type?: ContextRetrievalType;
  status?: ContextRetrievalStatus;
}

export interface CreateContextAssemblyInput {
  name: string;
  type: ContextAssemblyType;
  description?: string;
  status?: ContextAssemblyStatus;
  agentId?: string;
  taskId?: string;
  snapshotId?: string;
  sources?: string;
  tokens?: number;
  priority?: number;
  assembledAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface UpdateContextAssemblyInput {
  name?: string;
  type?: ContextAssemblyType;
  description?: string;
  status?: ContextAssemblyStatus;
  agentId?: string;
  taskId?: string;
  snapshotId?: string;
  sources?: string;
  tokens?: number;
  priority?: number;
  assembledAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface ListContextAssembliesOpts {
  type?: ContextAssemblyType;
  status?: ContextAssemblyStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toContextSnapshot(row: MemoryRow): ContextSnapshot {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ContextSnapshotType) ?? 'agent',
    description: (c.description as string) ?? '',
    status: (c.status as ContextSnapshotStatus) ?? 'active',
    agentId: (c.agentId as string) ?? '',
    taskId: (c.taskId as string) ?? '',
    scope: (c.scope as string) ?? '',
    relevanceScore: (c.relevanceScore as number) ?? 0,
    tokens: (c.tokens as number) ?? 0,
    expiresAt: c.expiresAt ? new Date(c.expiresAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toContextSource(row: MemoryRow): ContextSource {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ContextSourceType) ?? 'memory',
    description: (c.description as string) ?? '',
    status: (c.status as ContextSourceStatus) ?? 'active',
    sourceId: (c.sourceId as string) ?? '',
    sourceType: (c.sourceType as string) ?? '',
    priority: (c.priority as number) ?? 0,
    weight: (c.weight as number) ?? 0,
    lastSynced: c.lastSynced ? new Date(c.lastSynced as string) : null,
    reliability: (c.reliability as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toContextRetrieval(row: MemoryRow): ContextRetrieval {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ContextRetrievalType) ?? 'semantic',
    description: (c.description as string) ?? '',
    status: (c.status as ContextRetrievalStatus) ?? 'completed',
    query: (c.query as string) ?? '',
    sources: (c.sources as string) ?? '',
    results: (c.results as string) ?? '',
    tokens: (c.tokens as number) ?? 0,
    latency: (c.latency as number) ?? 0,
    score: (c.score as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toContextAssembly(row: MemoryRow): ContextAssembly {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ContextAssemblyType) ?? 'agent_prompt',
    description: (c.description as string) ?? '',
    status: (c.status as ContextAssemblyStatus) ?? 'draft',
    agentId: (c.agentId as string) ?? '',
    taskId: (c.taskId as string) ?? '',
    snapshotId: (c.snapshotId as string) ?? '',
    sources: (c.sources as string) ?? '',
    tokens: (c.tokens as number) ?? 0,
    priority: (c.priority as number) ?? 0,
    assembledAt: c.assembledAt ? new Date(c.assembledAt as string) : null,
    deliveredAt: c.deliveredAt ? new Date(c.deliveredAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const ContextEngineService = {
  // ── Context Snapshots ──

  async createContextSnapshot(organizationId: string, workspaceId: string, input: CreateContextSnapshotInput, createdBy: string): Promise<ContextSnapshot> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      agentId: input.agentId ?? '',
      taskId: input.taskId ?? '',
      scope: input.scope ?? '',
      relevanceScore: input.relevanceScore ?? 0,
      tokens: input.tokens ?? 0,
      expiresAt: input.expiresAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'context_snapshot',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['context_snapshot', content.type, content.status]),
        createdBy,
      },
    });
    return toContextSnapshot(row as MemoryRow);
  },

  async getContextSnapshot(id: string): Promise<ContextSnapshot | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'context_snapshot') return null;
    return toContextSnapshot(row as MemoryRow);
  },

  async listContextSnapshots(organizationId: string, opts: ListContextSnapshotsOpts = {}): Promise<ContextSnapshot[]> {
    const where: Record<string, unknown> = { organizationId, type: 'context_snapshot' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContextSnapshot);
  },

  async updateContextSnapshot(id: string, input: UpdateContextSnapshotInput): Promise<ContextSnapshot | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.agentId !== undefined && { agentId: input.agentId }),
      ...(input.taskId !== undefined && { taskId: input.taskId }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.relevanceScore !== undefined && { relevanceScore: input.relevanceScore }),
      ...(input.tokens !== undefined && { tokens: input.tokens }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['context_snapshot', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toContextSnapshot(row as MemoryRow);
  },

  async deleteContextSnapshot(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateContextSnapshot(id: string, _activatedBy: string): Promise<ContextSnapshot | null> {
    return ContextEngineService.updateContextSnapshot(id, { status: 'active' });
  },

  async archiveContextSnapshot(id: string, _archivedBy: string): Promise<ContextSnapshot | null> {
    return ContextEngineService.updateContextSnapshot(id, { status: 'archived' });
  },

  async expireContextSnapshot(id: string, _expiredBy: string): Promise<ContextSnapshot | null> {
    return ContextEngineService.updateContextSnapshot(id, { status: 'expired', expiresAt: new Date().toISOString() });
  },

  async referenceContextSnapshot(id: string, _referencedBy: string): Promise<ContextSnapshot | null> {
    return ContextEngineService.updateContextSnapshot(id, { status: 'referenced' });
  },

  // ── Context Sources ──

  async createContextSource(organizationId: string, workspaceId: string, input: CreateContextSourceInput, createdBy: string): Promise<ContextSource> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      sourceId: input.sourceId ?? '',
      sourceType: input.sourceType ?? '',
      priority: input.priority ?? 0,
      weight: input.weight ?? 0,
      lastSynced: input.lastSynced ?? null,
      reliability: input.reliability ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'context_source',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['context_source', content.type, content.status]),
        createdBy,
      },
    });
    return toContextSource(row as MemoryRow);
  },

  async getContextSource(id: string): Promise<ContextSource | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'context_source') return null;
    return toContextSource(row as MemoryRow);
  },

  async listContextSources(organizationId: string, opts: ListContextSourcesOpts = {}): Promise<ContextSource[]> {
    const where: Record<string, unknown> = { organizationId, type: 'context_source' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContextSource);
  },

  async updateContextSource(id: string, input: UpdateContextSourceInput): Promise<ContextSource | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.sourceId !== undefined && { sourceId: input.sourceId }),
      ...(input.sourceType !== undefined && { sourceType: input.sourceType }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.weight !== undefined && { weight: input.weight }),
      ...(input.lastSynced !== undefined && { lastSynced: input.lastSynced }),
      ...(input.reliability !== undefined && { reliability: input.reliability }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['context_source', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toContextSource(row as MemoryRow);
  },

  async deleteContextSource(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateContextSource(id: string, _activatedBy: string): Promise<ContextSource | null> {
    return ContextEngineService.updateContextSource(id, { status: 'active' });
  },

  async deactivateContextSource(id: string, _deactivatedBy: string): Promise<ContextSource | null> {
    return ContextEngineService.updateContextSource(id, { status: 'inactive' });
  },

  async deprecateContextSource(id: string, _deprecatedBy: string): Promise<ContextSource | null> {
    return ContextEngineService.updateContextSource(id, { status: 'deprecated' });
  },

  async errorContextSource(id: string, _erroredBy: string): Promise<ContextSource | null> {
    return ContextEngineService.updateContextSource(id, { status: 'error' });
  },

  // ── Context Retrievals ──

  async createContextRetrieval(organizationId: string, workspaceId: string, input: CreateContextRetrievalInput, createdBy: string): Promise<ContextRetrieval> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'completed',
      query: input.query ?? '',
      sources: input.sources ?? '',
      results: input.results ?? '',
      tokens: input.tokens ?? 0,
      latency: input.latency ?? 0,
      score: input.score ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'context_retrieval',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['context_retrieval', content.type, content.status]),
        createdBy,
      },
    });
    return toContextRetrieval(row as MemoryRow);
  },

  async getContextRetrieval(id: string): Promise<ContextRetrieval | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'context_retrieval') return null;
    return toContextRetrieval(row as MemoryRow);
  },

  async listContextRetrievals(organizationId: string, opts: ListContextRetrievalsOpts = {}): Promise<ContextRetrieval[]> {
    const where: Record<string, unknown> = { organizationId, type: 'context_retrieval' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContextRetrieval);
  },

  async updateContextRetrieval(id: string, input: UpdateContextRetrievalInput): Promise<ContextRetrieval | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.query !== undefined && { query: input.query }),
      ...(input.sources !== undefined && { sources: input.sources }),
      ...(input.results !== undefined && { results: input.results }),
      ...(input.tokens !== undefined && { tokens: input.tokens }),
      ...(input.latency !== undefined && { latency: input.latency }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['context_retrieval', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toContextRetrieval(row as MemoryRow);
  },

  async deleteContextRetrieval(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async completeRetrieval(id: string, _completedBy: string): Promise<ContextRetrieval | null> {
    return ContextEngineService.updateContextRetrieval(id, { status: 'completed' });
  },

  async failRetrieval(id: string, _failedBy: string): Promise<ContextRetrieval | null> {
    return ContextEngineService.updateContextRetrieval(id, { status: 'failed' });
  },

  async partialRetrieval(id: string, _partialBy: string): Promise<ContextRetrieval | null> {
    return ContextEngineService.updateContextRetrieval(id, { status: 'partial' });
  },

  async timeoutRetrieval(id: string, _timedOutBy: string): Promise<ContextRetrieval | null> {
    return ContextEngineService.updateContextRetrieval(id, { status: 'timeout' });
  },

  // ── Context Assemblies ──

  async createContextAssembly(organizationId: string, workspaceId: string, input: CreateContextAssemblyInput, createdBy: string): Promise<ContextAssembly> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      agentId: input.agentId ?? '',
      taskId: input.taskId ?? '',
      snapshotId: input.snapshotId ?? '',
      sources: input.sources ?? '',
      tokens: input.tokens ?? 0,
      priority: input.priority ?? 0,
      assembledAt: input.assembledAt ?? null,
      deliveredAt: input.deliveredAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'context_assembly',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['context_assembly', content.type, content.status]),
        createdBy,
      },
    });
    return toContextAssembly(row as MemoryRow);
  },

  async getContextAssembly(id: string): Promise<ContextAssembly | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'context_assembly') return null;
    return toContextAssembly(row as MemoryRow);
  },

  async listContextAssemblies(organizationId: string, opts: ListContextAssembliesOpts = {}): Promise<ContextAssembly[]> {
    const where: Record<string, unknown> = { organizationId, type: 'context_assembly' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContextAssembly);
  },

  async updateContextAssembly(id: string, input: UpdateContextAssemblyInput): Promise<ContextAssembly | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.agentId !== undefined && { agentId: input.agentId }),
      ...(input.taskId !== undefined && { taskId: input.taskId }),
      ...(input.snapshotId !== undefined && { snapshotId: input.snapshotId }),
      ...(input.sources !== undefined && { sources: input.sources }),
      ...(input.tokens !== undefined && { tokens: input.tokens }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.assembledAt !== undefined && { assembledAt: input.assembledAt }),
      ...(input.deliveredAt !== undefined && { deliveredAt: input.deliveredAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['context_assembly', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toContextAssembly(row as MemoryRow);
  },

  async deleteContextAssembly(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async assembleContext(id: string, _assembledBy: string): Promise<ContextAssembly | null> {
    return ContextEngineService.updateContextAssembly(id, { status: 'assembled', assembledAt: new Date().toISOString() });
  },

  async deliverContext(id: string, _deliveredBy: string): Promise<ContextAssembly | null> {
    return ContextEngineService.updateContextAssembly(id, { status: 'delivered', deliveredAt: new Date().toISOString() });
  },

  async archiveAssembly(id: string, _archivedBy: string): Promise<ContextAssembly | null> {
    return ContextEngineService.updateContextAssembly(id, { status: 'archived' });
  },

  async draftAssembly(id: string, _draftedBy: string): Promise<ContextAssembly | null> {
    return ContextEngineService.updateContextAssembly(id, { status: 'draft' });
  },

  // ── Metrics & Stats ──

  async getContextEngineMetrics(organizationId: string): Promise<ContextEngineMetrics> {
    const [snapshots, sources, retrievals, assemblies] = await Promise.all([
      ContextEngineService.listContextSnapshots(organizationId),
      ContextEngineService.listContextSources(organizationId),
      ContextEngineService.listContextRetrievals(organizationId),
      ContextEngineService.listContextAssemblies(organizationId),
    ]);
    return {
      activeSnapshots: snapshots.filter((s) => s.status === 'active').length,
      activeSources: sources.filter((s) => s.status === 'active').length,
      completedRetrievals: retrievals.filter((r) => r.status === 'completed').length,
      deliveredAssemblies: assemblies.filter((a) => a.status === 'delivered').length,
      totalTokens: snapshots.reduce((sum, s) => sum + (s.tokens ?? 0), 0) +
        retrievals.reduce((sum, r) => sum + (r.tokens ?? 0), 0) +
        assemblies.reduce((sum, a) => sum + (a.tokens ?? 0), 0),
    };
  },

  async getContextEngineStats(organizationId: string): Promise<ContextEngineStats> {
    const [snapshots, sources, retrievals, assemblies] = await Promise.all([
      ContextEngineService.listContextSnapshots(organizationId),
      ContextEngineService.listContextSources(organizationId),
      ContextEngineService.listContextRetrievals(organizationId),
      ContextEngineService.listContextAssemblies(organizationId),
    ]);
    const bySnapshotType: Record<string, number> = {};
    const bySnapshotStatus: Record<string, number> = {};
    const bySourceType: Record<string, number> = {};
    const bySourceStatus: Record<string, number> = {};
    const byRetrievalType: Record<string, number> = {};
    const byRetrievalStatus: Record<string, number> = {};
    const byAssemblyType: Record<string, number> = {};
    const byAssemblyStatus: Record<string, number> = {};
    for (const s of snapshots) { bySnapshotType[s.type] = (bySnapshotType[s.type] ?? 0) + 1; bySnapshotStatus[s.status] = (bySnapshotStatus[s.status] ?? 0) + 1; }
    for (const s of sources) { bySourceType[s.type] = (bySourceType[s.type] ?? 0) + 1; bySourceStatus[s.status] = (bySourceStatus[s.status] ?? 0) + 1; }
    for (const r of retrievals) { byRetrievalType[r.type] = (byRetrievalType[r.type] ?? 0) + 1; byRetrievalStatus[r.status] = (byRetrievalStatus[r.status] ?? 0) + 1; }
    for (const a of assemblies) { byAssemblyType[a.type] = (byAssemblyType[a.type] ?? 0) + 1; byAssemblyStatus[a.status] = (byAssemblyStatus[a.status] ?? 0) + 1; }
    return {
      snapshotCount: snapshots.length,
      sourceCount: sources.length,
      retrievalCount: retrievals.length,
      assemblyCount: assemblies.length,
      bySnapshotType, bySnapshotStatus, bySourceType, bySourceStatus, byRetrievalType, byRetrievalStatus, byAssemblyType, byAssemblyStatus,
    };
  },
};
