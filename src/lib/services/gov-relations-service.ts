import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ContactType = 'legislator' | 'regulator' | 'agency_official' | 'staff' | 'lobbyist' | 'consultant' | 'association' | 'other';
export type ContactLevel = 'federal' | 'state' | 'local' | 'international' | 'eu' | 'other';
export type PolicyStatus = 'monitoring' | 'supporting' | 'opposing' | 'neutral' | 'amending';
export type PolicyType = 'bill' | 'regulation' | 'directive' | 'executive_order' | 'treaty' | 'guidance' | 'proposed_rule';
export type LobbyingStatus = 'planned' | 'registered' | 'active' | 'completed' | 'cancelled';
export type GovComplianceType = 'lobbying_report' | 'gift_report' | 'disclosure' | 'registration' | 'ethics_filing' | 'other';
export type GovComplianceStatus = 'pending' | 'filed' | 'approved' | 'rejected' | 'overdue';

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

export interface GovContact {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  contactType: ContactType;
  level: ContactLevel;
  title: string;
  organization: string;
  email: string;
  phone: string;
  jurisdiction: string;
  relationshipStatus: string;
  lastContactDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyMonitor {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  policyType: PolicyType;
  status: PolicyStatus;
  jurisdiction: string;
  billNumber: string;
  sponsor: string;
  summary: string;
  impactAssessment: string;
  position: string;
  introducedDate: Date | null;
  lastActionDate: Date | null;
  nextActionDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LobbyingActivity {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  status: LobbyingStatus;
  contactIds: string[];
  policyId: string | null;
  registrationId: string;
  registeredBy: string;
  registeredAt: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  spent: number;
  completedBy: string;
  completedAt: Date | null;
  cancelledBy: string;
  cancelledAt: Date | null;
  cancelReason: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GovCompliance {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  complianceType: GovComplianceType;
  status: GovComplianceStatus;
  filingId: string;
  filedBy: string;
  filedAt: Date | null;
  approvedBy: string;
  approvedAt: Date | null;
  dueDate: Date | null;
  period: string;
  amount: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GovRelationsMetrics {
  activePolicies: number;
  registeredLobbying: number;
  pendingCompliance: number;
  totalContacts: number;
  overdueCompliance: number;
}

export interface GovRelationsStats {
  contactCount: number;
  policyCount: number;
  lobbyingCount: number;
  complianceCount: number;
  byContactType: Record<string, number>;
  byContactLevel: Record<string, number>;
  byPolicyStatus: Record<string, number>;
  byLobbyingStatus: Record<string, number>;
  byComplianceStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateContactInput {
  name: string;
  contactType: ContactType;
  level: ContactLevel;
  title?: string;
  organization?: string;
  email?: string;
  phone?: string;
  jurisdiction?: string;
  relationshipStatus?: string;
  lastContactDate?: string;
  notes?: string;
}

export interface UpdateContactInput {
  name?: string;
  contactType?: ContactType;
  level?: ContactLevel;
  title?: string;
  organization?: string;
  email?: string;
  phone?: string;
  jurisdiction?: string;
  relationshipStatus?: string;
  lastContactDate?: string;
  notes?: string;
}

export interface ListContactsOpts {
  contactType?: ContactType;
  level?: ContactLevel;
  relationshipStatus?: string;
}

export interface CreatePolicyInput {
  title: string;
  policyType: PolicyType;
  status?: PolicyStatus;
  jurisdiction?: string;
  billNumber?: string;
  sponsor?: string;
  summary?: string;
  impactAssessment?: string;
  position?: string;
  introducedDate?: string;
  lastActionDate?: string;
  nextActionDate?: string;
  notes?: string;
}

export interface UpdatePolicyInput {
  title?: string;
  policyType?: PolicyType;
  status?: PolicyStatus;
  jurisdiction?: string;
  billNumber?: string;
  sponsor?: string;
  summary?: string;
  impactAssessment?: string;
  position?: string;
  introducedDate?: string;
  lastActionDate?: string;
  nextActionDate?: string;
  notes?: string;
}

export interface ListPoliciesOpts {
  policyType?: PolicyType;
  status?: PolicyStatus;
  jurisdiction?: string;
}

export interface CreateLobbyingInput {
  title: string;
  description?: string;
  status?: LobbyingStatus;
  contactIds?: string[];
  policyId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  spent?: number;
  notes?: string;
}

export interface UpdateLobbyingInput {
  title?: string;
  description?: string;
  status?: LobbyingStatus;
  contactIds?: string[];
  policyId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  spent?: number;
  notes?: string;
}

export interface ListLobbyingOpts {
  status?: LobbyingStatus;
  policyId?: string;
}

export interface CreateComplianceInput {
  title: string;
  complianceType: GovComplianceType;
  status?: GovComplianceStatus;
  dueDate?: string;
  period?: string;
  amount?: number;
  notes?: string;
}

export interface UpdateComplianceInput {
  title?: string;
  complianceType?: GovComplianceType;
  status?: GovComplianceStatus;
  dueDate?: string;
  period?: string;
  amount?: number;
  notes?: string;
}

export interface ListComplianceOpts {
  complianceType?: GovComplianceType;
  status?: GovComplianceStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toContact(row: MemoryRow): GovContact {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    contactType: (c.contactType as ContactType) ?? 'other',
    level: (c.level as ContactLevel) ?? 'federal',
    title: (c.title as string) ?? '',
    organization: (c.organization as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    jurisdiction: (c.jurisdiction as string) ?? '',
    relationshipStatus: (c.relationshipStatus as string) ?? 'active',
    lastContactDate: c.lastContactDate ? new Date(c.lastContactDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPolicy(row: MemoryRow): PolicyMonitor {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    policyType: (c.policyType as PolicyType) ?? 'bill',
    status: (c.status as PolicyStatus) ?? 'monitoring',
    jurisdiction: (c.jurisdiction as string) ?? '',
    billNumber: (c.billNumber as string) ?? '',
    sponsor: (c.sponsor as string) ?? '',
    summary: (c.summary as string) ?? '',
    impactAssessment: (c.impactAssessment as string) ?? '',
    position: (c.position as string) ?? '',
    introducedDate: c.introducedDate ? new Date(c.introducedDate as string) : null,
    lastActionDate: c.lastActionDate ? new Date(c.lastActionDate as string) : null,
    nextActionDate: c.nextActionDate ? new Date(c.nextActionDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLobbying(row: MemoryRow): LobbyingActivity {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    status: (c.status as LobbyingStatus) ?? 'planned',
    contactIds: (c.contactIds as string[]) ?? [],
    policyId: (c.policyId as string) ?? null,
    registrationId: (c.registrationId as string) ?? '',
    registeredBy: (c.registeredBy as string) ?? '',
    registeredAt: c.registeredAt ? new Date(c.registeredAt as string) : null,
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    budget: (c.budget as number) ?? 0,
    spent: (c.spent as number) ?? 0,
    completedBy: (c.completedBy as string) ?? '',
    completedAt: c.completedAt ? new Date(c.completedAt as string) : null,
    cancelledBy: (c.cancelledBy as string) ?? '',
    cancelledAt: c.cancelledAt ? new Date(c.cancelledAt as string) : null,
    cancelReason: (c.cancelReason as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCompliance(row: MemoryRow): GovCompliance {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    complianceType: (c.complianceType as GovComplianceType) ?? 'other',
    status: (c.status as GovComplianceStatus) ?? 'pending',
    filingId: (c.filingId as string) ?? '',
    filedBy: (c.filedBy as string) ?? '',
    filedAt: c.filedAt ? new Date(c.filedAt as string) : null,
    approvedBy: (c.approvedBy as string) ?? '',
    approvedAt: c.approvedAt ? new Date(c.approvedAt as string) : null,
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    period: (c.period as string) ?? '',
    amount: (c.amount as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const GovRelationsService = {
  // ── Contacts ──

  async createContact(organizationId: string, workspaceId: string, input: CreateContactInput, createdBy: string): Promise<GovContact> {
    const content = {
      name: input.name.trim(),
      contactType: input.contactType,
      level: input.level,
      title: input.title ?? '',
      organization: input.organization ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      jurisdiction: input.jurisdiction ?? '',
      relationshipStatus: input.relationshipStatus ?? 'active',
      lastContactDate: input.lastContactDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'gov_contact',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['gov_contact', content.contactType, content.level, content.relationshipStatus]),
        createdBy,
      },
    });
    return toContact(row as MemoryRow);
  },

  async getContact(id: string): Promise<GovContact | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'gov_contact') return null;
    return toContact(row as MemoryRow);
  },

  async listContacts(organizationId: string, opts: ListContactsOpts = {}): Promise<GovContact[]> {
    const where: Record<string, unknown> = { organizationId, type: 'gov_contact' };
    const conditions: unknown[] = [];
    if (opts.contactType) conditions.push({ content: { contains: `"contactType":"${opts.contactType}"` } });
    if (opts.level) conditions.push({ content: { contains: `"level":"${opts.level}"` } });
    if (opts.relationshipStatus) conditions.push({ content: { contains: `"relationshipStatus":"${opts.relationshipStatus}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContact);
  },

  async updateContact(id: string, input: UpdateContactInput): Promise<GovContact | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.contactType !== undefined && { contactType: input.contactType }),
      ...(input.level !== undefined && { level: input.level }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.organization !== undefined && { organization: input.organization }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.jurisdiction !== undefined && { jurisdiction: input.jurisdiction }),
      ...(input.relationshipStatus !== undefined && { relationshipStatus: input.relationshipStatus }),
      ...(input.lastContactDate !== undefined && { lastContactDate: input.lastContactDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['gov_contact', content.contactType, content.level, content.relationshipStatus]) },
    }), null);
    if (!row) return null;
    return toContact(row as MemoryRow);
  },

  async deleteContact(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Policies ──

  async createPolicy(organizationId: string, workspaceId: string, input: CreatePolicyInput, createdBy: string): Promise<PolicyMonitor> {
    const content = {
      title: input.title.trim(),
      policyType: input.policyType,
      status: input.status ?? 'monitoring',
      jurisdiction: input.jurisdiction ?? '',
      billNumber: input.billNumber ?? '',
      sponsor: input.sponsor ?? '',
      summary: input.summary ?? '',
      impactAssessment: input.impactAssessment ?? '',
      position: input.position ?? '',
      introducedDate: input.introducedDate ?? null,
      lastActionDate: input.lastActionDate ?? null,
      nextActionDate: input.nextActionDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'policy_monitor',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['policy_monitor', content.policyType, content.status]),
        createdBy,
      },
    });
    return toPolicy(row as MemoryRow);
  },

  async getPolicy(id: string): Promise<PolicyMonitor | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'policy_monitor') return null;
    return toPolicy(row as MemoryRow);
  },

  async listPolicies(organizationId: string, opts: ListPoliciesOpts = {}): Promise<PolicyMonitor[]> {
    const where: Record<string, unknown> = { organizationId, type: 'policy_monitor' };
    const conditions: unknown[] = [];
    if (opts.policyType) conditions.push({ content: { contains: `"policyType":"${opts.policyType}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.jurisdiction) conditions.push({ content: { contains: `"jurisdiction":"${opts.jurisdiction}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPolicy);
  },

  async updatePolicy(id: string, input: UpdatePolicyInput): Promise<PolicyMonitor | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.policyType !== undefined && { policyType: input.policyType }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.jurisdiction !== undefined && { jurisdiction: input.jurisdiction }),
      ...(input.billNumber !== undefined && { billNumber: input.billNumber }),
      ...(input.sponsor !== undefined && { sponsor: input.sponsor }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.impactAssessment !== undefined && { impactAssessment: input.impactAssessment }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.introducedDate !== undefined && { introducedDate: input.introducedDate }),
      ...(input.lastActionDate !== undefined && { lastActionDate: input.lastActionDate }),
      ...(input.nextActionDate !== undefined && { nextActionDate: input.nextActionDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['policy_monitor', content.policyType, content.status]) },
    }), null);
    if (!row) return null;
    return toPolicy(row as MemoryRow);
  },

  async deletePolicy(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async updatePosition(id: string, position: string, _updatedBy: string): Promise<PolicyMonitor | null> {
    return GovRelationsService.updatePolicy(id, { position });
  },

  // ── Lobbying ──

  async createLobbying(organizationId: string, workspaceId: string, input: CreateLobbyingInput, createdBy: string): Promise<LobbyingActivity> {
    const content = {
      title: input.title.trim(),
      description: input.description ?? '',
      status: input.status ?? 'planned',
      contactIds: input.contactIds ?? [],
      policyId: input.policyId ?? null,
      registrationId: '',
      registeredBy: '',
      registeredAt: null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      budget: input.budget ?? 0,
      spent: input.spent ?? 0,
      completedBy: '',
      completedAt: null,
      cancelledBy: '',
      cancelledAt: null,
      cancelReason: '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'lobbying_activity',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.policyId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lobbying_activity', content.status]),
        createdBy,
      },
    });
    return toLobbying(row as MemoryRow);
  },

  async getLobbying(id: string): Promise<LobbyingActivity | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lobbying_activity') return null;
    return toLobbying(row as MemoryRow);
  },

  async listLobbying(organizationId: string, opts: ListLobbyingOpts = {}): Promise<LobbyingActivity[]> {
    const where: Record<string, unknown> = { organizationId, type: 'lobbying_activity' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.policyId) conditions.push({ content: { contains: `"policyId":"${opts.policyId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toLobbying);
  },

  async updateLobbying(id: string, input: UpdateLobbyingInput): Promise<LobbyingActivity | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.contactIds !== undefined && { contactIds: input.contactIds }),
      ...(input.policyId !== undefined && { policyId: input.policyId }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.spent !== undefined && { spent: input.spent }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lobbying_activity', content.status]) },
    }), null);
    if (!row) return null;
    return toLobbying(row as MemoryRow);
  },

  async registerLobbying(id: string, registrationId: string, registeredBy: string): Promise<LobbyingActivity | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, status: 'registered', registrationId, registeredBy, registeredAt: new Date().toISOString() };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lobbying_activity', 'registered']) },
    }), null);
    if (!row) return null;
    return toLobbying(row as MemoryRow);
  },

  async completeLobbying(id: string, completedBy: string): Promise<LobbyingActivity | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, status: 'completed', completedBy, completedAt: new Date().toISOString() };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lobbying_activity', 'completed']) },
    }), null);
    if (!row) return null;
    return toLobbying(row as MemoryRow);
  },

  async cancelLobbying(id: string, reason: string, cancelledBy: string): Promise<LobbyingActivity | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, status: 'cancelled', cancelReason: reason, cancelledBy, cancelledAt: new Date().toISOString() };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lobbying_activity', 'cancelled']) },
    }), null);
    if (!row) return null;
    return toLobbying(row as MemoryRow);
  },

  // ── Compliance ──

  async createCompliance(organizationId: string, workspaceId: string, input: CreateComplianceInput, createdBy: string): Promise<GovCompliance> {
    const content = {
      title: input.title.trim(),
      complianceType: input.complianceType,
      status: input.status ?? 'pending',
      filingId: '',
      filedBy: '',
      filedAt: null,
      approvedBy: '',
      approvedAt: null,
      dueDate: input.dueDate ?? null,
      period: input.period ?? '',
      amount: input.amount ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'gov_compliance',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['gov_compliance', content.complianceType, content.status]),
        createdBy,
      },
    });
    return toCompliance(row as MemoryRow);
  },

  async getCompliance(id: string): Promise<GovCompliance | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'gov_compliance') return null;
    return toCompliance(row as MemoryRow);
  },

  async listCompliance(organizationId: string, opts: ListComplianceOpts = {}): Promise<GovCompliance[]> {
    const where: Record<string, unknown> = { organizationId, type: 'gov_compliance' };
    const conditions: unknown[] = [];
    if (opts.complianceType) conditions.push({ content: { contains: `"complianceType":"${opts.complianceType}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCompliance);
  },

  async updateCompliance(id: string, input: UpdateComplianceInput): Promise<GovCompliance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.complianceType !== undefined && { complianceType: input.complianceType }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['gov_compliance', content.complianceType, content.status]) },
    }), null);
    if (!row) return null;
    return toCompliance(row as MemoryRow);
  },

