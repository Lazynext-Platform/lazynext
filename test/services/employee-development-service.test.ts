import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type FindFirstArgs = { where: Record<string, unknown>; orderBy?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _count: boolean };
type AggregateArgs = { where: Record<string, unknown>; _avg: Record<string, boolean> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// TrainingPlan
let tpFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let tpFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let tpCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let tpUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let tpDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let tpCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let tpGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];
let tpAggregateImpl: (args: AggregateArgs) => Promise<unknown> = async () => ({ _avg: { progress: null } });

// Certification
let certFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let certFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let certCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let certUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let certDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let certCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

// Memory
let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindFirstImpl: (args: FindFirstArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  trainingPlan: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'trainingPlan.findMany', args }); return tpFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'trainingPlan.findUnique', args }); return tpFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'trainingPlan.create', args }); return tpCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'trainingPlan.update', args }); return tpUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'trainingPlan.delete', args }); return tpDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'trainingPlan.count', args }); return tpCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'trainingPlan.groupBy', args }); return tpGroupByImpl(args); },
    aggregate: (args: AggregateArgs): Promise<unknown> => { calls.push({ method: 'trainingPlan.aggregate', args }); return tpAggregateImpl(args); },
  },
  certification: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'certification.findMany', args }); return certFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'certification.findUnique', args }); return certFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'certification.create', args }); return certCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'certification.update', args }); return certUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'certification.delete', args }); return certDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'certification.count', args }); return certCountImpl(args); },
  },
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findFirst: (args: FindFirstArgs): Promise<unknown> => { calls.push({ method: 'memory.findFirst', args }); return memFindFirstImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
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
  tpFindManyImpl = async () => [];
  tpFindUniqueImpl = async () => null;
  tpCreateImpl = async () => ({});
  tpUpdateImpl = async () => ({});
  tpDeleteImpl = async () => ({});
  tpCountImpl = async () => 0;
  tpGroupByImpl = async () => [];
  tpAggregateImpl = async () => ({ _avg: { progress: null } });
  certFindManyImpl = async () => [];
  certFindUniqueImpl = async () => null;
  certCreateImpl = async () => ({});
  certUpdateImpl = async () => ({});
  certDeleteImpl = async () => ({});
  certCountImpl = async () => 0;
  memFindManyImpl = async () => [];
  memFindFirstImpl = async () => null;
  memCreateImpl = async () => ({});
}

