import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type BenefitPlanType =
  | 'health'
  | 'dental'
  | 'vision'
  | 'retirement'
  | 'life_insurance'
  | 'other';

export type CoverageLevel = 'individual' | 'family' | 'dependent';

export type ClaimType = 'medical' | 'dental' | 'vision' | 'other';

export type ClaimStatus = 'pending' | 'approved' | 'denied' | 'paid';

export type EnrollmentStatus = 'active' | 'cancelled';

/** Raw Memory row as stored in the database. */
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

/** Parsed content payload for a benefits plan Memory. */
interface PlanContent {
  name: string;
  type: BenefitPlanType;
  description: string;
  provider: string;
  costPerEmployee: number;
  employerContribution: number;
  eligibilityCriteria: string;
  enrollmentOpen: boolean;
  isActive: boolean;
}

/** Parsed content payload for a benefits enrollment Memory. */
interface EnrollmentContent {
  planId: string;
  planName: string;
  employeeId: string;
  employeeName: string;
  enrollmentDate: string;
  coverageLevel: CoverageLevel;
  beneficiary: string;
  contributionAmount: number;
  status: EnrollmentStatus;
}

/** Parsed content payload for a benefits claim Memory. */
interface ClaimContent {
  enrollmentId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  description: string;
  type: ClaimType;
  status: ClaimStatus;
  notes: string;
}

/** A structured benefit plan returned to callers. */
export interface BenefitPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: BenefitPlanType;
  description: string;
  provider: string;
  costPerEmployee: number;
  employerContribution: number;
  eligibilityCriteria: string;
  enrollmentOpen: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured enrollment returned to callers. */
export interface BenefitEnrollment {
  id: string;
  organizationId: string;
  workspaceId: string;
  planId: string;
  planName: string;
  employeeId: string;
  employeeName: string;
  enrollmentDate: string;
  coverageLevel: CoverageLevel;
  beneficiary: string;
  contributionAmount: number;
  status: EnrollmentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured claim returned to callers. */
export interface BenefitClaim {
  id: string;
  organizationId: string;
  workspaceId: string;
  enrollmentId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  description: string;
  type: ClaimType;
  status: ClaimStatus;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanInput {
  name: string;
  type: BenefitPlanType;
  description?: string;
  provider?: string;
  costPerEmployee?: number;
  employerContribution?: number;
  eligibilityCriteria?: string;
  enrollmentOpen?: boolean;
  isActive?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  type?: BenefitPlanType;
  description?: string;
  provider?: string;
  costPerEmployee?: number;
  employerContribution?: number;
  eligibilityCriteria?: string;
  enrollmentOpen?: boolean;
  isActive?: boolean;
}

export interface ListPlansOpts {
  type?: BenefitPlanType;
  isActive?: boolean;
}

export interface EnrollEmployeeInput {
  planId: string;
  employeeId: string;
  employeeName: string;
  enrollmentDate?: string;
  coverageLevel?: CoverageLevel;
  beneficiary?: string;
  contributionAmount?: number;
}

export interface ListEnrollmentsOpts {
  planId?: string;
  employeeId?: string;
}

export interface CreateClaimInput {
  enrollmentId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  description?: string;
  type?: ClaimType;
  status?: ClaimStatus;
}

export interface ListClaimsOpts {
  status?: ClaimStatus;
  employeeId?: string;
  enrollmentId?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface CostAnalysis {
  totalCost: number;
  costPerPlan: Record<string, number>;
  costPerEmployee: Record<string, number>;
}

export interface BenefitsStats {
  planCount: number;
  enrollmentCount: number;
  claimCount: number;
  totalCost: number;
}

// ── Helpers ──

const fallbackPlanContent: PlanContent = {
  name: '',
  type: 'other',
  description: '',
  provider: '',
  costPerEmployee: 0,
  employerContribution: 0,
  eligibilityCriteria: '',
  enrollmentOpen: false,
  isActive: true,
};

const fallbackEnrollmentContent: EnrollmentContent = {
  planId: '',
  planName: '',
  employeeId: '',
  employeeName: '',
  enrollmentDate: '',
  coverageLevel: 'individual',
  beneficiary: '',
  contributionAmount: 0,
  status: 'active',
};

const fallbackClaimContent: ClaimContent = {
  enrollmentId: '',
  employeeId: '',
  employeeName: '',
  amount: 0,
  date: '',
  description: '',
  type: 'other',
  status: 'pending',
  notes: '',
};

function parsePlanContent(raw: string): PlanContent {
  if (!raw) return fallbackPlanContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      type: (parsed.type as BenefitPlanType) ?? 'other',
      description: parsed.description ?? '',
      provider: parsed.provider ?? '',
      costPerEmployee: Number(parsed.costPerEmployee) || 0,
      employerContribution: Number(parsed.employerContribution) || 0,
      eligibilityCriteria: parsed.eligibilityCriteria ?? '',
      enrollmentOpen: Boolean(parsed.enrollmentOpen),
      isActive: parsed.isActive !== undefined ? Boolean(parsed.isActive) : true,
    };
  } catch {
    return fallbackPlanContent;
  }
}

function parseEnrollmentContent(raw: string): EnrollmentContent {
  if (!raw) return fallbackEnrollmentContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      planId: parsed.planId ?? '',
      planName: parsed.planName ?? '',
      employeeId: parsed.employeeId ?? '',
      employeeName: parsed.employeeName ?? '',
      enrollmentDate: parsed.enrollmentDate ?? '',
      coverageLevel: (parsed.coverageLevel as CoverageLevel) ?? 'individual',
      beneficiary: parsed.beneficiary ?? '',
      contributionAmount: Number(parsed.contributionAmount) || 0,
      status: (parsed.status as EnrollmentStatus) ?? 'active',
    };
  } catch {
    return fallbackEnrollmentContent;
  }
}

