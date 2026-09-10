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
    type: 'medical_surveillance',
    content: JSON.stringify({
      name: 'Annual Health Surveillance',
      type: 'periodic',
      description: 'Periodic health surveillance',
      status: 'scheduled',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      program: 'Health Program',
      frequency: 'annual',
      lastDate: null,
      nextDate: '2028-01-01',
      results: '',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['medical_surveillance', 'periodic', 'scheduled']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeExamRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-e1',
    type: 'medical_exam',
    content: JSON.stringify({
      name: 'Vision Test',
      type: 'vision',
      description: 'Annual vision exam',
      status: 'scheduled',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      examDate: '2028-02-15',
      provider: 'MedCenter',
      results: '',
      followUp: '',
      notes: '',
    }),
    tags: JSON.stringify(['medical_exam', 'vision', 'scheduled']),
    ...overrides,
  });
}

function makeExposureRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-x1',
    type: 'health_exposure',
    content: JSON.stringify({
      name: 'Chemical Exposure',
      type: 'chemical',
      description: 'Solvent exposure',
      status: 'active',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      source: 'Paint shop',
      level: 'high',
      unit: 'ppm',
      exposureDate: '2028-03-01',
      duration: '4h',
      severity: 'moderate',
      notes: '',
    }),
    tags: JSON.stringify(['health_exposure', 'chemical', 'active']),
    ...overrides,
  });
}

function makeVaccinationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-v1',
    type: 'vaccination_record',
    content: JSON.stringify({
      name: 'COVID-19 Vaccine',
      type: 'covid19',
      description: 'COVID-19 vaccination',
      status: 'scheduled',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      doseNumber: 1,
      administeredDate: null,
      nextDoseDate: '2028-04-01',
      provider: 'Health Clinic',
      batchNumber: 'BATCH-001',
      notes: '',
    }),
    tags: JSON.stringify(['vaccination_record', 'covid19', 'scheduled']),
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

