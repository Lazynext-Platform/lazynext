import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type InsurancePolicyType =
  | 'general_liability'
  | 'property'
  | 'cyber'
  | 'professional_liability'
  | 'workers_comp'
  | 'auto'
  | 'directors_officers'
  | 'health'
  | 'life'
  | 'umbrella'
  | 'other';

export type InsurancePolicyStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'renewed';
export type InsuranceClaimStatus = 'filed' | 'under_review' | 'approved' | 'denied' | 'settled';

// ── Memory row ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Content payloads ──

interface PolicyContent {
  policyNumber: string;
  type: InsurancePolicyType;
  provider: string;
  broker: string;
  premium: number;
  deductible: number;
  coverageLimit: number;
  startDate: string;
  endDate: string;
  status: InsurancePolicyStatus;
  beneficiaries: string[];
  renewedBy: string;
  renewedAt: string | null;
}

interface ClaimContent {
  policyId: string;
  claimNumber: string;
  incidentDate: string;
  description: string;
  amount: number;
  status: InsuranceClaimStatus;
  adjuster: string;
  filedBy: string;
  notes: string;
  approvedAmount: number;
  approvedBy: string;
  approvedAt: string | null;
  deniedReason: string;
  deniedBy: string;
  deniedAt: string | null;
  settlementAmount: number;
  settledBy: string;
  settledAt: string | null;
}

interface CoverageContent {
  policyId: string;
  name: string;
  description: string;
  coveredPerils: string[];
  exclusions: string[];
  limit: number;
  sublimits: Array<{ name: string; amount: number }>;
}

interface BrokerContent {
  name: string;
  company: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specialties: string[];
  commissionRate: number;
}

// ── Public interfaces ──

