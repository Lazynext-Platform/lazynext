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
    type: 'training_course',
    content: JSON.stringify({
      name: 'Safety Orientation Course',
      type: 'safety_orientation',
      description: 'Basic safety orientation',
      status: 'draft',
      duration: '4 hours',
      format: 'classroom',
      provider: 'Safety Training Inc',
      certification: 'Safety Cert',
      validityPeriod: '1 year',
      prerequisites: 'None',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['training_course', 'safety_orientation', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeEnrollmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-enr1',
    type: 'training_enrollment',
    content: JSON.stringify({
      name: 'Orientation Enrollment',
      type: 'initial',
      description: 'Initial enrollment',
      status: 'enrolled',
      courseId: 'mem-1',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      enrollmentDate: '2028-01-15',
      completionDate: null,
      score: 0,
      notes: '',
    }),
    tags: JSON.stringify(['training_enrollment', 'initial', 'enrolled']),
    ...overrides,
  });
}

function makeCertificationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-cert1',
    type: 'certification_record',
    content: JSON.stringify({
      name: 'OSHA Certification',
      type: 'osha',
      description: 'OSHA 30 certification',
      status: 'active',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      certificationNumber: 'OSHA-001',
      issuedBy: 'OSHA',
      issueDate: '2028-01-01',
      expiryDate: '2030-01-01',
      score: 95,
      notes: '',
    }),
    tags: JSON.stringify(['certification_record', 'osha', 'active']),
    ...overrides,
  });
}

function makeComplianceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-comp1',
    type: 'training_compliance',
    content: JSON.stringify({
      name: 'Mandatory Training Compliance',
      type: 'mandatory',
      description: 'Mandatory training requirement',
      status: 'pending',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      courseId: 'mem-1',
      requiredDate: '2028-03-01',
      completedDate: null,
      complianceScore: 0,
      notes: '',
    }),
    tags: JSON.stringify(['training_compliance', 'mandatory', 'pending']),
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

