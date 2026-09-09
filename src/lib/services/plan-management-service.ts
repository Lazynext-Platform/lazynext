import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PlanType = 'health' | 'dental' | 'vision' | 'retirement_401k' | 'retirement_pension' | 'life_insurance' | 'disability' | 'fsa' | 'hsa' | 'hra' | 'eap' | 'wellness' | 'tuition_assistance' | 'transportation' | 'flexible_benefits';
export type PlanStatus = 'draft' | 'active' | 'open_enrollment' | 'closed' | 'suspended' | 'terminated' | 'renewed';
export type EnrollmentType = 'initial' | 'open_enrollment' | 'qualifying_event' | 'termination' | 'change' | 'waive';
export type EnrollmentStatus = 'pending' | 'active' | 'terminated' | 'waived' | 'cancelled' | 'suspended';
export type ProviderType = 'insurance' | 'administrator' | 'tpa' | 'broker' | 'consultant' | 'financial' | 'pharmacy' | 'wellness';
export type ProviderStatus = 'active' | 'inactive' | 'terminated' | 'preferred' | 'under_review';
export type ClaimType = 'medical' | 'dental' | 'vision' | 'life' | 'disability' | 'prescription' | 'retirement' | 'wellness' | 'fsa' | 'hsa';
export type ClaimStatus = 'submitted' | 'in_review' | 'approved' | 'denied' | 'paid' | 'appealed' | 'cancelled' | 'partially_paid';

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