  async fileCompliance(id: string, filingId: string, filedBy: string): Promise<GovCompliance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, status: 'filed', filingId, filedBy, filedAt: new Date().toISOString() };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['gov_compliance', c.complianceType, 'filed']) },
    }), null);
    if (!row) return null;
    return toCompliance(row as MemoryRow);
  },

  async approveCompliance(id: string, approvedBy: string): Promise<GovCompliance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, status: 'approved', approvedBy, approvedAt: new Date().toISOString() };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['gov_compliance', c.complianceType, 'approved']) },
    }), null);
    if (!row) return null;
    return toCompliance(row as MemoryRow);
  },

  // ── Metrics & Stats ──

  async getGovRelationsMetrics(organizationId: string): Promise<GovRelationsMetrics> {
    const [policies, lobbying, compliance, contacts] = await Promise.all([
      GovRelationsService.listPolicies(organizationId),
      GovRelationsService.listLobbying(organizationId),
      GovRelationsService.listCompliance(organizationId),
      GovRelationsService.listContacts(organizationId),
    ]);
    const activePolicies = policies.filter((p) => p.status === 'monitoring' || p.status === 'supporting' || p.status === 'opposing' || p.status === 'amending').length;
    const registeredLobbying = lobbying.filter((l) => l.status === 'registered' || l.status === 'active').length;
    const pendingCompliance = compliance.filter((c) => c.status === 'pending').length;
    const overdueCompliance = compliance.filter((c) => c.dueDate && c.dueDate < new Date() && c.status !== 'filed' && c.status !== 'approved').length;
    return { activePolicies, registeredLobbying, pendingCompliance, totalContacts: contacts.length, overdueCompliance };
  },

  async getGovRelationsStats(organizationId: string): Promise<GovRelationsStats> {
    const [contacts, policies, lobbying, compliance] = await Promise.all([
      GovRelationsService.listContacts(organizationId),
      GovRelationsService.listPolicies(organizationId),
      GovRelationsService.listLobbying(organizationId),
      GovRelationsService.listCompliance(organizationId),
    ]);
    const byContactType: Record<string, number> = {};
    const byContactLevel: Record<string, number> = {};
    const byPolicyStatus: Record<string, number> = {};
    const byLobbyingStatus: Record<string, number> = {};
    const byComplianceStatus: Record<string, number> = {};
    for (const c of contacts) { byContactType[c.contactType] = (byContactType[c.contactType] ?? 0) + 1; byContactLevel[c.level] = (byContactLevel[c.level] ?? 0) + 1; }
    for (const p of policies) { byPolicyStatus[p.status] = (byPolicyStatus[p.status] ?? 0) + 1; }
    for (const l of lobbying) { byLobbyingStatus[l.status] = (byLobbyingStatus[l.status] ?? 0) + 1; }
    for (const comp of compliance) { byComplianceStatus[comp.status] = (byComplianceStatus[comp.status] ?? 0) + 1; }
    return {
      contactCount: contacts.length,
      policyCount: policies.length,
      lobbyingCount: lobbying.length,
      complianceCount: compliance.length,
      byContactType, byContactLevel, byPolicyStatus, byLobbyingStatus, byComplianceStatus,
    };
  },
};