const { SafetyTrainingService } = await import('@/lib/services/safety-training-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Training Courses
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyTrainingService — Training Courses', () => {
  beforeEach(() => resetMock());

  it('creates a training course with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await SafetyTrainingService.createTrainingCourse('org-1', 'ws-1', {
      name: 'PPE Training', type: 'ppe',
    }, 'user-1');
    assert.equal(c.name, 'PPE Training');
    assert.equal(c.status, 'draft');
    assert.equal(c.duration, '');
  });

  it('creates a training course with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await SafetyTrainingService.createTrainingCourse('org-1', 'ws-1', {
      name: 'Forklift Training', type: 'forklift', description: 'Forklift operator training',
      status: 'active', duration: '8 hours', format: 'hands_on',
      provider: 'Forklift Academy', certification: 'Forklift Cert',
      validityPeriod: '3 years', prerequisites: 'Safety orientation', notes: 'Annual refresher',
    }, 'user-1');
    assert.equal(c.name, 'Forklift Training');
    assert.equal(c.type, 'forklift');
    assert.equal(c.duration, '8 hours');
    assert.equal(c.provider, 'Forklift Academy');
  });

  it('gets a training course by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const c = await SafetyTrainingService.getTrainingCourse('mem-1');
    assert.ok(c);
    assert.equal(c!.id, 'mem-1');
    assert.equal(c!.name, 'Safety Orientation Course');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'training_enrollment' });
    const c = await SafetyTrainingService.getTrainingCourse('mem-1');
    assert.equal(c, null);
  });

  it('returns null when training course not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await SafetyTrainingService.getTrainingCourse('nope');
    assert.equal(c, null);
  });

  it('lists training courses by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'training_course') return [makeRow()];
      return [];
    };
    const list = await SafetyTrainingService.listTrainingCourses('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Safety Orientation Course');
  });

  it('updates a training course', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await SafetyTrainingService.updateTrainingCourse('mem-1', { status: 'active' });
    assert.ok(c);
    assert.equal(c!.status, 'active');
  });

  it('deletes a training course', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await SafetyTrainingService.deleteTrainingCourse('mem-1');
    assert.equal(ok, true);
  });

  it('activateTrainingCourse sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await SafetyTrainingService.activateTrainingCourse('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'active');
  });

  it('deprecateTrainingCourse sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await SafetyTrainingService.deprecateTrainingCourse('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'deprecated');
  });

  it('archiveTrainingCourse sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await SafetyTrainingService.archiveTrainingCourse('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Training Enrollments
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyTrainingService — Training Enrollments', () => {
  beforeEach(() => resetMock());

  it('creates a training enrollment with defaults', async () => {
    memCreateImpl = async (args) => makeEnrollmentRow({ content: args.data.content as string });
    const e = await SafetyTrainingService.createTrainingEnrollment('org-1', 'ws-1', {
      name: 'Refresher Enrollment', type: 'refresher',
    }, 'user-1');
    assert.equal(e.name, 'Refresher Enrollment');
    assert.equal(e.status, 'enrolled');
    assert.equal(e.score, 0);
  });

  it('creates a training enrollment with full input', async () => {
    memCreateImpl = async (args) => makeEnrollmentRow({ content: args.data.content as string });
    const e = await SafetyTrainingService.createTrainingEnrollment('org-1', 'ws-1', {
      name: 'Mandatory Enrollment', type: 'mandatory', description: 'Mandatory training',
      status: 'completed', courseId: 'mem-1', employeeId: 'emp-2', employeeName: 'Jane Smith',
      enrollmentDate: '2028-02-01', completionDate: '2028-02-15', score: 88, notes: 'Passed',
    }, 'user-1');
    assert.equal(e.name, 'Mandatory Enrollment');
    assert.equal(e.type, 'mandatory');
    assert.equal(e.employeeName, 'Jane Smith');
    assert.equal(e.score, 88);
  });

  it('gets a training enrollment by id', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    const e = await SafetyTrainingService.getTrainingEnrollment('mem-enr1');
    assert.ok(e);
    assert.equal(e!.name, 'Orientation Enrollment');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow({ type: 'training_course' });
    const e = await SafetyTrainingService.getTrainingEnrollment('mem-enr1');
    assert.equal(e, null);
  });

  it('returns null when training enrollment not found', async () => {
    memFindUniqueImpl = async () => null;
    const e = await SafetyTrainingService.getTrainingEnrollment('nope');
    assert.equal(e, null);
  });

  it('lists training enrollments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'training_enrollment') return [makeEnrollmentRow()];
      return [];
    };
    const list = await SafetyTrainingService.listTrainingEnrollments('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a training enrollment', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-enr1', content: args.data.content as string });
    const e = await SafetyTrainingService.updateTrainingEnrollment('mem-enr1', { status: 'completed' });
    assert.ok(e);
    assert.equal(e!.status, 'completed');
  });

  it('deletes a training enrollment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-enr1' });
    const ok = await SafetyTrainingService.deleteTrainingEnrollment('mem-enr1');
    assert.equal(ok, true);
  });

  it('startEnrollment sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-enr1', content: args.data.content as string });
    const e = await SafetyTrainingService.startEnrollment('mem-enr1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'in_progress');
  });

  it('completeEnrollment sets status to completed', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-enr1', content: args.data.content as string });
    const e = await SafetyTrainingService.completeEnrollment('mem-enr1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'completed');
  });

  it('failEnrollment sets status to failed', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-enr1', content: args.data.content as string });
    const e = await SafetyTrainingService.failEnrollment('mem-enr1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'failed');
  });

  it('cancelEnrollment sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-enr1', content: args.data.content as string });
    const e = await SafetyTrainingService.cancelEnrollment('mem-enr1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'cancelled');
  });

  it('noShowEnrollment sets status to no_show', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-enr1', content: args.data.content as string });
    const e = await SafetyTrainingService.noShowEnrollment('mem-enr1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'no_show');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Certification Records
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyTrainingService — Certification Records', () => {
  beforeEach(() => resetMock());

  it('creates a certification record with defaults', async () => {
    memCreateImpl = async (args) => makeCertificationRow({ content: args.data.content as string });
    const c = await SafetyTrainingService.createCertificationRecord('org-1', 'ws-1', {
      name: 'CPR Cert', type: 'cpr',
    }, 'user-1');
    assert.equal(c.name, 'CPR Cert');
    assert.equal(c.status, 'active');
    assert.equal(c.score, 0);
  });

  it('creates a certification record with full input', async () => {
    memCreateImpl = async (args) => makeCertificationRow({ content: args.data.content as string });
    const c = await SafetyTrainingService.createCertificationRecord('org-1', 'ws-1', {
      name: 'First Aid Cert', type: 'first_aid', description: 'First aid certification',
      status: 'active', employeeId: 'emp-2', employeeName: 'Jane Smith',
      certificationNumber: 'FA-002', issuedBy: 'Red Cross',
      issueDate: '2028-03-01', expiryDate: '2030-03-01', score: 92, notes: 'Valid 2 years',
    }, 'user-1');
    assert.equal(c.name, 'First Aid Cert');
    assert.equal(c.type, 'first_aid');
    assert.equal(c.certificationNumber, 'FA-002');
    assert.equal(c.issuedBy, 'Red Cross');
  });

  it('gets a certification record by id', async () => {
    memFindUniqueImpl = async () => makeCertificationRow();
    const c = await SafetyTrainingService.getCertificationRecord('mem-cert1');
    assert.ok(c);
    assert.equal(c!.name, 'OSHA Certification');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCertificationRow({ type: 'training_course' });
    const c = await SafetyTrainingService.getCertificationRecord('mem-cert1');
    assert.equal(c, null);
  });

  it('returns null when certification record not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await SafetyTrainingService.getCertificationRecord('nope');
    assert.equal(c, null);
  });

  it('lists certification records by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'certification_record') return [makeCertificationRow()];
      return [];
    };
    const list = await SafetyTrainingService.listCertificationRecords('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a certification record', async () => {
    memFindUniqueImpl = async () => makeCertificationRow();
    memUpdateImpl = async (args) => makeCertificationRow({ id: 'mem-cert1', content: args.data.content as string });
    const c = await SafetyTrainingService.updateCertificationRecord('mem-cert1', { status: 'expired' });
    assert.ok(c);
    assert.equal(c!.status, 'expired');
  });

  it('deletes a certification record', async () => {
    memDeleteImpl = async () => ({ id: 'mem-cert1' });
    const ok = await SafetyTrainingService.deleteCertificationRecord('mem-cert1');
    assert.equal(ok, true);
  });

  it('renewCertification sets status to renewed', async () => {
    memFindUniqueImpl = async () => makeCertificationRow();
    memUpdateImpl = async (args) => makeCertificationRow({ id: 'mem-cert1', content: args.data.content as string });
    const c = await SafetyTrainingService.renewCertification('mem-cert1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'renewed');
  });

  it('expireCertification sets status to expired', async () => {
    memFindUniqueImpl = async () => makeCertificationRow();
    memUpdateImpl = async (args) => makeCertificationRow({ id: 'mem-cert1', content: args.data.content as string });
    const c = await SafetyTrainingService.expireCertification('mem-cert1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'expired');
  });

  it('revokeCertification sets status to revoked', async () => {
    memFindUniqueImpl = async () => makeCertificationRow();
    memUpdateImpl = async (args) => makeCertificationRow({ id: 'mem-cert1', content: args.data.content as string });
    const c = await SafetyTrainingService.revokeCertification('mem-cert1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'revoked');
  });

  it('pendingCertification sets status to pending', async () => {
    memFindUniqueImpl = async () => makeCertificationRow();
    memUpdateImpl = async (args) => makeCertificationRow({ id: 'mem-cert1', content: args.data.content as string });
    const c = await SafetyTrainingService.pendingCertification('mem-cert1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'pending');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Training Compliance
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyTrainingService — Training Compliance', () => {
  beforeEach(() => resetMock());

  it('creates a training compliance with defaults', async () => {
    memCreateImpl = async (args) => makeComplianceRow({ content: args.data.content as string });
    const c = await SafetyTrainingService.createTrainingCompliance('org-1', 'ws-1', {
      name: 'Regulatory Compliance', type: 'regulatory',
    }, 'user-1');
    assert.equal(c.name, 'Regulatory Compliance');
    assert.equal(c.status, 'pending');
    assert.equal(c.complianceScore, 0);
  });

  it('creates a training compliance with full input', async () => {
    memCreateImpl = async (args) => makeComplianceRow({ content: args.data.content as string });
    const c = await SafetyTrainingService.createTrainingCompliance('org-1', 'ws-1', {
      name: 'Role-Specific Compliance', type: 'role_specific', description: 'Role-specific training',
      status: 'compliant', employeeId: 'emp-2', employeeName: 'Jane Smith',
      courseId: 'mem-1', requiredDate: '2028-04-01', completedDate: '2028-03-15',
      complianceScore: 100, notes: 'Fully compliant',
    }, 'user-1');
    assert.equal(c.name, 'Role-Specific Compliance');
    assert.equal(c.type, 'role_specific');
    assert.equal(c.complianceScore, 100);
    assert.equal(c.employeeName, 'Jane Smith');
  });

  it('gets a training compliance by id', async () => {
    memFindUniqueImpl = async () => makeComplianceRow();
    const c = await SafetyTrainingService.getTrainingCompliance('mem-comp1');
    assert.ok(c);
    assert.equal(c!.name, 'Mandatory Training Compliance');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeComplianceRow({ type: 'training_course' });
    const c = await SafetyTrainingService.getTrainingCompliance('mem-comp1');
    assert.equal(c, null);
  });

  it('returns null when training compliance not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await SafetyTrainingService.getTrainingCompliance('nope');
    assert.equal(c, null);
  });

  it('lists training compliances by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'training_compliance') return [makeComplianceRow()];
      return [];
    };
    const list = await SafetyTrainingService.listTrainingCompliances('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a training compliance', async () => {
    memFindUniqueImpl = async () => makeComplianceRow();
    memUpdateImpl = async (args) => makeComplianceRow({ id: 'mem-comp1', content: args.data.content as string });
    const c = await SafetyTrainingService.updateTrainingCompliance('mem-comp1', { status: 'compliant' });
    assert.ok(c);
    assert.equal(c!.status, 'compliant');
  });

  it('deletes a training compliance', async () => {
    memDeleteImpl = async () => ({ id: 'mem-comp1' });
    const ok = await SafetyTrainingService.deleteTrainingCompliance('mem-comp1');
    assert.equal(ok, true);
  });

  it('markCompliant sets status to compliant', async () => {
    memFindUniqueImpl = async () => makeComplianceRow();
    memUpdateImpl = async (args) => makeComplianceRow({ id: 'mem-comp1', content: args.data.content as string });
    const c = await SafetyTrainingService.markCompliant('mem-comp1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'compliant');
  });

  it('markNonCompliant sets status to non_compliant', async () => {
    memFindUniqueImpl = async () => makeComplianceRow();
    memUpdateImpl = async (args) => makeComplianceRow({ id: 'mem-comp1', content: args.data.content as string });
    const c = await SafetyTrainingService.markNonCompliant('mem-comp1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'non_compliant');
  });

  it('markOverdueCompliance sets status to overdue', async () => {
    memFindUniqueImpl = async () => makeComplianceRow();
    memUpdateImpl = async (args) => makeComplianceRow({ id: 'mem-comp1', content: args.data.content as string });
    const c = await SafetyTrainingService.markOverdueCompliance('mem-comp1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'overdue');
  });

  it('markExemptCompliance sets status to exempt', async () => {
    memFindUniqueImpl = async () => makeComplianceRow();
    memUpdateImpl = async (args) => makeComplianceRow({ id: 'mem-comp1', content: args.data.content as string });
    const c = await SafetyTrainingService.markExemptCompliance('mem-comp1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'exempt');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyTrainingService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getSafetyTrainingMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'training_course') return [
        makeRow({ content: JSON.stringify({ name: 'C1', type: 'safety_orientation', status: 'active', description: '', duration: '', format: '', provider: '', certification: '', validityPeriod: '', prerequisites: '', notes: '' }) }),
      ];
      if (t === 'training_enrollment') return [
        makeEnrollmentRow({ content: JSON.stringify({ name: 'E1', type: 'initial', status: 'completed', description: '', courseId: '', employeeId: '', employeeName: '', enrollmentDate: null, completionDate: null, score: 0, notes: '' }) }),
      ];
      if (t === 'certification_record') return [
        makeCertificationRow({ content: JSON.stringify({ name: 'Cert1', type: 'osha', status: 'active', description: '', employeeId: '', employeeName: '', certificationNumber: '', issuedBy: '', issueDate: null, expiryDate: null, score: 0, notes: '' }) }),
      ];
      if (t === 'training_compliance') return [
        makeComplianceRow({ content: JSON.stringify({ name: 'Comp1', type: 'mandatory', status: 'compliant', description: '', employeeId: '', employeeName: '', courseId: '', requiredDate: null, completedDate: null, complianceScore: 0, notes: '' }) }),
        makeComplianceRow({ id: 'comp2', content: JSON.stringify({ name: 'Comp2', type: 'mandatory', status: 'overdue', description: '', employeeId: '', employeeName: '', courseId: '', requiredDate: null, completedDate: null, complianceScore: 0, notes: '' }) }),
      ];
      return [];
    };
    const m = await SafetyTrainingService.getSafetyTrainingMetrics('org-1');
    assert.equal(m.activeCourses, 1);
    assert.equal(m.completedEnrollments, 1);
    assert.equal(m.activeCertifications, 1);
    assert.equal(m.compliantEmployees, 1);
    assert.equal(m.overdueCompliance, 1);
  });

  it('getSafetyTrainingStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'training_course') return [makeRow()];
      if (t === 'training_enrollment') return [makeEnrollmentRow()];
      if (t === 'certification_record') return [makeCertificationRow()];
      if (t === 'training_compliance') return [makeComplianceRow()];
      return [];
    };
    const s = await SafetyTrainingService.getSafetyTrainingStats('org-1');
    assert.equal(s.courseCount, 1);
    assert.equal(s.enrollmentCount, 1);
    assert.equal(s.certificationCount, 1);
    assert.equal(s.complianceCount, 1);
    assert.equal(s.byCourseType['safety_orientation'], 1);
    assert.equal(s.byEnrollmentType['initial'], 1);
    assert.equal(s.byCertificationType['osha'], 1);
    assert.equal(s.byComplianceType['mandatory'], 1);
  });
});