const { EmployeeDevelopmentService } = await import('@/lib/services/employee-development-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('EmployeeDevelopmentService', () => {
  beforeEach(() => resetMock());

  // ── Training Plans ──

  describe('createTrainingPlan', () => {
    it('creates a training plan with defaults', async () => {
      tpCreateImpl = async (args: CreateArgs) => ({ id: 'tp1', ...args.data });
      const result = await EmployeeDevelopmentService.createTrainingPlan('org-1', {
        employeeId: 'emp1',
        title: 'Leadership Training',
        startDate: new Date('2025-01-01'),
      });
      assert.ok(result);
      const args = calls[0].args as CreateArgs;
      assert.equal(args.data.organizationId, 'org-1');
      assert.equal(args.data.employeeId, 'emp1');
      assert.equal(args.data.title, 'Leadership Training');
      assert.equal(args.data.status, 'active');
      assert.equal(args.data.progress, 0);
      assert.equal(args.data.trainer, null);
    });

    it('clamps progress to 0-100', async () => {
      tpCreateImpl = async (args: CreateArgs) => ({ id: 'tp1', ...args.data });
      await EmployeeDevelopmentService.createTrainingPlan('org-1', {
        employeeId: 'emp1',
        title: 'Test',
        startDate: new Date(),
        progress: 150,
      });
      const args = calls[0].args as CreateArgs;
      assert.equal(args.data.progress, 100);
    });

    it('clamps negative progress to 0', async () => {
      tpCreateImpl = async (args: CreateArgs) => ({ id: 'tp1', ...args.data });
      await EmployeeDevelopmentService.createTrainingPlan('org-1', {
        employeeId: 'emp1',
        title: 'Test',
        startDate: new Date(),
        progress: -10,
      });
      const args = calls[0].args as CreateArgs;
      assert.equal(args.data.progress, 0);
    });
  });

  describe('getTrainingPlan', () => {
    it('returns the training plan when found', async () => {
      tpFindUniqueImpl = async () => ({ id: 'tp1', title: 'Test' });
      const result = await EmployeeDevelopmentService.getTrainingPlan('tp1');
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'tp1');
    });

    it('returns null when not found', async () => {
      tpFindUniqueImpl = async () => null;
      const result = await EmployeeDevelopmentService.getTrainingPlan('missing');
      assert.equal(result, null);
    });

    it('returns null on error', async () => {
      tpFindUniqueImpl = async () => { throw new Error('DB down'); };
      const result = await EmployeeDevelopmentService.getTrainingPlan('tp1');
      assert.equal(result, null);
    });
  });

  describe('listTrainingPlans', () => {
    it('lists plans for an organization', async () => {
      tpFindManyImpl = async () => [{ id: 'tp1' }, { id: 'tp2' }];
      const result = await EmployeeDevelopmentService.listTrainingPlans('org-1');
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('filters by employeeId', async () => {
      tpFindManyImpl = async () => [{ id: 'tp1' }];
      const result = await EmployeeDevelopmentService.listTrainingPlans('org-1', { employeeId: 'emp1' });
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.employeeId, 'emp1');
    });

    it('filters by status', async () => {
      tpFindManyImpl = async () => [];
      await EmployeeDevelopmentService.listTrainingPlans('org-1', { status: 'completed' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'completed');
    });

    it('returns empty array on error', async () => {
      tpFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await EmployeeDevelopmentService.listTrainingPlans('org-1');
      assert.equal(result.length, 0);
    });
  });

  describe('updateTrainingPlan', () => {
    it('updates only provided fields', async () => {
      tpUpdateImpl = async (args: UpdateArgs) => ({ id: 'tp1', ...args.data });
      const result = await EmployeeDevelopmentService.updateTrainingPlan('tp1', { title: 'Updated', progress: 50 });
      assert.ok(result);
      const args = calls[0].args as UpdateArgs;
      assert.equal(args.data.title, 'Updated');
      assert.equal(args.data.progress, 50);
      assert.equal(args.data.status, undefined);
    });
  });

  describe('deleteTrainingPlan', () => {
    it('deletes a training plan', async () => {
      tpDeleteImpl = async () => ({ id: 'tp1' });
      const result = await EmployeeDevelopmentService.deleteTrainingPlan('tp1');
      assert.ok(result);
    });
  });

  describe('updateTrainingProgress', () => {
    it('updates progress and clamps to 0-100', async () => {
      tpUpdateImpl = async (args: UpdateArgs) => ({ id: 'tp1', ...args.data });
      await EmployeeDevelopmentService.updateTrainingProgress('tp1', 200);
      const args = calls[0].args as UpdateArgs;
      assert.equal(args.data.progress, 100);
    });
  });

  describe('completeTrainingPlan', () => {
    it('marks as completed with progress 100', async () => {
      tpUpdateImpl = async (args: UpdateArgs) => ({ id: 'tp1', ...args.data });
      const result = await EmployeeDevelopmentService.completeTrainingPlan('tp1');
      assert.ok(result);
      const args = calls[0].args as UpdateArgs;
      assert.equal(args.data.status, 'completed');
      assert.equal(args.data.progress, 100);
      assert.ok(args.data.endDate instanceof Date);
    });
  });

  describe('getTrainingPlansByEmployee', () => {
    it('returns plans for an employee', async () => {
      tpFindManyImpl = async () => [{ id: 'tp1' }];
      const result = await EmployeeDevelopmentService.getTrainingPlansByEmployee('emp1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.employeeId, 'emp1');
    });
  });

  // ── Certifications ──

  describe('createCertification', () => {
    it('creates a certification with defaults', async () => {
      certCreateImpl = async (args: CreateArgs) => ({ id: 'c1', ...args.data });
      const result = await EmployeeDevelopmentService.createCertification('org-1', {
        employeeId: 'emp1',
        name: 'AWS Certified',
        issuer: 'Amazon',
        issueDate: new Date('2025-01-01'),
      });
      assert.ok(result);
      const args = calls[0].args as CreateArgs;
      assert.equal(args.data.organizationId, 'org-1');
      assert.equal(args.data.name, 'AWS Certified');
      assert.equal(args.data.status, 'active');
      assert.equal(args.data.expiryDate, null);
    });
  });

  describe('getCertification', () => {
    it('returns certification when found', async () => {
      certFindUniqueImpl = async () => ({ id: 'c1' });
      const result = await EmployeeDevelopmentService.getCertification('c1');
      assert.ok(result);
    });

    it('returns null when not found', async () => {
      certFindUniqueImpl = async () => null;
      const result = await EmployeeDevelopmentService.getCertification('missing');
      assert.equal(result, null);
    });
  });

  describe('listCertifications', () => {
    it('lists certifications for an organization', async () => {
      certFindManyImpl = async () => [{ id: 'c1' }, { id: 'c2' }];
      const result = await EmployeeDevelopmentService.listCertifications('org-1');
      assert.equal(result.length, 2);
    });

    it('filters by employeeId and status', async () => {
      certFindManyImpl = async () => [];
      await EmployeeDevelopmentService.listCertifications('org-1', { employeeId: 'emp1', status: 'active' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.employeeId, 'emp1');
      assert.equal(args.where.status, 'active');
    });
  });

  describe('updateCertification', () => {
    it('updates provided fields', async () => {
      certUpdateImpl = async (args: UpdateArgs) => ({ id: 'c1', ...args.data });
      await EmployeeDevelopmentService.updateCertification('c1', { status: 'expired' });
      const args = calls[0].args as UpdateArgs;
      assert.equal(args.data.status, 'expired');
    });
  });

  describe('deleteCertification', () => {
    it('deletes a certification', async () => {
      certDeleteImpl = async () => ({ id: 'c1' });
      const result = await EmployeeDevelopmentService.deleteCertification('c1');
      assert.ok(result);
    });
  });

  describe('getExpiringCertifications', () => {
    it('returns certifications expiring within the horizon', async () => {
      certFindManyImpl = async () => [{ id: 'c1', name: 'Expiring Cert' }];
      const result = await EmployeeDevelopmentService.getExpiringCertifications('org-1', 30);
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.equal(args.where.status, 'active');
    });

    it('returns empty array on error', async () => {
      certFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await EmployeeDevelopmentService.getExpiringCertifications('org-1');
      assert.equal(result.length, 0);
    });
  });

  // ── Skills Matrix ──

  describe('getSkillsMatrix', () => {
    it('returns skills grouped by skill name', async () => {
      memFindManyImpl = async () => [
        { id: 'm1', content: JSON.stringify({ skillName: 'TypeScript', proficiency: 4, certified: true, yearsExperience: 5 }), owner: 'emp1' },
        { id: 'm2', content: JSON.stringify({ skillName: 'TypeScript', proficiency: 3, certified: false, yearsExperience: 2 }), owner: 'emp2' },
        { id: 'm3', content: JSON.stringify({ skillName: 'Python', proficiency: 5, certified: true, yearsExperience: 8 }), owner: 'emp1' },
      ];
      const result = await EmployeeDevelopmentService.getSkillsMatrix('org-1');
      assert.equal(result.skills.length, 3);
      assert.ok(result.bySkill.TypeScript);
      assert.equal(result.bySkill.TypeScript.length, 2);
      assert.equal(result.bySkill.Python.length, 1);
    });

    it('handles invalid JSON gracefully', async () => {
      memFindManyImpl = async () => [
        { id: 'm1', content: 'invalid json', owner: 'emp1' },
      ];
      const result = await EmployeeDevelopmentService.getSkillsMatrix('org-1');
      assert.equal(result.skills.length, 1);
      assert.equal(result.skills[0].skillName, '');
      assert.equal(result.skills[0].proficiency, 1);
    });

    it('returns empty on error', async () => {
      memFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await EmployeeDevelopmentService.getSkillsMatrix('org-1');
      assert.equal(result.skills.length, 0);
    });
  });

  describe('addSkill', () => {
    it('creates a memory record with skill data', async () => {
      memCreateImpl = async (args: CreateArgs) => ({ id: 'm1', ...args.data });
      const result = await EmployeeDevelopmentService.addSkill('org-1', 'ws-1', {
        employeeId: 'emp1',
        skillName: 'React',
        proficiency: 4,
      }, 'user1');
      assert.ok(result);
      const args = calls[0].args as CreateArgs;
      assert.equal(args.data.type, 'employee_skill');
      assert.equal(args.data.organizationId, 'org-1');
      assert.equal(args.data.owner, 'emp1');
      const content = JSON.parse(args.data.content as string);
      assert.equal(content.skillName, 'React');
      assert.equal(content.proficiency, 4);
    });

    it('clamps proficiency to 1-5', async () => {
      memCreateImpl = async () => ({ id: 'm1' });
      await EmployeeDevelopmentService.addSkill('org-1', 'ws-1', {
        employeeId: 'emp1',
        skillName: 'Test',
        proficiency: 10,
      }, 'user1');
      const args = calls[0].args as CreateArgs;
      const content = JSON.parse(args.data.content as string);
      assert.equal(content.proficiency, 5);
    });
  });

  // ── Career Path ──

  describe('getCareerPath', () => {
    it('returns career path when found', async () => {
      memFindFirstImpl = async () => ({
        id: 'm1',
        content: JSON.stringify({
          currentRole: 'Junior Dev',
          targetRole: 'Senior Dev',
          timeline: '2 years',
          milestones: [{ title: 'Lead a project', description: '', targetDate: '2025-06' }],
          developmentGoals: ['Learn system design'],
          mentorId: 'mentor1',
        }),
      });
      const result = await EmployeeDevelopmentService.getCareerPath('emp1');
      assert.ok(result);
      assert.equal(result.currentRole, 'Junior Dev');
      assert.equal(result.targetRole, 'Senior Dev');
      assert.equal(result.milestones.length, 1);
      assert.equal(result.developmentGoals[0], 'Learn system design');
      assert.equal(result.mentorId, 'mentor1');
    });

    it('returns null when not found', async () => {
      memFindFirstImpl = async () => null;
      const result = await EmployeeDevelopmentService.getCareerPath('emp1');
      assert.equal(result, null);
    });

    it('handles invalid JSON gracefully', async () => {
      memFindFirstImpl = async () => ({ id: 'm1', content: 'invalid' });
      const result = await EmployeeDevelopmentService.getCareerPath('emp1');
      assert.ok(result);
      assert.equal(result.currentRole, '');
      assert.equal(result.milestones.length, 0);
    });
  });

  describe('setCareerPath', () => {
    it('creates a memory record with career path data', async () => {
      memCreateImpl = async (args: CreateArgs) => ({ id: 'm1', ...args.data });
      const result = await EmployeeDevelopmentService.setCareerPath('emp1', 'org-1', 'ws-1', {
        currentRole: 'Dev',
        targetRole: 'Architect',
        timeline: '3 years',
        milestones: [{ title: 'M1', description: 'First milestone' }],
        developmentGoals: ['Goal1', 'Goal2'],
      }, 'user1');
      assert.ok(result);
      const args = calls[0].args as CreateArgs;
      assert.equal(args.data.type, 'career_path');
      assert.equal(args.data.owner, 'emp1');
      const content = JSON.parse(args.data.content as string);
      assert.equal(content.currentRole, 'Dev');
      assert.equal(content.targetRole, 'Architect');
      assert.equal(content.milestones.length, 1);
      assert.equal(content.developmentGoals.length, 2);
    });
  });

  // ── Stats ──

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      tpCountImpl = async () => 10;
      tpGroupByImpl = async () => [{ status: 'active', _count: 7 }, { status: 'completed', _count: 3 }];
      certCountImpl = async (args: CountArgs) => {
        const where = args.where as Record<string, unknown>;
        if (where.status === 'active') {
          // Check if it has expiryDate filter (expiring certs)
          if (where.expiryDate) return 2;
          return 5;
        }
        return 8;
      };
      tpAggregateImpl = async () => ({ _avg: { progress: 65.5 } });

      const result = await EmployeeDevelopmentService.getStats('org-1');
      assert.equal(result.totalTrainingPlans, 10);
      assert.equal(result.trainingByStatus.active, 7);
      assert.equal(result.trainingByStatus.completed, 3);
      assert.equal(result.totalCertifications, 8);
      assert.equal(result.activeCerts, 5);
      assert.equal(result.expiringCerts, 2);
      assert.equal(result.avgTrainingProgress, 66);
    });

    it('handles null average progress', async () => {
      tpCountImpl = async () => 0;
      tpGroupByImpl = async () => [];
      certCountImpl = async () => 0;
      tpAggregateImpl = async () => ({ _avg: { progress: null } });

      const result = await EmployeeDevelopmentService.getStats('org-1');
      assert.equal(result.avgTrainingProgress, 0);
      assert.equal(result.totalTrainingPlans, 0);
    });
  });
});
