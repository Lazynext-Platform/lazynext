import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: {
    type?: string;
    organizationId?: string;
    workspaceId?: string;
    sourceId?: string;
    createdBy?: string;
    createdAt?: Record<string, unknown>;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
};

type MemoryFindFirstArgs = {
  where: Record<string, unknown>;
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source: string;
    sourceId: string | null;
    confidence: number;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MemoryDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> =
  async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> =
  async () => null;
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> =
  async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> =
  async () => ({});
let memoryDeleteImpl: (args: MemoryDeleteArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    findFirst: (args: MemoryFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: MemoryDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
    count: (args: unknown): Promise<number> => {
      calls.push({ method: 'memory.count', args });
      return Promise.resolve(0);
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
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
}

function makeRow(
  id: string,
  type: string,
  content: Record<string, unknown>,
  overrides: Partial<Record<string, unknown>> = {},
): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type,
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { BenefitsService } =
  await import('@/lib/services/benefits-service');

// ─────────────────────────────────────────────────────────────────────────────
// BenefitsService
// ─────────────────────────────────────────────────────────────────────────────

describe('BenefitsService', () => {
  beforeEach(() => { resetMock(); });

  describe('createPlan', () => {
    it('creates a benefit plan with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'benefits_plan');
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'Health Plan');
        assert.equal(content.type, 'health');
        assert.equal(content.isActive, true);
        assert.equal(content.enrollmentOpen, false);
        return makeRow('plan-1', 'benefits_plan', content);
      };

      const plan = await BenefitsService.createPlan('org-1', 'ws-1', {
        name: 'Health Plan',
        type: 'health',
      }, 'user-1');

      assert.ok(plan);
      assert.equal(plan.id, 'plan-1');
      assert.equal(plan.name, 'Health Plan');
      assert.equal(plan.type, 'health');
      assert.equal(plan.isActive, true);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('stores cost and contribution values', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.costPerEmployee, 500);
        assert.equal(content.employerContribution, 300);
        return makeRow('plan-2', 'benefits_plan', content);
      };

      const plan = await BenefitsService.createPlan('org-1', 'ws-1', {
        name: 'Dental',
        type: 'dental',
        costPerEmployee: 500,
        employerContribution: 300,
      }, 'user-1');

      assert.equal(plan.costPerEmployee, 500);
      assert.equal(plan.employerContribution, 300);
    });
  });

  describe('getPlan', () => {
    it('returns a plan by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('plan-1', 'benefits_plan', {
          name: 'Health', type: 'health', description: '', provider: '',
          costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '',
          enrollmentOpen: true, isActive: true,
        });

      const plan = await BenefitsService.getPlan('plan-1');

      assert.ok(plan);
      assert.equal(plan.id, 'plan-1');
      assert.equal(plan.name, 'Health');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when plan not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const plan = await BenefitsService.getPlan('nope');
      assert.equal(plan, null);
    });
  });

  describe('listPlans', () => {
    it('returns plans for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('plan-1', 'benefits_plan', { name: 'A', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: false, isActive: true }),
        makeRow('plan-2', 'benefits_plan', { name: 'B', type: 'dental', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: false, isActive: true }),
      ];

      const plans = await BenefitsService.listPlans('org-1');

      assert.equal(plans.length, 2);
      assert.equal(plans[0].id, 'plan-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('plan-1', 'benefits_plan', { name: 'A', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: false, isActive: true }),
        makeRow('plan-2', 'benefits_plan', { name: 'B', type: 'dental', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: false, isActive: true }),
      ];

      const plans = await BenefitsService.listPlans('org-1', { type: 'dental' });

      assert.equal(plans.length, 1);
      assert.equal(plans[0].type, 'dental');
    });

    it('filters by isActive', async () => {
      memoryFindManyImpl = async () => [
        makeRow('plan-1', 'benefits_plan', { name: 'A', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: false, isActive: true }),
        makeRow('plan-2', 'benefits_plan', { name: 'B', type: 'dental', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: false, isActive: false }),
      ];

      const plans = await BenefitsService.listPlans('org-1', { isActive: true });

      assert.equal(plans.length, 1);
      assert.equal(plans[0].isActive, true);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };
      const plans = await BenefitsService.listPlans('org-1');
      assert.deepEqual(plans, []);
    });
  });

  describe('updatePlan', () => {
    it('updates plan fields', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('plan-1', 'benefits_plan', { name: 'Old', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: false, isActive: true });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'New Name');
        assert.equal(content.enrollmentOpen, true);
        return makeRow('plan-1', 'benefits_plan', content);
      };

      const plan = await BenefitsService.updatePlan('plan-1', { name: 'New Name', enrollmentOpen: true });

      assert.ok(plan);
      assert.equal(plan.name, 'New Name');
      assert.equal(plan.enrollmentOpen, true);
    });

    it('returns null when plan not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const plan = await BenefitsService.updatePlan('nope', { name: 'X' });
      assert.equal(plan, null);
    });
  });

  describe('deletePlan', () => {
    it('deletes a plan', async () => {
      memoryDeleteImpl = async () => ({ id: 'plan-1' });
      const result = await BenefitsService.deletePlan('plan-1');
      assert.equal(result, true);
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('not found'); };
      const result = await BenefitsService.deletePlan('nope');
      assert.equal(result, false);
    });
  });

  describe('enrollEmployee', () => {
    it('creates an enrollment with plan name lookup', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('plan-1', 'benefits_plan', { name: 'Health Plan', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: false, isActive: true });
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'benefits_enrollment');
        const content = JSON.parse(args.data.content);
        assert.equal(content.planId, 'plan-1');
        assert.equal(content.planName, 'Health Plan');
        assert.equal(content.employeeName, 'Jane Doe');
        assert.equal(content.status, 'active');
        return makeRow('enr-1', 'benefits_enrollment', content, { sourceId: 'plan-1' });
      };

      const enrollment = await BenefitsService.enrollEmployee('org-1', 'ws-1', {
        planId: 'plan-1',
        employeeId: 'emp-1',
        employeeName: 'Jane Doe',
        coverageLevel: 'family',
      }, 'user-1');

      assert.ok(enrollment);
      assert.equal(enrollment.id, 'enr-1');
      assert.equal(enrollment.planName, 'Health Plan');
      assert.equal(enrollment.coverageLevel, 'family');
      assert.equal(enrollment.status, 'active');
    });
  });

  describe('getEnrollment', () => {
    it('returns an enrollment by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('enr-1', 'benefits_enrollment', {
          planId: 'plan-1', planName: 'Health', employeeId: 'emp-1', employeeName: 'Jane',
          enrollmentDate: '2025-01-01', coverageLevel: 'individual', beneficiary: '',
          contributionAmount: 100, status: 'active',
        });

      const enrollment = await BenefitsService.getEnrollment('enr-1');

      assert.ok(enrollment);
      assert.equal(enrollment.id, 'enr-1');
      assert.equal(enrollment.employeeName, 'Jane');
    });

    it('returns null when enrollment not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const enrollment = await BenefitsService.getEnrollment('nope');
      assert.equal(enrollment, null);
    });
  });

  describe('listEnrollments', () => {
    it('returns enrollments for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('enr-1', 'benefits_enrollment', { planId: 'p1', planName: 'A', employeeId: 'e1', employeeName: 'Jane', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 0, status: 'active' }),
        makeRow('enr-2', 'benefits_enrollment', { planId: 'p2', planName: 'B', employeeId: 'e2', employeeName: 'Bob', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 0, status: 'active' }),
      ];

      const enrollments = await BenefitsService.listEnrollments('org-1');

      assert.equal(enrollments.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by planId', async () => {
      memoryFindManyImpl = async () => [
        makeRow('enr-1', 'benefits_enrollment', { planId: 'p1', planName: 'A', employeeId: 'e1', employeeName: 'Jane', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 0, status: 'active' }),
        makeRow('enr-2', 'benefits_enrollment', { planId: 'p2', planName: 'B', employeeId: 'e2', employeeName: 'Bob', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 0, status: 'active' }),
      ];

      const enrollments = await BenefitsService.listEnrollments('org-1', { planId: 'p1' });

      assert.equal(enrollments.length, 1);
      assert.equal(enrollments[0].planId, 'p1');
    });

    it('filters by employeeId', async () => {
      memoryFindManyImpl = async () => [
        makeRow('enr-1', 'benefits_enrollment', { planId: 'p1', planName: 'A', employeeId: 'e1', employeeName: 'Jane', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 0, status: 'active' }),
        makeRow('enr-2', 'benefits_enrollment', { planId: 'p2', planName: 'B', employeeId: 'e2', employeeName: 'Bob', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 0, status: 'active' }),
      ];

      const enrollments = await BenefitsService.listEnrollments('org-1', { employeeId: 'e2' });

      assert.equal(enrollments.length, 1);
      assert.equal(enrollments[0].employeeId, 'e2');
    });
  });

  describe('cancelEnrollment', () => {
    it('cancels an enrollment (status → cancelled)', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('enr-1', 'benefits_enrollment', { planId: 'p1', planName: 'A', employeeId: 'e1', employeeName: 'Jane', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 0, status: 'active' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'cancelled');
        return makeRow('enr-1', 'benefits_enrollment', content);
      };

      const enrollment = await BenefitsService.cancelEnrollment('enr-1');

      assert.ok(enrollment);
      assert.equal(enrollment.status, 'cancelled');
    });

    it('returns null when enrollment not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const enrollment = await BenefitsService.cancelEnrollment('nope');
      assert.equal(enrollment, null);
    });
  });

  describe('createClaim', () => {
    it('creates a claim with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'benefits_claim');
        const content = JSON.parse(args.data.content);
        assert.equal(content.enrollmentId, 'enr-1');
        assert.equal(content.amount, 250);
        assert.equal(content.status, 'pending');
        assert.equal(content.type, 'medical');
        return makeRow('claim-1', 'benefits_claim', content, { sourceId: 'enr-1' });
      };

      const claim = await BenefitsService.createClaim('org-1', 'ws-1', {
        enrollmentId: 'enr-1',
        employeeId: 'emp-1',
        employeeName: 'Jane Doe',
        amount: 250,
        date: '2025-01-15',
        type: 'medical',
      }, 'user-1');

      assert.ok(claim);
      assert.equal(claim.id, 'claim-1');
      assert.equal(claim.amount, 250);
      assert.equal(claim.status, 'pending');
    });
  });

  describe('getClaim', () => {
    it('returns a claim by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('claim-1', 'benefits_claim', {
          enrollmentId: 'enr-1', employeeId: 'emp-1', employeeName: 'Jane',
          amount: 100, date: '2025-01-01', description: '', type: 'medical', status: 'pending', notes: '',
        });

      const claim = await BenefitsService.getClaim('claim-1');

      assert.ok(claim);
      assert.equal(claim.id, 'claim-1');
      assert.equal(claim.amount, 100);
    });

    it('returns null when claim not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const claim = await BenefitsService.getClaim('nope');
      assert.equal(claim, null);
    });
  });

  describe('listClaims', () => {
    it('returns claims for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('claim-1', 'benefits_claim', { enrollmentId: 'e1', employeeId: 'emp-1', employeeName: 'Jane', amount: 100, date: '', description: '', type: 'medical', status: 'pending', notes: '' }),
        makeRow('claim-2', 'benefits_claim', { enrollmentId: 'e2', employeeId: 'emp-2', employeeName: 'Bob', amount: 200, date: '', description: '', type: 'dental', status: 'approved', notes: '' }),
      ];

      const claims = await BenefitsService.listClaims('org-1');

      assert.equal(claims.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('claim-1', 'benefits_claim', { enrollmentId: 'e1', employeeId: 'emp-1', employeeName: 'Jane', amount: 100, date: '', description: '', type: 'medical', status: 'pending', notes: '' }),
        makeRow('claim-2', 'benefits_claim', { enrollmentId: 'e2', employeeId: 'emp-2', employeeName: 'Bob', amount: 200, date: '', description: '', type: 'dental', status: 'approved', notes: '' }),
      ];

      const claims = await BenefitsService.listClaims('org-1', { status: 'approved' });

      assert.equal(claims.length, 1);
      assert.equal(claims[0].status, 'approved');
    });

    it('filters by employeeId', async () => {
      memoryFindManyImpl = async () => [
        makeRow('claim-1', 'benefits_claim', { enrollmentId: 'e1', employeeId: 'emp-1', employeeName: 'Jane', amount: 100, date: '', description: '', type: 'medical', status: 'pending', notes: '' }),
        makeRow('claim-2', 'benefits_claim', { enrollmentId: 'e2', employeeId: 'emp-2', employeeName: 'Bob', amount: 200, date: '', description: '', type: 'dental', status: 'approved', notes: '' }),
      ];

      const claims = await BenefitsService.listClaims('org-1', { employeeId: 'emp-2' });

      assert.equal(claims.length, 1);
      assert.equal(claims[0].employeeId, 'emp-2');
    });
  });

  describe('updateClaimStatus', () => {
    it('updates claim status and notes', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('claim-1', 'benefits_claim', { enrollmentId: 'e1', employeeId: 'emp-1', employeeName: 'Jane', amount: 100, date: '', description: '', type: 'medical', status: 'pending', notes: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'approved');
        assert.equal(content.notes, 'Approved by HR');
        return makeRow('claim-1', 'benefits_claim', content);
      };

      const claim = await BenefitsService.updateClaimStatus('claim-1', 'approved', 'Approved by HR');

      assert.ok(claim);
      assert.equal(claim.status, 'approved');
      assert.equal(claim.notes, 'Approved by HR');
    });

    it('returns null when claim not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const claim = await BenefitsService.updateClaimStatus('nope', 'approved');
      assert.equal(claim, null);
    });
  });

  describe('getEligibility', () => {
    it('returns eligible when plan is active and enrollment open', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('plan-1', 'benefits_plan', { name: 'Health', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: true, isActive: true });
      memoryFindFirstImpl = async () => null;

      const eligibility = await BenefitsService.getEligibility('plan-1', 'emp-1');

      assert.equal(eligibility.eligible, true);
      assert.equal(eligibility.reasons.length, 0);
    });

    it('returns ineligible when plan is inactive', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('plan-1', 'benefits_plan', { name: 'Health', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: true, isActive: false });
      memoryFindFirstImpl = async () => null;

      const eligibility = await BenefitsService.getEligibility('plan-1', 'emp-1');

      assert.equal(eligibility.eligible, false);
      assert.ok(eligibility.reasons.includes('plan_inactive'));
    });

    it('returns ineligible when enrollment is closed', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('plan-1', 'benefits_plan', { name: 'Health', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: false, isActive: true });
      memoryFindFirstImpl = async () => null;

      const eligibility = await BenefitsService.getEligibility('plan-1', 'emp-1');

      assert.equal(eligibility.eligible, false);
      assert.ok(eligibility.reasons.includes('enrollment_closed'));
    });

    it('returns ineligible when already enrolled', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('plan-1', 'benefits_plan', { name: 'Health', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 0, eligibilityCriteria: '', enrollmentOpen: true, isActive: true });
      memoryFindFirstImpl = async () =>
        makeRow('enr-1', 'benefits_enrollment', { planId: 'plan-1', planName: 'Health', employeeId: 'emp-1', employeeName: 'Jane', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 0, status: 'active' }, { sourceId: 'plan-1' });

      const eligibility = await BenefitsService.getEligibility('plan-1', 'emp-1');

      assert.equal(eligibility.eligible, false);
      assert.ok(eligibility.reasons.includes('already_enrolled'));
    });

    it('returns ineligible when plan not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const eligibility = await BenefitsService.getEligibility('nope', 'emp-1');
      assert.equal(eligibility.eligible, false);
      assert.ok(eligibility.reasons.includes('plan_not_found'));
    });
  });

  describe('getCostAnalysis', () => {
    it('computes total cost, cost per plan, and cost per employee', async () => {
      // listPlans
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        if (args.where.type === 'benefits_plan') {
          return [
            makeRow('plan-1', 'benefits_plan', { name: 'Health', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 200, eligibilityCriteria: '', enrollmentOpen: false, isActive: true }),
          ];
        }
        // listEnrollments
        return [
          makeRow('enr-1', 'benefits_enrollment', { planId: 'plan-1', planName: 'Health', employeeId: 'emp-1', employeeName: 'Jane', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 100, status: 'active' }),
          makeRow('enr-2', 'benefits_enrollment', { planId: 'plan-1', planName: 'Health', employeeId: 'emp-2', employeeName: 'Bob', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 50, status: 'active' }),
          makeRow('enr-3', 'benefits_enrollment', { planId: 'plan-1', planName: 'Health', employeeId: 'emp-3', employeeName: 'Tom', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 0, status: 'cancelled' }),
        ];
      };

      const analysis = await BenefitsService.getCostAnalysis('org-1');

      // Jane: 200 (employer) + 100 (contribution) = 300
      // Bob: 200 (employer) + 50 (contribution) = 250
      // Tom: cancelled, excluded
      assert.equal(analysis.totalCost, 550);
      assert.equal(analysis.costPerPlan['plan-1'], 550);
      assert.equal(analysis.costPerEmployee['emp-1'], 300);
      assert.equal(analysis.costPerEmployee['emp-2'], 250);
    });
  });

  describe('getStats', () => {
    it('aggregates benefits stats', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        if (args.where.type === 'benefits_plan') return [makeRow('p1', 'benefits_plan', { name: 'A', type: 'health', description: '', provider: '', costPerEmployee: 0, employerContribution: 100, eligibilityCriteria: '', enrollmentOpen: false, isActive: true })];
        if (args.where.type === 'benefits_enrollment') return [makeRow('e1', 'benefits_enrollment', { planId: 'p1', planName: 'A', employeeId: 'emp-1', employeeName: 'Jane', enrollmentDate: '', coverageLevel: 'individual', beneficiary: '', contributionAmount: 50, status: 'active' })];
        return [makeRow('c1', 'benefits_claim', { enrollmentId: 'e1', employeeId: 'emp-1', employeeName: 'Jane', amount: 75, date: '', description: '', type: 'medical', status: 'pending', notes: '' })];
      };

      const stats = await BenefitsService.getStats('org-1');

      assert.equal(stats.planCount, 1);
      assert.equal(stats.enrollmentCount, 1);
      assert.equal(stats.claimCount, 1);
      assert.equal(stats.totalCost, 150); // 100 employer + 50 contribution
    });

    it('returns zero stats when no data', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await BenefitsService.getStats('org-1');

      assert.equal(stats.planCount, 0);
      assert.equal(stats.enrollmentCount, 0);
      assert.equal(stats.claimCount, 0);
      assert.equal(stats.totalCost, 0);
    });
  });
});