export interface InsurancePolicy {
  id: string;
  organizationId: string;
  workspaceId: string;
  policyNumber: string;
  type: InsurancePolicyType;
  provider: string;
  broker: string;
  premium: number;
  deductible: number;
  coverageLimit: number;
  startDate: string;
  endDate: string;
  status: InsurancePolicyStatus;
  beneficiaries: string[];
  renewedBy: string;
  renewedAt: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsuranceClaim {
  id: string;
  organizationId: string;
  workspaceId: string;
  policyId: string;
  claimNumber: string;
  incidentDate: string;
  description: string;
  amount: number;
  status: InsuranceClaimStatus;
  adjuster: string;
  filedBy: string;
  notes: string;
  approvedAmount: number;
  approvedBy: string;
  approvedAt: string | null;
  deniedReason: string;
  deniedBy: string;
  deniedAt: string | null;
  settlementAmount: number;
  settledBy: string;
  settledAt: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsuranceCoverage {
  id: string;
  organizationId: string;
  workspaceId: string;
  policyId: string;
  name: string;
  description: string;
  coveredPerils: string[];
  exclusions: string[];
  limit: number;
  sublimits: Array<{ name: string; amount: number }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsuranceBroker {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specialties: string[];
  commissionRate: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Input / Options ──

export interface CreatePolicyInput {
  policyNumber: string;
  type: InsurancePolicyType;
  provider: string;
  broker?: string;
  premium?: number;
  deductible?: number;
  coverageLimit?: number;
  startDate: string;
  endDate?: string;
  status?: InsurancePolicyStatus;
  beneficiaries?: string[];
}

export interface UpdatePolicyInput {
  policyNumber?: string;
  type?: InsurancePolicyType;
  provider?: string;
  broker?: string;
  premium?: number;
  deductible?: number;
  coverageLimit?: number;
  startDate?: string;
  endDate?: string;
  status?: InsurancePolicyStatus;
  beneficiaries?: string[];
}

export interface ListPoliciesOpts {
  type?: InsurancePolicyType;
  status?: InsurancePolicyStatus;
  provider?: string;
}

export interface CreateClaimInput {
  policyId: string;
  claimNumber?: string;
  incidentDate: string;
  description: string;
  amount: number;
  status?: InsuranceClaimStatus;
  adjuster?: string;
  filedBy?: string;
  notes?: string;
}

export interface UpdateClaimInput {
  claimNumber?: string;
  incidentDate?: string;
  description?: string;
  amount?: number;
  status?: InsuranceClaimStatus;
  adjuster?: string;
  filedBy?: string;
  notes?: string;
}

export interface ListClaimsOpts {
  policyId?: string;
  status?: InsuranceClaimStatus;
}

export interface CreateCoverageInput {
  policyId: string;
  name: string;
  description?: string;
  coveredPerils: string[];
  exclusions?: string[];
  limit?: number;
  sublimits?: Array<{ name: string; amount: number }>;
}

export interface UpdateCoverageInput {
  name?: string;
  description?: string;
  coveredPerils?: string[];
  exclusions?: string[];
  limit?: number;
  sublimits?: Array<{ name: string; amount: number }>;
}

export interface ListCoveragesOpts {
  policyId?: string;
}

export interface CreateBrokerInput {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialties?: string[];
  commissionRate?: number;
}

export interface UpdateBrokerInput {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialties?: string[];
  commissionRate?: number;
}

export interface ListBrokersOpts {
  company?: string;
}

export interface InsuranceMetrics {
  totalCoverage: number;
  totalPremiums: number;
  openClaims: number;
  claimSuccessRate: number;
  expiringPolicies: number;
}

export interface InsuranceStats {
  policyCount: number;
  activePolicyCount: number;
  claimCount: number;
  openClaimCount: number;
  coverageCount: number;
  brokerCount: number;
  totalCoverage: number;
  totalPremiums: number;
  expiringPolicies: number;
}

// ── Helpers ──

const fallbackPolicyContent: PolicyContent = {
  policyNumber: '',
  type: 'other',
  provider: '',
  broker: '',
  premium: 0,
  deductible: 0,
  coverageLimit: 0,
  startDate: '',
  endDate: '',
  status: 'active',
  beneficiaries: [],
  renewedBy: '',
  renewedAt: null,
};

const fallbackClaimContent: ClaimContent = {
  policyId: '',
  claimNumber: '',
  incidentDate: '',
  description: '',
  amount: 0,
  status: 'filed',
  adjuster: '',
  filedBy: '',
  notes: '',
  approvedAmount: 0,
  approvedBy: '',
  approvedAt: null,
  deniedReason: '',
  deniedBy: '',
  deniedAt: null,
  settlementAmount: 0,
  settledBy: '',
  settledAt: null,
};

const fallbackCoverageContent: CoverageContent = {
  policyId: '',
  name: '',
  description: '',
  coveredPerils: [],
  exclusions: [],
  limit: 0,
  sublimits: [],
};

const fallbackBrokerContent: BrokerContent = {
  name: '',
  company: '',
  email: '',
  phone: '',
  licenseNumber: '',
  specialties: [],
  commissionRate: 0,
};

function parsePolicyContent(raw: string): PolicyContent {
  if (!raw) return fallbackPolicyContent;
  try {
    const p = JSON.parse(raw);
    return {
      policyNumber: p.policyNumber ?? '',
      type: (p.type as InsurancePolicyType) ?? 'other',
      provider: p.provider ?? '',
      broker: p.broker ?? '',
      premium: Number(p.premium) || 0,
      deductible: Number(p.deductible) || 0,
      coverageLimit: Number(p.coverageLimit) || 0,
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? '',
      status: (p.status as InsurancePolicyStatus) ?? 'active',
      beneficiaries: Array.isArray(p.beneficiaries) ? p.beneficiaries : [],
      renewedBy: p.renewedBy ?? '',
      renewedAt: p.renewedAt ?? null,
    };
  } catch {
    return fallbackPolicyContent;
  }
}

function parseClaimContent(raw: string): ClaimContent {
  if (!raw) return fallbackClaimContent;
  try {
    const p = JSON.parse(raw);
    return {
      policyId: p.policyId ?? '',
      claimNumber: p.claimNumber ?? '',
      incidentDate: p.incidentDate ?? '',
      description: p.description ?? '',
      amount: Number(p.amount) || 0,
      status: (p.status as InsuranceClaimStatus) ?? 'filed',
      adjuster: p.adjuster ?? '',
      filedBy: p.filedBy ?? '',
      notes: p.notes ?? '',
      approvedAmount: Number(p.approvedAmount) || 0,
      approvedBy: p.approvedBy ?? '',
      approvedAt: p.approvedAt ?? null,
      deniedReason: p.deniedReason ?? '',
      deniedBy: p.deniedBy ?? '',
      deniedAt: p.deniedAt ?? null,
      settlementAmount: Number(p.settlementAmount) || 0,
      settledBy: p.settledBy ?? '',
      settledAt: p.settledAt ?? null,
    };
  } catch {
    return fallbackClaimContent;
  }
}

function parseCoverageContent(raw: string): CoverageContent {
  if (!raw) return fallbackCoverageContent;
  try {
    const p = JSON.parse(raw);
    return {
      policyId: p.policyId ?? '',
      name: p.name ?? '',
      description: p.description ?? '',
      coveredPerils: Array.isArray(p.coveredPerils) ? p.coveredPerils : [],
      exclusions: Array.isArray(p.exclusions) ? p.exclusions : [],
      limit: Number(p.limit) || 0,
      sublimits: Array.isArray(p.sublimits) ? p.sublimits : [],
    };
  } catch {
    return fallbackCoverageContent;
  }
}

function parseBrokerContent(raw: string): BrokerContent {
  if (!raw) return fallbackBrokerContent;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      company: p.company ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      licenseNumber: p.licenseNumber ?? '',
      specialties: Array.isArray(p.specialties) ? p.specialties : [],
      commissionRate: Number(p.commissionRate) || 0,
    };
  } catch {
    return fallbackBrokerContent;
  }
}

function toPolicy(row: MemoryRow): InsurancePolicy {
  const c = parsePolicyContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    policyNumber: c.policyNumber,
    type: c.type,
    provider: c.provider,
    broker: c.broker,
    premium: c.premium,
    deductible: c.deductible,
    coverageLimit: c.coverageLimit,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    beneficiaries: c.beneficiaries,
    renewedBy: c.renewedBy,
    renewedAt: c.renewedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toClaim(row: MemoryRow): InsuranceClaim {
  const c = parseClaimContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    policyId: c.policyId,
    claimNumber: c.claimNumber,
    incidentDate: c.incidentDate,
    description: c.description,
    amount: c.amount,
    status: c.status,
    adjuster: c.adjuster,
    filedBy: c.filedBy,
    notes: c.notes,
    approvedAmount: c.approvedAmount,
    approvedBy: c.approvedBy,
    approvedAt: c.approvedAt,
    deniedReason: c.deniedReason,
    deniedBy: c.deniedBy,
    deniedAt: c.deniedAt,
    settlementAmount: c.settlementAmount,
    settledBy: c.settledBy,
    settledAt: c.settledAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toCoverage(row: MemoryRow): InsuranceCoverage {
  const c = parseCoverageContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    policyId: c.policyId,
    name: c.name,
    description: c.description,
    coveredPerils: c.coveredPerils,
    exclusions: c.exclusions,
    limit: c.limit,
    sublimits: c.sublimits,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toBroker(row: MemoryRow): InsuranceBroker {
  const c = parseBrokerContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    licenseNumber: c.licenseNumber,
    specialties: c.specialties,
    commissionRate: c.commissionRate,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Insurance Service ──

export const InsuranceService = {
  // ── Policies ──

  async createPolicy(
    organizationId: string,
    workspaceId: string,
    input: CreatePolicyInput,
    createdBy: string,
  ): Promise<InsurancePolicy> {
    const content: PolicyContent = {
      policyNumber: input.policyNumber,
      type: input.type,
      provider: input.provider,
      broker: input.broker ?? '',
      premium: input.premium ?? 0,
      deductible: input.deductible ?? 0,
      coverageLimit: input.coverageLimit ?? 0,
      startDate: input.startDate,
      endDate: input.endDate ?? '',
      status: input.status ?? 'active',
      beneficiaries: input.beneficiaries ?? [],
      renewedBy: '',
      renewedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'insurance_policy',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['insurance_policy', content.type, content.status]),
        createdBy,
      },
    });

    return toPolicy(row as MemoryRow);
  },

  async getPolicy(id: string): Promise<InsurancePolicy | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toPolicy(row as MemoryRow);
  },

  async listPolicies(
    organizationId: string,
    opts: ListPoliciesOpts = {},
  ): Promise<InsurancePolicy[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'insurance_policy', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let policies = rows.map((r) => toPolicy(r as MemoryRow));
    if (opts.type) {
      policies = policies.filter((p) => p.type === opts.type);
    }
    if (opts.status) {
      policies = policies.filter((p) => p.status === opts.status);
    }
    if (opts.provider) {
      policies = policies.filter((p) => p.provider === opts.provider);
    }
    return policies;
  },

  async updatePolicy(
    id: string,
    input: UpdatePolicyInput,
  ): Promise<InsurancePolicy | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parsePolicyContent(existing.content);
    if (input.policyNumber !== undefined) content.policyNumber = input.policyNumber;
    if (input.type !== undefined) content.type = input.type;
    if (input.provider !== undefined) content.provider = input.provider;
    if (input.broker !== undefined) content.broker = input.broker;
    if (input.premium !== undefined) content.premium = input.premium;
    if (input.deductible !== undefined) content.deductible = input.deductible;
    if (input.coverageLimit !== undefined) content.coverageLimit = input.coverageLimit;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.beneficiaries !== undefined) content.beneficiaries = input.beneficiaries;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['insurance_policy', content.type, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPolicy(row as MemoryRow);
  },

  async deletePolicy(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async renewPolicy(
    id: string,
    newEndDate: string,
    newPremium?: number,
    renewedBy?: string,
  ): Promise<InsurancePolicy | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parsePolicyContent(existing.content);
    content.endDate = newEndDate;
    if (newPremium !== undefined) content.premium = newPremium;
    content.status = 'renewed';
    content.renewedBy = renewedBy ?? '';
    content.renewedAt = new Date().toISOString();

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['insurance_policy', content.type, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPolicy(row as MemoryRow);
  },

  // ── Claims ──

  async createClaim(
    organizationId: string,
    workspaceId: string,
    input: CreateClaimInput,
    createdBy: string,
  ): Promise<InsuranceClaim> {
    const content: ClaimContent = {
      policyId: input.policyId,
      claimNumber: input.claimNumber ?? '',
      incidentDate: input.incidentDate,
      description: input.description,
      amount: input.amount,
      status: input.status ?? 'filed',
      adjuster: input.adjuster ?? '',
      filedBy: input.filedBy ?? createdBy,
      notes: input.notes ?? '',
      approvedAmount: 0,
      approvedBy: '',
      approvedAt: null,
      deniedReason: '',
      deniedBy: '',
      deniedAt: null,
      settlementAmount: 0,
      settledBy: '',
      settledAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'insurance_claim',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.policyId,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['insurance_claim', content.status]),
        createdBy,
      },
    });