const { OccupationalHealthService } = await import('@/lib/services/occupational-health-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Medical Surveillances
// ─────────────────────────────────────────────────────────────────────────────

describe('OccupationalHealthService — Medical Surveillances', () => {
  beforeEach(() => resetMock());

  it('creates a medical surveillance with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await OccupationalHealthService.createMedicalSurveillance('org-1', 'ws-1', {
      name: 'Pre-Employment Exam', type: 'pre_employment',
    }, 'user-1');
    assert.equal(s.name, 'Pre-Employment Exam');
    assert.equal(s.status, 'scheduled');
    assert.equal(s.employeeName, '');
  });

  it('creates a medical surveillance with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await OccupationalHealthService.createMedicalSurveillance('org-1', 'ws-1', {
      name: 'Exit Exam', type: 'exit', description: 'Exit health check',
      status: 'completed', employeeId: 'emp-2', employeeName: 'Jane Smith',
      program: 'Exit Program', frequency: 'one_time', lastDate: '2028-01-01',
      nextDate: '2028-12-31', results: 'All clear', notes: 'No issues',
    }, 'user-1');
    assert.equal(s.name, 'Exit Exam');
    assert.equal(s.type, 'exit');
    assert.equal(s.employeeName, 'Jane Smith');
    assert.equal(s.frequency, 'one_time');
  });

  it('gets a medical surveillance by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await OccupationalHealthService.getMedicalSurveillance('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.name, 'Annual Health Surveillance');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'medical_exam' });
    const s = await OccupationalHealthService.getMedicalSurveillance('mem-1');
    assert.equal(s, null);
  });

  it('returns null when medical surveillance not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await OccupationalHealthService.getMedicalSurveillance('nope');
    assert.equal(s, null);
  });

  it('lists medical surveillances by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'medical_surveillance') return [makeRow()];
      return [];
    };
    const list = await OccupationalHealthService.listMedicalSurveillances('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Annual Health Surveillance');
  });

  it('updates a medical surveillance', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await OccupationalHealthService.updateMedicalSurveillance('mem-1', { status: 'completed' });
    assert.ok(s);
    assert.equal(s!.status, 'completed');
  });

  it('deletes a medical surveillance', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await OccupationalHealthService.deleteMedicalSurveillance('mem-1');
    assert.equal(ok, true);
  });

  it('scheduleMedicalSurveillance sets status to scheduled', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await OccupationalHealthService.scheduleMedicalSurveillance('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'scheduled');
  });

  it('startMedicalSurveillance sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await OccupationalHealthService.startMedicalSurveillance('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'in_progress');
  });

  it('completeMedicalSurveillance sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await OccupationalHealthService.completeMedicalSurveillance('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'completed');
  });

  it('cancelMedicalSurveillance sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await OccupationalHealthService.cancelMedicalSurveillance('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'cancelled');
  });

  it('overdueMedicalSurveillance sets status to overdue', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await OccupationalHealthService.overdueMedicalSurveillance('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'overdue');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Medical Exams
// ─────────────────────────────────────────────────────────────────────────────

describe('OccupationalHealthService — Medical Exams', () => {
  beforeEach(() => resetMock());

  it('creates a medical exam with defaults', async () => {
    memCreateImpl = async (args) => makeExamRow({ content: args.data.content as string });
    const e = await OccupationalHealthService.createMedicalExam('org-1', 'ws-1', {
      name: 'Hearing Test', type: 'hearing',
    }, 'user-1');
    assert.equal(e.name, 'Hearing Test');
    assert.equal(e.status, 'scheduled');
    assert.equal(e.provider, '');
  });

  it('creates a medical exam with full input', async () => {
    memCreateImpl = async (args) => makeExamRow({ content: args.data.content as string });
    const e = await OccupationalHealthService.createMedicalExam('org-1', 'ws-1', {
      name: 'Respiratory Exam', type: 'respiratory', description: 'Respiratory fitness',
      status: 'completed', employeeId: 'emp-2', employeeName: 'Jane Smith',
      examDate: '2028-05-01', provider: 'Lung Clinic', results: 'Normal',
      followUp: 'None', notes: 'All good',
    }, 'user-1');
    assert.equal(e.name, 'Respiratory Exam');
    assert.equal(e.type, 'respiratory');
    assert.equal(e.provider, 'Lung Clinic');
    assert.equal(e.results, 'Normal');
  });

  it('gets a medical exam by id', async () => {
    memFindUniqueImpl = async () => makeExamRow();
    const e = await OccupationalHealthService.getMedicalExam('mem-e1');
    assert.ok(e);
    assert.equal(e!.name, 'Vision Test');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeExamRow({ type: 'medical_surveillance' });
    const e = await OccupationalHealthService.getMedicalExam('mem-e1');
    assert.equal(e, null);
  });

  it('returns null when medical exam not found', async () => {
    memFindUniqueImpl = async () => null;
    const e = await OccupationalHealthService.getMedicalExam('nope');
    assert.equal(e, null);
  });

  it('lists medical exams by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'medical_exam') return [makeExamRow()];
      return [];
    };
    const list = await OccupationalHealthService.listMedicalExams('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a medical exam', async () => {
    memFindUniqueImpl = async () => makeExamRow();
    memUpdateImpl = async (args) => makeExamRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await OccupationalHealthService.updateMedicalExam('mem-e1', { status: 'completed' });
    assert.ok(e);
    assert.equal(e!.status, 'completed');
  });

  it('deletes a medical exam', async () => {
    memDeleteImpl = async () => ({ id: 'mem-e1' });
    const ok = await OccupationalHealthService.deleteMedicalExam('mem-e1');
    assert.equal(ok, true);
  });

  it('scheduleMedicalExam sets status to scheduled', async () => {
    memFindUniqueImpl = async () => makeExamRow();
    memUpdateImpl = async (args) => makeExamRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await OccupationalHealthService.scheduleMedicalExam('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'scheduled');
  });

  it('completeMedicalExam sets status to completed', async () => {
    memFindUniqueImpl = async () => makeExamRow();
    memUpdateImpl = async (args) => makeExamRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await OccupationalHealthService.completeMedicalExam('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'completed');
  });

  it('failMedicalExam sets status to failed', async () => {
    memFindUniqueImpl = async () => makeExamRow();
    memUpdateImpl = async (args) => makeExamRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await OccupationalHealthService.failMedicalExam('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'failed');
  });

  it('cancelMedicalExam sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeExamRow();
    memUpdateImpl = async (args) => makeExamRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await OccupationalHealthService.cancelMedicalExam('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'cancelled');
  });

  it('noShowMedicalExam sets status to no_show', async () => {
    memFindUniqueImpl = async () => makeExamRow();
    memUpdateImpl = async (args) => makeExamRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await OccupationalHealthService.noShowMedicalExam('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'no_show');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Health Exposures
// ─────────────────────────────────────────────────────────────────────────────

describe('OccupationalHealthService — Health Exposures', () => {
  beforeEach(() => resetMock());

  it('creates a health exposure with defaults', async () => {
    memCreateImpl = async (args) => makeExposureRow({ content: args.data.content as string });
    const e = await OccupationalHealthService.createHealthExposure('org-1', 'ws-1', {
      name: 'Noise Exposure', type: 'noise',
    }, 'user-1');
    assert.equal(e.name, 'Noise Exposure');
    assert.equal(e.status, 'active');
    assert.equal(e.source, '');
  });

  it('creates a health exposure with full input', async () => {
    memCreateImpl = async (args) => makeExposureRow({ content: args.data.content as string });
    const e = await OccupationalHealthService.createHealthExposure('org-1', 'ws-1', {
      name: 'Radiation Exposure', type: 'radiation', description: 'Ionizing radiation',
      status: 'monitored', employeeId: 'emp-2', employeeName: 'Jane Smith',
      source: 'X-ray lab', level: 'low', unit: 'mSv', exposureDate: '2028-06-01',
      duration: '2h', severity: 'low', notes: 'Within limits',
    }, 'user-1');
    assert.equal(e.name, 'Radiation Exposure');
    assert.equal(e.type, 'radiation');
    assert.equal(e.source, 'X-ray lab');
    assert.equal(e.severity, 'low');
  });

  it('gets a health exposure by id', async () => {
    memFindUniqueImpl = async () => makeExposureRow();
    const e = await OccupationalHealthService.getHealthExposure('mem-x1');
    assert.ok(e);
    assert.equal(e!.name, 'Chemical Exposure');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeExposureRow({ type: 'medical_surveillance' });
    const e = await OccupationalHealthService.getHealthExposure('mem-x1');
    assert.equal(e, null);
  });

  it('returns null when health exposure not found', async () => {
    memFindUniqueImpl = async () => null;
    const e = await OccupationalHealthService.getHealthExposure('nope');
    assert.equal(e, null);
  });

  it('lists health exposures by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'health_exposure') return [makeExposureRow()];
      return [];
    };
    const list = await OccupationalHealthService.listHealthExposures('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a health exposure', async () => {
    memFindUniqueImpl = async () => makeExposureRow();
    memUpdateImpl = async (args) => makeExposureRow({ id: 'mem-x1', content: args.data.content as string });
    const e = await OccupationalHealthService.updateHealthExposure('mem-x1', { status: 'mitigated' });
    assert.ok(e);
    assert.equal(e!.status, 'mitigated');
  });

  it('deletes a health exposure', async () => {
    memDeleteImpl = async () => ({ id: 'mem-x1' });
    const ok = await OccupationalHealthService.deleteHealthExposure('mem-x1');
    assert.equal(ok, true);
  });

  it('monitorHealthExposure sets status to monitored', async () => {
    memFindUniqueImpl = async () => makeExposureRow();
    memUpdateImpl = async (args) => makeExposureRow({ id: 'mem-x1', content: args.data.content as string });
    const e = await OccupationalHealthService.monitorHealthExposure('mem-x1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'monitored');
  });

  it('mitigateHealthExposure sets status to mitigated', async () => {
    memFindUniqueImpl = async () => makeExposureRow();
    memUpdateImpl = async (args) => makeExposureRow({ id: 'mem-x1', content: args.data.content as string });
    const e = await OccupationalHealthService.mitigateHealthExposure('mem-x1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'mitigated');
  });

  it('resolveHealthExposure sets status to resolved', async () => {
    memFindUniqueImpl = async () => makeExposureRow();
    memUpdateImpl = async (args) => makeExposureRow({ id: 'mem-x1', content: args.data.content as string });
    const e = await OccupationalHealthService.resolveHealthExposure('mem-x1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'resolved');
  });

  it('archiveHealthExposure sets status to archived', async () => {
    memFindUniqueImpl = async () => makeExposureRow();
    memUpdateImpl = async (args) => makeExposureRow({ id: 'mem-x1', content: args.data.content as string });
    const e = await OccupationalHealthService.archiveHealthExposure('mem-x1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Vaccination Records
// ─────────────────────────────────────────────────────────────────────────────

describe('OccupationalHealthService — Vaccination Records', () => {
  beforeEach(() => resetMock());

  it('creates a vaccination record with defaults', async () => {
    memCreateImpl = async (args) => makeVaccinationRow({ content: args.data.content as string });
    const v = await OccupationalHealthService.createVaccinationRecord('org-1', 'ws-1', {
      name: 'Flu Shot', type: 'influenza',
    }, 'user-1');
    assert.equal(v.name, 'Flu Shot');
    assert.equal(v.status, 'scheduled');
    assert.equal(v.doseNumber, 0);
  });

  it('creates a vaccination record with full input', async () => {
    memCreateImpl = async (args) => makeVaccinationRow({ content: args.data.content as string });
    const v = await OccupationalHealthService.createVaccinationRecord('org-1', 'ws-1', {
      name: 'Hepatitis B', type: 'hepatitis_b', description: 'Hep B vaccine',
      status: 'administered', employeeId: 'emp-2', employeeName: 'Jane Smith',
      doseNumber: 2, administeredDate: '2028-07-01', nextDoseDate: '2028-12-01',
      provider: 'Health Clinic', batchNumber: 'BATCH-002', notes: 'Second dose',
    }, 'user-1');
    assert.equal(v.name, 'Hepatitis B');
    assert.equal(v.type, 'hepatitis_b');
    assert.equal(v.doseNumber, 2);
    assert.equal(v.batchNumber, 'BATCH-002');
  });

  it('gets a vaccination record by id', async () => {
    memFindUniqueImpl = async () => makeVaccinationRow();
    const v = await OccupationalHealthService.getVaccinationRecord('mem-v1');
    assert.ok(v);
    assert.equal(v!.name, 'COVID-19 Vaccine');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeVaccinationRow({ type: 'medical_surveillance' });
    const v = await OccupationalHealthService.getVaccinationRecord('mem-v1');
    assert.equal(v, null);
  });

  it('returns null when vaccination record not found', async () => {
    memFindUniqueImpl = async () => null;
    const v = await OccupationalHealthService.getVaccinationRecord('nope');
    assert.equal(v, null);
  });

  it('lists vaccination records by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'vaccination_record') return [makeVaccinationRow()];
      return [];
    };
    const list = await OccupationalHealthService.listVaccinationRecords('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a vaccination record', async () => {
    memFindUniqueImpl = async () => makeVaccinationRow();
    memUpdateImpl = async (args) => makeVaccinationRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await OccupationalHealthService.updateVaccinationRecord('mem-v1', { status: 'administered' });
    assert.ok(v);
    assert.equal(v!.status, 'administered');
  });

  it('deletes a vaccination record', async () => {
    memDeleteImpl = async () => ({ id: 'mem-v1' });
    const ok = await OccupationalHealthService.deleteVaccinationRecord('mem-v1');
    assert.equal(ok, true);
  });

  it('administerVaccination sets status to administered', async () => {
    memFindUniqueImpl = async () => makeVaccinationRow();
    memUpdateImpl = async (args) => makeVaccinationRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await OccupationalHealthService.administerVaccination('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'administered');
  });

  it('boostVaccination sets status to boosted', async () => {
    memFindUniqueImpl = async () => makeVaccinationRow();
    memUpdateImpl = async (args) => makeVaccinationRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await OccupationalHealthService.boostVaccination('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'boosted');
  });

  it('expireVaccination sets status to expired', async () => {
    memFindUniqueImpl = async () => makeVaccinationRow();
    memUpdateImpl = async (args) => makeVaccinationRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await OccupationalHealthService.expireVaccination('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'expired');
  });

  it('refuseVaccination sets status to refused', async () => {
    memFindUniqueImpl = async () => makeVaccinationRow();
    memUpdateImpl = async (args) => makeVaccinationRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await OccupationalHealthService.refuseVaccination('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'refused');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('OccupationalHealthService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getOccupationalHealthMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'medical_surveillance') return [
        makeRow({ content: JSON.stringify({ name: 'S1', type: 'periodic', status: 'scheduled', description: '', employeeId: '', employeeName: '', program: '', frequency: '', lastDate: null, nextDate: null, results: '', notes: '' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ name: 'S2', type: 'periodic', status: 'overdue', description: '', employeeId: '', employeeName: '', program: '', frequency: '', lastDate: null, nextDate: null, results: '', notes: '' }) }),
      ];
      if (t === 'medical_exam') return [
        makeExamRow({ content: JSON.stringify({ name: 'E1', type: 'vision', status: 'completed', description: '', employeeId: '', employeeName: '', examDate: null, provider: '', results: '', followUp: '', notes: '' }) }),
      ];
      if (t === 'health_exposure') return [
        makeExposureRow({ content: JSON.stringify({ name: 'X1', type: 'chemical', status: 'active', description: '', employeeId: '', employeeName: '', source: '', level: '', unit: '', exposureDate: null, duration: '', severity: '', notes: '' }) }),
      ];
      if (t === 'vaccination_record') return [
        makeVaccinationRow({ content: JSON.stringify({ name: 'V1', type: 'covid19', status: 'administered', description: '', employeeId: '', employeeName: '', doseNumber: 0, administeredDate: null, nextDoseDate: null, provider: '', batchNumber: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await OccupationalHealthService.getOccupationalHealthMetrics('org-1');
    assert.equal(m.scheduledSurveillances, 1);
    assert.equal(m.completedExams, 1);
    assert.equal(m.activeExposures, 1);
    assert.equal(m.administeredVaccinations, 1);
    assert.equal(m.overdueSurveillances, 1);
  });

  it('getOccupationalHealthStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'medical_surveillance') return [makeRow()];
      if (t === 'medical_exam') return [makeExamRow()];
      if (t === 'health_exposure') return [makeExposureRow()];
      if (t === 'vaccination_record') return [makeVaccinationRow()];
      return [];
    };
    const s = await OccupationalHealthService.getOccupationalHealthStats('org-1');
    assert.equal(s.surveillanceCount, 1);
    assert.equal(s.examCount, 1);
    assert.equal(s.exposureCount, 1);
    assert.equal(s.vaccinationCount, 1);
    assert.equal(s.bySurveillanceType['periodic'], 1);
    assert.equal(s.byExamType['vision'], 1);
    assert.equal(s.byExposureType['chemical'], 1);
    assert.equal(s.byVaccinationType['covid19'], 1);
  });
});