export interface BenefitPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PlanType;
  description: string;
  status: PlanStatus;
  providerId: string;
  eligibility: string;
  effectiveDate: Date | null;
  endDate: Date | null;
  contribution: string;
  coverage: string;
  documents: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanEnrollment {
  id: string;
  organizationId: string;
  workspaceId: string;
  planId: string;
  employeeId: string;
  employeeName: string;
  type: EnrollmentType;
  description: string;
  status: EnrollmentStatus;
  enrollmentDate: Date | null;
  effectiveDate: Date | null;
  terminationDate: Date | null;
  dependents: string[];
  contribution: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanProvider {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ProviderType;
  description: string;
  status: ProviderStatus;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  contractTerms: string;
  contractStart: Date | null;
  contractEnd: Date | null;
  rating: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanClaim {
  id: string;
  organizationId: string;
  workspaceId: string;
  planId: string;
  enrollmentId: string;
  employeeId: string;
  employeeName: string;
  type: ClaimType;
  amount: number;
  currency: string;
  description: string;
  status: ClaimStatus;
  submittedDate: Date | null;
  processedDate: Date | null;
  reference: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanManagementMetrics {
  activePlans: number;
  activeEnrollments: number;
  activeProviders: number;
  pendingClaims: number;
  totalClaimAmount: number;
}

export interface PlanManagementStats {
  planCount: number;
  activePlanCount: number;
  enrollmentCount: number;
  activeEnrollmentCount: number;
  providerCount: number;
  activeProviderCount: number;
  claimCount: number;
  pendingClaimCount: number;
  byPlanType: Record<string, number>;
  byPlanStatus: Record<string, number>;
  byEnrollmentType: Record<string, number>;
  byEnrollmentStatus: Record<string, number>;
  byProviderType: Record<string, number>;
  byProviderStatus: Record<string, number>;
  byClaimType: Record<string, number>;
  byClaimStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePlanInput {
  name: string;
  type: PlanType;
  description?: string;
  status?: PlanStatus;
  providerId?: string;
  eligibility?: string;
  effectiveDate?: string;
  endDate?: string;
  contribution?: string;
  coverage?: string;
  documents?: string[];
  notes?: string;
}

export interface UpdatePlanInput {
  name?: string;
  type?: PlanType;
  description?: string;
  status?: PlanStatus;
  providerId?: string;
  eligibility?: string;
  effectiveDate?: string;
  endDate?: string;
  contribution?: string;
  coverage?: string;
  documents?: string[];
  notes?: string;
}

export interface ListPlansOpts {
  type?: PlanType;
  status?: PlanStatus;
}

export interface CreateEnrollmentInput {
  planId: string;
  employeeId: string;
  employeeName: string;
  type: EnrollmentType;
  description?: string;
  status?: EnrollmentStatus;
  enrollmentDate?: string;
  effectiveDate?: string;
  terminationDate?: string;
  dependents?: string[];
  contribution?: string;
  notes?: string;
}

export interface UpdateEnrollmentInput {
  planId?: string;
  employeeId?: string;
  employeeName?: string;
  type?: EnrollmentType;
  description?: string;
  status?: EnrollmentStatus;
  enrollmentDate?: string;
  effectiveDate?: string;
  terminationDate?: string;
  dependents?: string[];
  contribution?: string;
  notes?: string;
}

export interface ListEnrollmentsOpts {
  planId?: string;
  employeeId?: string;
  type?: EnrollmentType;
  status?: EnrollmentStatus;
}

export interface CreateProviderInput {
  name: string;
  type: ProviderType;
  description?: string;
  status?: ProviderStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  contractTerms?: string;
  contractStart?: string;
  contractEnd?: string;
  rating?: number;
  notes?: string;
}

export interface UpdateProviderInput {
  name?: string;
  type?: ProviderType;
  description?: string;
  status?: ProviderStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  contractTerms?: string;
  contractStart?: string;
  contractEnd?: string;
  rating?: number;
  notes?: string;
}

export interface ListProvidersOpts {
  type?: ProviderType;
  status?: ProviderStatus;
}

export interface CreateClaimInput {
  planId: string;
  enrollmentId: string;
  employeeId: string;
  employeeName: string;
  type: ClaimType;
  amount: number;
  currency?: string;
  description?: string;
  status?: ClaimStatus;
  submittedDate?: string;
  processedDate?: string;
  reference?: string;
  notes?: string;
}

export interface UpdateClaimInput {
  planId?: string;
  enrollmentId?: string;
  employeeId?: string;
  employeeName?: string;
  type?: ClaimType;
  amount?: number;
  currency?: string;
  description?: string;
  status?: ClaimStatus;
  submittedDate?: string;
  processedDate?: string;
  reference?: string;
  notes?: string;
}

export interface ListClaimsOpts {
  planId?: string;
  enrollmentId?: string;
  type?: ClaimType;
  status?: ClaimStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toPlan(row: MemoryRow): BenefitPlan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PlanType) ?? 'health',
    description: (c.description as string) ?? '',
    status: (c.status as PlanStatus) ?? 'draft',
    providerId: (c.providerId as string) ?? '',
    eligibility: (c.eligibility as string) ?? '',
    effectiveDate: c.effectiveDate ? new Date(c.effectiveDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    contribution: (c.contribution as string) ?? '',
    coverage: (c.coverage as string) ?? '',
    documents: (c.documents as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEnrollment(row: MemoryRow): PlanEnrollment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    planId: (c.planId as string) ?? '',
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    type: (c.type as EnrollmentType) ?? 'initial',
    description: (c.description as string) ?? '',
    status: (c.status as EnrollmentStatus) ?? 'pending',
    enrollmentDate: c.enrollmentDate ? new Date(c.enrollmentDate as string) : null,
    effectiveDate: c.effectiveDate ? new Date(c.effectiveDate as string) : null,
    terminationDate: c.terminationDate ? new Date(c.terminationDate as string) : null,
    dependents: (c.dependents as string[]) ?? [],
    contribution: (c.contribution as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toProvider(row: MemoryRow): PlanProvider {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ProviderType) ?? 'insurance',
    description: (c.description as string) ?? '',
    status: (c.status as ProviderStatus) ?? 'active',
    contactName: (c.contactName as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    address: (c.address as string) ?? '',
    contractTerms: (c.contractTerms as string) ?? '',
    contractStart: c.contractStart ? new Date(c.contractStart as string) : null,
    contractEnd: c.contractEnd ? new Date(c.contractEnd as string) : null,
    rating: (c.rating as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toClaim(row: MemoryRow): PlanClaim {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    planId: (c.planId as string) ?? '',
    enrollmentId: (c.enrollmentId as string) ?? '',
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    type: (c.type as ClaimType) ?? 'medical',
    amount: (c.amount as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    description: (c.description as string) ?? '',
    status: (c.status as ClaimStatus) ?? 'submitted',
    submittedDate: c.submittedDate ? new Date(c.submittedDate as string) : null,
    processedDate: c.processedDate ? new Date(c.processedDate as string) : null,
    reference: (c.reference as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const PlanManagementService = {
  // ── Plans ──

  async createPlan(organizationId: string, workspaceId: string, input: CreatePlanInput, createdBy: string): Promise<BenefitPlan> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      providerId: input.providerId ?? '',
      eligibility: input.eligibility ?? '',
      effectiveDate: input.effectiveDate ?? null,
      endDate: input.endDate ?? null,
      contribution: input.contribution ?? '',
      coverage: input.coverage ?? '',
      documents: input.documents ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'benefit_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.providerId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['benefit_plan', content.type, content.status]),
        createdBy,
      },
    });
    return toPlan(row as MemoryRow);
  },

  async getPlan(id: string): Promise<BenefitPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'benefit_plan') return null;
    return toPlan(row as MemoryRow);
  },

  async listPlans(organizationId: string, opts: ListPlansOpts = {}): Promise<BenefitPlan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'benefit_plan' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPlan);
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<BenefitPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.providerId !== undefined && { providerId: input.providerId }),
      ...(input.eligibility !== undefined && { eligibility: input.eligibility }),
      ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.contribution !== undefined && { contribution: input.contribution }),
      ...(input.coverage !== undefined && { coverage: input.coverage }),
      ...(input.documents !== undefined && { documents: input.documents }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['benefit_plan', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  async deletePlan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activatePlan(id: string, _activatedBy: string): Promise<BenefitPlan | null> {
    return PlanManagementService.updatePlan(id, { status: 'active' });
  },

  async openEnrollment(id: string, _openedBy: string): Promise<BenefitPlan | null> {
    return PlanManagementService.updatePlan(id, { status: 'open_enrollment' });
  },

  async closeEnrollment(id: string, _closedBy: string): Promise<BenefitPlan | null> {
    return PlanManagementService.updatePlan(id, { status: 'closed' });
  },

  async suspendPlan(id: string, _suspendedBy: string): Promise<BenefitPlan | null> {
    return PlanManagementService.updatePlan(id, { status: 'suspended' });
  },

  async terminatePlan(id: string, _terminatedBy: string): Promise<BenefitPlan | null> {
    return PlanManagementService.updatePlan(id, { status: 'terminated' });
  },

  async renewPlan(id: string, _renewedBy: string): Promise<BenefitPlan | null> {
    return PlanManagementService.updatePlan(id, { status: 'renewed' });
  },

  // ── Enrollments ──

  async createEnrollment(organizationId: string, workspaceId: string, input: CreateEnrollmentInput, createdBy: string): Promise<PlanEnrollment> {
    const content = {
      planId: input.planId,
      employeeId: input.employeeId,
      employeeName: input.employeeName.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      enrollmentDate: input.enrollmentDate ?? null,
      effectiveDate: input.effectiveDate ?? null,
      terminationDate: input.terminationDate ?? null,
      dependents: input.dependents ?? [],
      contribution: input.contribution ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'plan_enrollment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['plan_enrollment', content.type, content.status]),
        createdBy,
      },
    });
    return toEnrollment(row as MemoryRow);
  },

  async getEnrollment(id: string): Promise<PlanEnrollment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'plan_enrollment') return null;
    return toEnrollment(row as MemoryRow);
  },

  async listEnrollments(organizationId: string, opts: ListEnrollmentsOpts = {}): Promise<PlanEnrollment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'plan_enrollment' };
    const conditions: unknown[] = [];
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (opts.employeeId) conditions.push({ content: { contains: `"employeeId":"${opts.employeeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEnrollment);
  },

  async updateEnrollment(id: string, input: UpdateEnrollmentInput): Promise<PlanEnrollment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.planId !== undefined && { planId: input.planId }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.enrollmentDate !== undefined && { enrollmentDate: input.enrollmentDate }),
      ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate }),
      ...(input.terminationDate !== undefined && { terminationDate: input.terminationDate }),
      ...(input.dependents !== undefined && { dependents: input.dependents }),
      ...(input.contribution !== undefined && { contribution: input.contribution }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['plan_enrollment', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEnrollment(row as MemoryRow);
  },

  async deleteEnrollment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateEnrollment(id: string, _activatedBy: string): Promise<PlanEnrollment | null> {
    return PlanManagementService.updateEnrollment(id, { status: 'active' });
  },

  async terminateEnrollment(id: string, _terminatedBy: string): Promise<PlanEnrollment | null> {
    return PlanManagementService.updateEnrollment(id, { status: 'terminated', terminationDate: new Date().toISOString() });
  },

  async waiveEnrollment(id: string, _waivedBy: string): Promise<PlanEnrollment | null> {
    return PlanManagementService.updateEnrollment(id, { status: 'waived' });
  },

  async suspendEnrollment(id: string, _suspendedBy: string): Promise<PlanEnrollment | null> {
    return PlanManagementService.updateEnrollment(id, { status: 'suspended' });
  },

  // ── Providers ──

  async createProvider(organizationId: string, workspaceId: string, input: CreateProviderInput, createdBy: string): Promise<PlanProvider> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      contactName: input.contactName ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      address: input.address ?? '',
      contractTerms: input.contractTerms ?? '',
      contractStart: input.contractStart ?? null,
      contractEnd: input.contractEnd ?? null,
      rating: input.rating ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'plan_provider',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['plan_provider', content.type, content.status]),
        createdBy,
      },
    });
    return toProvider(row as MemoryRow);
  },

  async getProvider(id: string): Promise<PlanProvider | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'plan_provider') return null;
    return toProvider(row as MemoryRow);
  },

  async listProviders(organizationId: string, opts: ListProvidersOpts = {}): Promise<PlanProvider[]> {
    const where: Record<string, unknown> = { organizationId, type: 'plan_provider' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toProvider);
  },

  async updateProvider(id: string, input: UpdateProviderInput): Promise<PlanProvider | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.contactName !== undefined && { contactName: input.contactName }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.contractTerms !== undefined && { contractTerms: input.contractTerms }),
      ...(input.contractStart !== undefined && { contractStart: input.contractStart }),
      ...(input.contractEnd !== undefined && { contractEnd: input.contractEnd }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['plan_provider', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toProvider(row as MemoryRow);
  },

  async deleteProvider(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async preferProvider(id: string, _preferredBy: string): Promise<PlanProvider | null> {
    return PlanManagementService.updateProvider(id, { status: 'preferred' });
  },

  async reviewProvider(id: string, _reviewedBy: string): Promise<PlanProvider | null> {
    return PlanManagementService.updateProvider(id, { status: 'under_review' });
  },

  async terminateProvider(id: string, _terminatedBy: string): Promise<PlanProvider | null> {
    return PlanManagementService.updateProvider(id, { status: 'terminated' });
  },

  // ── Claims ──

  async createClaim(organizationId: string, workspaceId: string, input: CreateClaimInput, createdBy: string): Promise<PlanClaim> {
    const content = {
      planId: input.planId,
      enrollmentId: input.enrollmentId,
      employeeId: input.employeeId,
      employeeName: input.employeeName.trim(),
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      description: input.description ?? '',
      status: input.status ?? 'submitted',
      submittedDate: input.submittedDate ?? null,
      processedDate: input.processedDate ?? null,
      reference: input.reference ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'plan_claim',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.enrollmentId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['plan_claim', content.type, content.status]),
        createdBy,
      },
    });
    return toClaim(row as MemoryRow);
  },

  async getClaim(id: string): Promise<PlanClaim | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'plan_claim') return null;
    return toClaim(row as MemoryRow);
  },

  async listClaims(organizationId: string, opts: ListClaimsOpts = {}): Promise<PlanClaim[]> {
    const where: Record<string, unknown> = { organizationId, type: 'plan_claim' };
    const conditions: unknown[] = [];
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (opts.enrollmentId) conditions.push({ content: { contains: `"enrollmentId":"${opts.enrollmentId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toClaim);
  },

  async updateClaim(id: string, input: UpdateClaimInput): Promise<PlanClaim | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.planId !== undefined && { planId: input.planId }),
      ...(input.enrollmentId !== undefined && { enrollmentId: input.enrollmentId }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.submittedDate !== undefined && { submittedDate: input.submittedDate }),
      ...(input.processedDate !== undefined && { processedDate: input.processedDate }),
      ...(input.reference !== undefined && { reference: input.reference }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['plan_claim', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toClaim(row as MemoryRow);
  },

  async deleteClaim(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async reviewClaim(id: string, _reviewedBy: string): Promise<PlanClaim | null> {
    return PlanManagementService.updateClaim(id, { status: 'in_review' });
  },

  async approveClaim(id: string, _approvedBy: string): Promise<PlanClaim | null> {
    return PlanManagementService.updateClaim(id, { status: 'approved' });
  },

  async denyClaim(id: string, _deniedBy: string): Promise<PlanClaim | null> {
    return PlanManagementService.updateClaim(id, { status: 'denied' });
  },

  async payClaim(id: string, _paidBy: string): Promise<PlanClaim | null> {
    return PlanManagementService.updateClaim(id, { status: 'paid', processedDate: new Date().toISOString() });
  },

  async appealClaim(id: string, _appealedBy: string): Promise<PlanClaim | null> {
    return PlanManagementService.updateClaim(id, { status: 'appealed' });
  },

  async partiallyPayClaim(id: string, _paidBy: string): Promise<PlanClaim | null> {
    return PlanManagementService.updateClaim(id, { status: 'partially_paid', processedDate: new Date().toISOString() });
  },

  // ── Metrics & Stats ──

  async getPlanManagementMetrics(organizationId: string): Promise<PlanManagementMetrics> {
    const [plans, enrollments, providers, claims] = await Promise.all([
      PlanManagementService.listPlans(organizationId),
      PlanManagementService.listEnrollments(organizationId),
      PlanManagementService.listProviders(organizationId),
      PlanManagementService.listClaims(organizationId),
    ]);
    const activePlans = plans.filter((p) => p.status === 'active').length;
    const activeEnrollments = enrollments.filter((e) => e.status === 'active').length;
    const activeProviders = providers.filter((p) => p.status === 'active').length;
    const pendingClaims = claims.filter((c) => c.status === 'submitted' || c.status === 'in_review').length;
    const totalClaimAmount = claims.reduce((sum, c) => sum + c.amount, 0);
    return { activePlans, activeEnrollments, activeProviders, pendingClaims, totalClaimAmount };
  },

  async getPlanManagementStats(organizationId: string): Promise<PlanManagementStats> {
    const [plans, enrollments, providers, claims] = await Promise.all([
      PlanManagementService.listPlans(organizationId),
      PlanManagementService.listEnrollments(organizationId),
      PlanManagementService.listProviders(organizationId),
      PlanManagementService.listClaims(organizationId),
    ]);
    const byPlanType: Record<string, number> = {};
    const byPlanStatus: Record<string, number> = {};
    const byEnrollmentType: Record<string, number> = {};
    const byEnrollmentStatus: Record<string, number> = {};
    const byProviderType: Record<string, number> = {};
    const byProviderStatus: Record<string, number> = {};
    const byClaimType: Record<string, number> = {};
    const byClaimStatus: Record<string, number> = {};
    for (const p of plans) { byPlanType[p.type] = (byPlanType[p.type] ?? 0) + 1; byPlanStatus[p.status] = (byPlanStatus[p.status] ?? 0) + 1; }
    for (const e of enrollments) { byEnrollmentType[e.type] = (byEnrollmentType[e.type] ?? 0) + 1; byEnrollmentStatus[e.status] = (byEnrollmentStatus[e.status] ?? 0) + 1; }
    for (const p of providers) { byProviderType[p.type] = (byProviderType[p.type] ?? 0) + 1; byProviderStatus[p.status] = (byProviderStatus[p.status] ?? 0) + 1; }
    for (const c of claims) { byClaimType[c.type] = (byClaimType[c.type] ?? 0) + 1; byClaimStatus[c.status] = (byClaimStatus[c.status] ?? 0) + 1; }
    return {
      planCount: plans.length,
      activePlanCount: plans.filter((p) => p.status === 'active').length,
      enrollmentCount: enrollments.length,
      activeEnrollmentCount: enrollments.filter((e) => e.status === 'active').length,
      providerCount: providers.length,
      activeProviderCount: providers.filter((p) => p.status === 'active').length,
      claimCount: claims.length,
      pendingClaimCount: claims.filter((c) => c.status === 'submitted' || c.status === 'in_review').length,
      byPlanType, byPlanStatus, byEnrollmentType, byEnrollmentStatus, byProviderType, byProviderStatus, byClaimType, byClaimStatus,
    };
  },
};