    return toClaim(row as MemoryRow);
  },

  async getClaim(id: string): Promise<InsuranceClaim | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toClaim(row as MemoryRow);
  },

  async listClaims(
    organizationId: string,
    opts: ListClaimsOpts = {},
  ): Promise<InsuranceClaim[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'insurance_claim', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let claims = rows.map((r) => toClaim(r as MemoryRow));
    if (opts.policyId) {
      claims = claims.filter((c) => c.policyId === opts.policyId);
    }
    if (opts.status) {
      claims = claims.filter((c) => c.status === opts.status);
    }
    return claims;
  },

  async updateClaim(
    id: string,
    input: UpdateClaimInput,
  ): Promise<InsuranceClaim | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseClaimContent(existing.content);
    if (input.claimNumber !== undefined) content.claimNumber = input.claimNumber;
    if (input.incidentDate !== undefined) content.incidentDate = input.incidentDate;
    if (input.description !== undefined) content.description = input.description;
    if (input.amount !== undefined) content.amount = input.amount;
    if (input.status !== undefined) content.status = input.status;
    if (input.adjuster !== undefined) content.adjuster = input.adjuster;
    if (input.filedBy !== undefined) content.filedBy = input.filedBy;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['insurance_claim', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toClaim(row as MemoryRow);
  },

  async approveClaim(
    id: string,
    approvedAmount: number,
    approvedBy: string,
  ): Promise<InsuranceClaim | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseClaimContent(existing.content);
    content.status = 'approved';
    content.approvedAmount = approvedAmount;
    content.approvedBy = approvedBy;
    content.approvedAt = new Date().toISOString();

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['insurance_claim', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toClaim(row as MemoryRow);
  },

  async denyClaim(
    id: string,
    reason: string,
    deniedBy: string,
  ): Promise<InsuranceClaim | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseClaimContent(existing.content);
    content.status = 'denied';
    content.deniedReason = reason;
    content.deniedBy = deniedBy;
    content.deniedAt = new Date().toISOString();

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['insurance_claim', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toClaim(row as MemoryRow);
  },

  async settleClaim(
    id: string,
    settlementAmount: number,
    settledBy: string,
  ): Promise<InsuranceClaim | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseClaimContent(existing.content);
    content.status = 'settled';
    content.settlementAmount = settlementAmount;
    content.settledBy = settledBy;
    content.settledAt = new Date().toISOString();

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['insurance_claim', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toClaim(row as MemoryRow);
  },

  // ── Coverages ──

  async createCoverage(
    organizationId: string,
    workspaceId: string,
    input: CreateCoverageInput,
    createdBy: string,
  ): Promise<InsuranceCoverage> {
    const content: CoverageContent = {
      policyId: input.policyId,
      name: input.name,
      description: input.description ?? '',
      coveredPerils: input.coveredPerils,
      exclusions: input.exclusions ?? [],
      limit: input.limit ?? 0,
      sublimits: input.sublimits ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'insurance_coverage',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.policyId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['insurance_coverage']),
        createdBy,
      },
    });

    return toCoverage(row as MemoryRow);
  },

  async getCoverage(id: string): Promise<InsuranceCoverage | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toCoverage(row as MemoryRow);
  },

  async listCoverages(
    organizationId: string,
    opts: ListCoveragesOpts = {},
  ): Promise<InsuranceCoverage[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'insurance_coverage', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let coverages = rows.map((r) => toCoverage(r as MemoryRow));
    if (opts.policyId) {
      coverages = coverages.filter((c) => c.policyId === opts.policyId);
    }
    return coverages;
  },

  async updateCoverage(
    id: string,
    input: UpdateCoverageInput,
  ): Promise<InsuranceCoverage | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseCoverageContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.description !== undefined) content.description = input.description;
    if (input.coveredPerils !== undefined) content.coveredPerils = input.coveredPerils;
    if (input.exclusions !== undefined) content.exclusions = input.exclusions;
    if (input.limit !== undefined) content.limit = input.limit;
    if (input.sublimits !== undefined) content.sublimits = input.sublimits;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCoverage(row as MemoryRow);
  },

  async deleteCoverage(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Brokers ──

  async createBroker(
    organizationId: string,
    workspaceId: string,
    input: CreateBrokerInput,
    createdBy: string,
  ): Promise<InsuranceBroker> {
    const content: BrokerContent = {
      name: input.name,
      company: input.company ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      licenseNumber: input.licenseNumber ?? '',
      specialties: input.specialties ?? [],
      commissionRate: input.commissionRate ?? 0,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'insurance_broker',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['insurance_broker']),
        createdBy,
      },
    });

    return toBroker(row as MemoryRow);
  },

  async getBroker(id: string): Promise<InsuranceBroker | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toBroker(row as MemoryRow);
  },

  async listBrokers(
    organizationId: string,
    opts: ListBrokersOpts = {},
  ): Promise<InsuranceBroker[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'insurance_broker', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let brokers = rows.map((r) => toBroker(r as MemoryRow));
    if (opts.company) {
      brokers = brokers.filter((b) => b.company === opts.company);
    }
    return brokers;
  },

  async updateBroker(
    id: string,
    input: UpdateBrokerInput,
  ): Promise<InsuranceBroker | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseBrokerContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.company !== undefined) content.company = input.company;
    if (input.email !== undefined) content.email = input.email;
    if (input.phone !== undefined) content.phone = input.phone;
    if (input.licenseNumber !== undefined) content.licenseNumber = input.licenseNumber;
    if (input.specialties !== undefined) content.specialties = input.specialties;
    if (input.commissionRate !== undefined) content.commissionRate = input.commissionRate;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
          },
        }),
      null,
    );
    if (!row) return null;
    return toBroker(row as MemoryRow);
  },

  async deleteBroker(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Analytics ──

  async getExpiringPolicies(
    organizationId: string,
    daysAhead = 90,
  ): Promise<InsurancePolicy[]> {
    const policies = await this.listPolicies(organizationId, { status: 'active' });
    const now = new Date();
    const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return policies.filter((p) => {
      if (!p.endDate) return false;
      const end = new Date(p.endDate);
      if (isNaN(end.getTime())) return false;
      return end >= now && end <= horizon;
    });
  },

  async getInsuranceMetrics(organizationId: string): Promise<InsuranceMetrics> {
    const [policies, claims, expiring] = await Promise.all([
      this.listPolicies(organizationId),
      this.listClaims(organizationId),
      this.getExpiringPolicies(organizationId),
    ]);

    const totalCoverage = policies.reduce((s, p) => s + p.coverageLimit, 0);
    const totalPremiums = policies.reduce((s, p) => s + p.premium, 0);
    const openClaims = claims.filter(
      (c) => c.status === 'filed' || c.status === 'under_review',
    ).length;
    const closedClaims = claims.filter(
      (c) => c.status === 'approved' || c.status === 'settled',
    ).length;
    const totalDecided = claims.filter(
      (c) => c.status === 'approved' || c.status === 'settled' || c.status === 'denied',
    ).length;
    const claimSuccessRate = totalDecided > 0 ? closedClaims / totalDecided : 0;

    return {
      totalCoverage,
      totalPremiums,
      openClaims,
      claimSuccessRate,
      expiringPolicies: expiring.length,
    };
  },

  async getStats(organizationId: string): Promise<InsuranceStats> {
    const [policies, claims, coverages, brokers, expiring] = await Promise.all([
      this.listPolicies(organizationId),
      this.listClaims(organizationId),
      this.listCoverages(organizationId),
      this.listBrokers(organizationId),
      this.getExpiringPolicies(organizationId),
    ]);

    const activePolicyCount = policies.filter((p) => p.status === 'active').length;
    const openClaimCount = claims.filter(
      (c) => c.status === 'filed' || c.status === 'under_review',
    ).length;
    const totalCoverage = policies.reduce((s, p) => s + p.coverageLimit, 0);
    const totalPremiums = policies.reduce((s, p) => s + p.premium, 0);

    return {
      policyCount: policies.length,
      activePolicyCount,
      claimCount: claims.length,
      openClaimCount,
      coverageCount: coverages.length,
      brokerCount: brokers.length,
      totalCoverage,
      totalPremiums,
      expiringPolicies: expiring.length,
    };
  },
};