function parseClaimContent(raw: string): ClaimContent {
  if (!raw) return fallbackClaimContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      enrollmentId: parsed.enrollmentId ?? '',
      employeeId: parsed.employeeId ?? '',
      employeeName: parsed.employeeName ?? '',
      amount: Number(parsed.amount) || 0,
      date: parsed.date ?? '',
      description: parsed.description ?? '',
      type: (parsed.type as ClaimType) ?? 'other',
      status: (parsed.status as ClaimStatus) ?? 'pending',
      notes: parsed.notes ?? '',
    };
  } catch {
    return fallbackClaimContent;
  }
}

function toPlan(row: MemoryRow): BenefitPlan {
  const content = parsePlanContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    type: content.type,
    description: content.description,
    provider: content.provider,
    costPerEmployee: content.costPerEmployee,
    employerContribution: content.employerContribution,
    eligibilityCriteria: content.eligibilityCriteria,
    enrollmentOpen: content.enrollmentOpen,
    isActive: content.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toEnrollment(row: MemoryRow): BenefitEnrollment {
  const content = parseEnrollmentContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    planId: content.planId,
    planName: content.planName,
    employeeId: content.employeeId,
    employeeName: content.employeeName,
    enrollmentDate: content.enrollmentDate,
    coverageLevel: content.coverageLevel,
    beneficiary: content.beneficiary,
    contributionAmount: content.contributionAmount,
    status: content.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toClaim(row: MemoryRow): BenefitClaim {
  const content = parseClaimContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    enrollmentId: content.enrollmentId,
    employeeId: content.employeeId,
    employeeName: content.employeeName,
    amount: content.amount,
    date: content.date,
    description: content.description,
    type: content.type,
    status: content.status,
    notes: content.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Benefits Service ──

export const BenefitsService = {
  /**
   * Create a benefit plan. Stored as a Memory with type='benefits_plan'.
   */
  async createPlan(
    organizationId: string,
    workspaceId: string,
    input: CreatePlanInput,
    createdBy: string,
  ): Promise<BenefitPlan> {
    const content: PlanContent = {
      name: input.name,
      type: input.type,
      description: input.description ?? '',
      provider: input.provider ?? '',
      costPerEmployee: input.costPerEmployee ?? 0,
      employerContribution: input.employerContribution ?? 0,
      eligibilityCriteria: input.eligibilityCriteria ?? '',
      enrollmentOpen: input.enrollmentOpen ?? false,
      isActive: input.isActive ?? true,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'benefits_plan',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['benefits_plan', input.type]),
        createdBy,
      },
    });

    return toPlan(row as MemoryRow);
  },

  /**
   * Get a single benefit plan by ID.
   */
  async getPlan(id: string): Promise<BenefitPlan | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  /**
   * List benefit plans for an organization with optional filters.
   */
  async listPlans(
    organizationId: string,
    opts: ListPlansOpts = {},
  ): Promise<BenefitPlan[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'benefits_plan',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let plans = rows.map((r) => toPlan(r as MemoryRow));

    if (opts.type) {
      plans = plans.filter((p) => p.type === opts.type);
    }
    if (opts.isActive !== undefined) {
      plans = plans.filter((p) => p.isActive === opts.isActive);
    }

    return plans;
  },

  /**
   * Update a benefit plan.
   */
  async updatePlan(id: string, input: UpdatePlanInput): Promise<BenefitPlan | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parsePlanContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.type !== undefined) content.type = input.type;
    if (input.description !== undefined) content.description = input.description;
    if (input.provider !== undefined) content.provider = input.provider;
    if (input.costPerEmployee !== undefined) content.costPerEmployee = input.costPerEmployee;
    if (input.employerContribution !== undefined) content.employerContribution = input.employerContribution;
    if (input.eligibilityCriteria !== undefined) content.eligibilityCriteria = input.eligibilityCriteria;
    if (input.enrollmentOpen !== undefined) content.enrollmentOpen = input.enrollmentOpen;
    if (input.isActive !== undefined) content.isActive = input.isActive;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['benefits_plan', content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  /**
   * Delete a benefit plan.
   */
  async deletePlan(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Enroll an employee in a benefit plan.
   */
  async enrollEmployee(
    organizationId: string,
    workspaceId: string,
    input: EnrollEmployeeInput,
    createdBy: string,
  ): Promise<BenefitEnrollment> {
    // Look up plan name
    const plan = await safePrisma(
      () => prisma.memory.findUnique({ where: { id: input.planId } }),
      null,
    );
    const planName = plan ? parsePlanContent((plan as MemoryRow).content).name : '';

    const content: EnrollmentContent = {
      planId: input.planId,
      planName,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      enrollmentDate: input.enrollmentDate ?? new Date().toISOString(),
      coverageLevel: input.coverageLevel ?? 'individual',
      beneficiary: input.beneficiary ?? '',
      contributionAmount: input.contributionAmount ?? 0,
      status: 'active',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'benefits_enrollment',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.planId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['benefits_enrollment', 'active']),
        createdBy,
      },
    });

    return toEnrollment(row as MemoryRow);
  },

  /**
   * Get a single enrollment by ID.
   */
  async getEnrollment(id: string): Promise<BenefitEnrollment | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toEnrollment(row as MemoryRow);
  },

  /**
   * List enrollments for an organization with optional filters.
   */
  async listEnrollments(
    organizationId: string,
    opts: ListEnrollmentsOpts = {},
  ): Promise<BenefitEnrollment[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'benefits_enrollment',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let enrollments = rows.map((r) => toEnrollment(r as MemoryRow));

    if (opts.planId) {
      enrollments = enrollments.filter((e) => e.planId === opts.planId);
    }
    if (opts.employeeId) {
      enrollments = enrollments.filter((e) => e.employeeId === opts.employeeId);
    }

    return enrollments;
  },

  /**
   * Cancel an enrollment (status → cancelled).
   */
  async cancelEnrollment(id: string): Promise<BenefitEnrollment | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseEnrollmentContent(existing.content);
    content.status = 'cancelled';
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['benefits_enrollment', 'cancelled']),
          },
        }),
      null,
    );
    if (!row) return null;
    return toEnrollment(row as MemoryRow);
  },

  /**
   * Create a benefits claim.
   */
  async createClaim(
    organizationId: string,
    workspaceId: string,
    input: CreateClaimInput,
    createdBy: string,
  ): Promise<BenefitClaim> {
    const content: ClaimContent = {
      enrollmentId: input.enrollmentId,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      amount: input.amount,
      date: input.date,
      description: input.description ?? '',
      type: input.type ?? 'other',
      status: input.status ?? 'pending',
      notes: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'benefits_claim',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.enrollmentId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['benefits_claim', content.status]),
        createdBy,
      },
    });

    return toClaim(row as MemoryRow);
  },

  /**
   * Get a single claim by ID.
   */
  async getClaim(id: string): Promise<BenefitClaim | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toClaim(row as MemoryRow);
  },

  /**
   * List claims for an organization with optional filters.
   */
  async listClaims(
    organizationId: string,
    opts: ListClaimsOpts = {},
  ): Promise<BenefitClaim[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'benefits_claim',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let claims = rows.map((r) => toClaim(r as MemoryRow));

    if (opts.status) {
      claims = claims.filter((c) => c.status === opts.status);
    }
    if (opts.employeeId) {
      claims = claims.filter((c) => c.employeeId === opts.employeeId);
    }
    if (opts.enrollmentId) {
      claims = claims.filter((c) => c.enrollmentId === opts.enrollmentId);
    }

    return claims;
  },

  /**
   * Update a claim's status.
   */
  async updateClaimStatus(
    id: string,
    status: ClaimStatus,
    notes?: string,
  ): Promise<BenefitClaim | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseClaimContent(existing.content);
    content.status = status;
    if (notes !== undefined) content.notes = notes;
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['benefits_claim', status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toClaim(row as MemoryRow);
  },

  /**
   * Check eligibility of an employee for a plan based on plan criteria.
   */
  async getEligibility(
    planId: string,
    employeeId: string,
  ): Promise<EligibilityResult> {
    const plan = await safePrisma(
      () => prisma.memory.findUnique({ where: { id: planId } }),
      null,
    );
    if (!plan) {
      return { eligible: false, reasons: ['plan_not_found'] };
    }
    const planData = parsePlanContent((plan as MemoryRow).content);

    const reasons: string[] = [];
    if (!planData.isActive) {
      reasons.push('plan_inactive');
    }
    if (!planData.enrollmentOpen) {
      reasons.push('enrollment_closed');
    }

    // Check for existing active enrollment
    const existing = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: {
            type: 'benefits_enrollment',
            sourceId: planId,
          },
        }),
      null,
    );
    if (existing) {
      const enrollment = parseEnrollmentContent((existing as MemoryRow).content);
      if (enrollment.employeeId === employeeId && enrollment.status === 'active') {
        reasons.push('already_enrolled');
      }
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  },

  /**
   * Get cost analysis: total cost, cost per plan, cost per employee.
   */
  async getCostAnalysis(organizationId: string): Promise<CostAnalysis> {
    const [plans, enrollments] = await Promise.all([
      BenefitsService.listPlans(organizationId),
      BenefitsService.listEnrollments(organizationId),
    ]);

    const costPerPlan: Record<string, number> = {};
    const costPerEmployee: Record<string, number> = {};
    let totalCost = 0;

    for (const enrollment of enrollments) {
      if (enrollment.status !== 'active') continue;
      const plan = plans.find((p) => p.id === enrollment.planId);
      const cost = plan ? plan.employerContribution + enrollment.contributionAmount : enrollment.contributionAmount;
      costPerPlan[enrollment.planId] = (costPerPlan[enrollment.planId] || 0) + cost;
      costPerEmployee[enrollment.employeeId] = (costPerEmployee[enrollment.employeeId] || 0) + cost;
      totalCost += cost;
    }

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      costPerPlan,
      costPerEmployee,
    };
  },

  /**
   * Get stats for an organization.
   */
  async getStats(organizationId: string): Promise<BenefitsStats> {
    const [plans, enrollments, claims] = await Promise.all([
      BenefitsService.listPlans(organizationId),
      BenefitsService.listEnrollments(organizationId),
      BenefitsService.listClaims(organizationId),
    ]);

    const costAnalysis = await BenefitsService.getCostAnalysis(organizationId);

    return {
      planCount: plans.length,
      enrollmentCount: enrollments.length,
      claimCount: claims.length,
      totalCost: costAnalysis.totalCost,
    };
  },
};
