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
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
    type: 'lms_course',
    content: JSON.stringify({ title: 'Test', category: 'compliance', format: 'online', description: '', durationHours: null, instructor: '', difficulty: 'beginner', prerequisites: [], tags: [], status: 'published', maxParticipants: null, materials: [], createdDate: '2024-01-01' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['lms_course', 'compliance', 'online', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
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

const { TrainingService } = await import('@/lib/services/training-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TrainingService', () => {
  beforeEach(() => { resetMock(); });

  // ── Courses ──

  describe('createCourse', () => {
    it('creates a course with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_course', content: args.data.content as string });
      const course = await TrainingService.createCourse('org-1', 'ws-1', { title: 'Safety 101', category: 'safety', format: 'online', difficulty: 'beginner' }, 'user-1');
      assert.equal(course.title, 'Safety 101');
      assert.equal(course.category, 'safety');
      assert.equal(course.format, 'online');
      assert.equal(course.difficulty, 'beginner');
      assert.equal(course.status, 'published');
      assert.equal(course.prerequisites.length, 0);
      assert.equal(course.materials.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_course', content: args.data.content as string });
      const course = await TrainingService.createCourse('org-1', 'ws-1', {
        title: 'Advanced JS', category: 'technical', format: 'hybrid', difficulty: 'advanced',
        description: 'desc', durationHours: 40, instructor: 'Alice',
        prerequisites: ['JS Basics'], tags: ['js'], status: 'draft',
        maxParticipants: 20, materials: ['slides.pdf'], createdDate: '2024-06-01',
      }, 'user-1');
      assert.equal(course.instructor, 'Alice');
      assert.equal(course.durationHours, 40);
      assert.equal(course.status, 'draft');
      assert.equal(course.maxParticipants, 20);
      assert.equal(course.materials.length, 1);
    });
  });

  describe('getCourse', () => {
    it('returns a course when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_course' });
      const course = await TrainingService.getCourse('mem-1');
      assert.ok(course);
      assert.equal(course!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const course = await TrainingService.getCourse('nope');
      assert.equal(course, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_enrollment' });
      const course = await TrainingService.getCourse('mem-1');
      assert.equal(course, null);
    });
  });

  describe('listCourses', () => {
    it('lists courses and filters by category, format, difficulty, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', content: JSON.stringify({ title: 'A', category: 'safety', format: 'online', description: '', durationHours: null, instructor: '', difficulty: 'beginner', prerequisites: [], tags: [], status: 'published', maxParticipants: null, materials: [], createdDate: '2024-01-01' }) }),
        makeRow({ id: 'c2', content: JSON.stringify({ title: 'B', category: 'technical', format: 'in_person', description: '', durationHours: null, instructor: '', difficulty: 'advanced', prerequisites: [], tags: [], status: 'draft', maxParticipants: null, materials: [], createdDate: '2024-01-01' }) }),
      ];
      const list = await TrainingService.listCourses('org-1', { category: 'safety', format: 'online', difficulty: 'beginner', status: 'published' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateCourse', () => {
    it('updates course fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_course', content: JSON.stringify({ title: 'Old', category: 'safety', format: 'online', description: '', durationHours: null, instructor: '', difficulty: 'beginner', prerequisites: [], tags: [], status: 'published', maxParticipants: null, materials: [], createdDate: '2024-01-01' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_course', content: args.data.content as string });
      const course = await TrainingService.updateCourse('mem-1', { title: 'New', status: 'archived' });
      assert.ok(course);
      assert.equal(course!.title, 'New');
      assert.equal(course!.status, 'archived');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const course = await TrainingService.updateCourse('nope', { title: 'X' });
      assert.equal(course, null);
    });
  });

  describe('deleteCourse', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await TrainingService.deleteCourse('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await TrainingService.deleteCourse('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Enrollments ──

  describe('createEnrollment', () => {
    it('creates an enrollment with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_enrollment', content: args.data.content as string });
      const enrollment = await TrainingService.createEnrollment('org-1', 'ws-1', { courseId: 'c1', employeeName: 'Bob', status: 'enrolled' }, 'user-1');
      assert.equal(enrollment.courseId, 'c1');
      assert.equal(enrollment.employeeName, 'Bob');
      assert.equal(enrollment.status, 'enrolled');
      assert.equal(enrollment.progress, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_enrollment', content: args.data.content as string });
      const enrollment = await TrainingService.createEnrollment('org-1', 'ws-1', {
        courseId: 'c1', employeeName: 'Bob', status: 'in_progress',
        employeeEmail: 'bob@test.com', enrolledDate: '2024-01-01',
        progress: 50, notes: 'good',
      }, 'user-1');
      assert.equal(enrollment.progress, 50);
      assert.equal(enrollment.employeeEmail, 'bob@test.com');
    });
  });

  describe('getEnrollment', () => {
    it('returns an enrollment when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_enrollment', content: JSON.stringify({ courseId: 'c1', employeeName: 'S', employeeEmail: '', status: 'enrolled', enrolledDate: null, completedDate: null, progress: 0, score: null, certificateId: null, notes: '' }) });
      const enrollment = await TrainingService.getEnrollment('mem-1');
      assert.ok(enrollment);
      assert.equal(enrollment!.employeeName, 'S');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_course' });
      const enrollment = await TrainingService.getEnrollment('mem-1');
      assert.equal(enrollment, null);
    });
  });

  describe('listEnrollments', () => {
    it('lists enrollments and filters by courseId, employeeName, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'e1', type: 'lms_enrollment', content: JSON.stringify({ courseId: 'c1', employeeName: 'A', employeeEmail: '', status: 'enrolled', enrolledDate: null, completedDate: null, progress: 0, score: null, certificateId: null, notes: '' }) }),
        makeRow({ id: 'e2', type: 'lms_enrollment', content: JSON.stringify({ courseId: 'c2', employeeName: 'B', employeeEmail: '', status: 'completed', enrolledDate: null, completedDate: null, progress: 100, score: 90, certificateId: null, notes: '' }) }),
      ];
      const list = await TrainingService.listEnrollments('org-1', { courseId: 'c1', status: 'enrolled' });
      assert.equal(list.length, 1);
      assert.equal(list[0].employeeName, 'A');
    });
  });

  describe('updateEnrollment', () => {
    it('updates enrollment fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_enrollment', content: JSON.stringify({ courseId: 'c1', employeeName: 'Old', employeeEmail: '', status: 'enrolled', enrolledDate: null, completedDate: null, progress: 0, score: null, certificateId: null, notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_enrollment', content: args.data.content as string });
      const enrollment = await TrainingService.updateEnrollment('mem-1', { employeeName: 'New', progress: 75 });
      assert.ok(enrollment);
      assert.equal(enrollment!.employeeName, 'New');
      assert.equal(enrollment!.progress, 75);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const enrollment = await TrainingService.updateEnrollment('nope', { progress: 50 });
      assert.equal(enrollment, null);
    });
  });

  describe('completeEnrollment', () => {
    it('completes an enrollment with score', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_enrollment', content: JSON.stringify({ courseId: 'c1', employeeName: 'S', employeeEmail: '', status: 'in_progress', enrolledDate: null, completedDate: null, progress: 50, score: null, certificateId: null, notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_enrollment', content: args.data.content as string });
      const enrollment = await TrainingService.completeEnrollment('mem-1', 95, 'admin');
      assert.ok(enrollment);
      assert.equal(enrollment!.status, 'completed');
      assert.equal(enrollment!.score, 95);
      assert.equal(enrollment!.progress, 100);
      assert.ok(enrollment!.completedDate);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const enrollment = await TrainingService.completeEnrollment('nope', 90, 'u');
      assert.equal(enrollment, null);
    });
  });

  describe('dropEnrollment', () => {
    it('drops an enrollment with reason', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_enrollment', content: JSON.stringify({ courseId: 'c1', employeeName: 'S', employeeEmail: '', status: 'enrolled', enrolledDate: null, completedDate: null, progress: 0, score: null, certificateId: null, notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_enrollment', content: args.data.content as string });
      const enrollment = await TrainingService.dropEnrollment('mem-1', 'no time', 'admin');
      assert.ok(enrollment);
      assert.equal(enrollment!.status, 'dropped');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const enrollment = await TrainingService.dropEnrollment('nope', 'r', 'u');
      assert.equal(enrollment, null);
    });
  });

  // ── Certifications ──

  describe('createCertification', () => {
    it('creates a certification with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_certification', content: args.data.content as string });
      const cert = await TrainingService.createCertification('org-1', 'ws-1', { name: 'Safety Cert', validFrom: '2024-01-01' }, 'user-1');
      assert.equal(cert.name, 'Safety Cert');
      assert.equal(cert.status, 'issued');
      assert.equal(cert.requirements.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_certification', content: args.data.content as string });
      const cert = await TrainingService.createCertification('org-1', 'ws-1', {
        name: 'Adv Cert', validFrom: '2024-06-01', description: 'desc', issuer: 'ISO',
        validTo: '2025-06-01', requirements: ['exam'], courseId: 'c1',
        employeeName: 'Bob', certificateNumber: 'CERT-001', status: 'issued',
      }, 'user-1');
      assert.equal(cert.issuer, 'ISO');
      assert.equal(cert.status, 'issued');
      assert.equal(cert.requirements.length, 1);
    });
  });

  describe('getCertification', () => {
    it('returns a certification when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_certification', content: JSON.stringify({ name: 'C', description: '', issuer: '', validFrom: null, validTo: null, requirements: [], courseId: null, employeeName: '', certificateNumber: '', status: 'issued', verifiedBy: null, verifiedDate: null }) });
      const cert = await TrainingService.getCertification('mem-1');
      assert.ok(cert);
      assert.equal(cert!.name, 'C');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_course' });
      const cert = await TrainingService.getCertification('mem-1');
      assert.equal(cert, null);
    });
  });

  describe('listCertifications', () => {
    it('lists certifications and filters by employeeName, status, issuer', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'cert1', type: 'lms_certification', content: JSON.stringify({ name: 'A', description: '', issuer: 'ISO', validFrom: null, validTo: null, requirements: [], courseId: null, employeeName: 'Bob', certificateNumber: '', status: 'issued', verifiedBy: null, verifiedDate: null }) }),
        makeRow({ id: 'cert2', type: 'lms_certification', content: JSON.stringify({ name: 'B', description: '', issuer: 'OSHA', validFrom: null, validTo: null, requirements: [], courseId: null, employeeName: 'Alice', certificateNumber: '', status: 'expired', verifiedBy: null, verifiedDate: null }) }),
      ];
      const list = await TrainingService.listCertifications('org-1', { employeeName: 'Bob', status: 'issued', issuer: 'ISO' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateCertification', () => {
    it('updates certification fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_certification', content: JSON.stringify({ name: 'Old', description: '', issuer: '', validFrom: null, validTo: null, requirements: [], courseId: null, employeeName: '', certificateNumber: '', status: 'issued', verifiedBy: null, verifiedDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_certification', content: args.data.content as string });
      const cert = await TrainingService.updateCertification('mem-1', { name: 'New', status: 'expired' });
      assert.ok(cert);
      assert.equal(cert!.name, 'New');
      assert.equal(cert!.status, 'expired');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const cert = await TrainingService.updateCertification('nope', { name: 'X' });
      assert.equal(cert, null);
    });
  });

  describe('verifyCertification', () => {
    it('verifies a certification', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_certification', content: JSON.stringify({ name: 'C', description: '', issuer: '', validFrom: null, validTo: null, requirements: [], courseId: null, employeeName: '', certificateNumber: '', status: 'issued', verifiedBy: null, verifiedDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_certification', content: args.data.content as string });
      const cert = await TrainingService.verifyCertification('mem-1', 'admin');
      assert.ok(cert);
      assert.equal(cert!.status, 'verified');
      assert.equal(cert!.verifiedBy, 'admin');
      assert.ok(cert!.verifiedDate);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const cert = await TrainingService.verifyCertification('nope', 'u');
      assert.equal(cert, null);
    });
  });

  describe('revokeCertification', () => {
    it('revokes a certification with reason', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_certification', content: JSON.stringify({ name: 'C', description: '', issuer: '', validFrom: null, validTo: null, requirements: [], courseId: null, employeeName: '', certificateNumber: '', status: 'issued', verifiedBy: null, verifiedDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_certification', content: args.data.content as string });
      const cert = await TrainingService.revokeCertification('mem-1', 'fraud', 'admin');
      assert.ok(cert);
      assert.equal(cert!.status, 'revoked');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const cert = await TrainingService.revokeCertification('nope', 'r', 'u');
      assert.equal(cert, null);
    });
  });

  describe('getExpiringCertifications', () => {
    it('returns certifications expiring within the window', async () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      memFindManyImpl = async () => [
        makeRow({ id: 'cert1', type: 'lms_certification', content: JSON.stringify({ name: 'Expiring', description: '', issuer: '', validFrom: null, validTo: future, requirements: [], courseId: null, employeeName: '', certificateNumber: '', status: 'issued', verifiedBy: null, verifiedDate: null }) }),
      ];
      const list = await TrainingService.getExpiringCertifications('org-1', 90);
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'Expiring');
    });
  });

  // ── Learning Paths ──

  describe('createLearningPath', () => {
    it('creates a learning path with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_learning_path', content: args.data.content as string });
      const lp = await TrainingService.createLearningPath('org-1', 'ws-1', { name: 'Dev Path', courses: [{ courseId: 'c1', order: 1 }, { courseId: 'c2', order: 2 }] }, 'user-1');
      assert.equal(lp.name, 'Dev Path');
      assert.equal(lp.courses.length, 2);
      assert.equal(lp.status, 'active');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_learning_path', content: args.data.content as string });
      const lp = await TrainingService.createLearningPath('org-1', 'ws-1', {
        name: 'Lead Path', courses: [{ courseId: 'c1', order: 1 }], description: 'desc', category: 'leadership',
        targetRole: 'Manager', estimatedHours: 100, status: 'active', difficulty: 'advanced',
      }, 'user-1');
      assert.equal(lp.targetRole, 'Manager');
      assert.equal(lp.estimatedHours, 100);
      assert.equal(lp.status, 'active');
    });
  });

  describe('getLearningPath', () => {
    it('returns a learning path when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_learning_path', content: JSON.stringify({ name: 'LP', description: '', category: '', courses: [], targetRole: '', estimatedHours: null, status: 'active', difficulty: 'beginner' }) });
      const lp = await TrainingService.getLearningPath('mem-1');
      assert.ok(lp);
      assert.equal(lp!.name, 'LP');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_course' });
      const lp = await TrainingService.getLearningPath('mem-1');
      assert.equal(lp, null);
    });
  });

  describe('listLearningPaths', () => {
    it('lists learning paths and filters by category, status, targetRole', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'lp1', type: 'lms_learning_path', content: JSON.stringify({ name: 'A', description: '', category: 'leadership', courses: [], targetRole: 'Manager', estimatedHours: null, status: 'active', difficulty: 'beginner' }) }),
        makeRow({ id: 'lp2', type: 'lms_learning_path', content: JSON.stringify({ name: 'B', description: '', category: 'technical', courses: [], targetRole: 'Dev', estimatedHours: null, status: 'draft', difficulty: 'beginner' }) }),
      ];
      const list = await TrainingService.listLearningPaths('org-1', { category: 'leadership', status: 'active', targetRole: 'Manager' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateLearningPath', () => {
    it('updates learning path fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_learning_path', content: JSON.stringify({ name: 'Old', description: '', category: '', courses: [], targetRole: '', estimatedHours: null, status: 'active', difficulty: 'beginner' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_learning_path', content: args.data.content as string });
      const lp = await TrainingService.updateLearningPath('mem-1', { name: 'New', status: 'archived' });
      assert.ok(lp);
      assert.equal(lp!.name, 'New');
      assert.equal(lp!.status, 'archived');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const lp = await TrainingService.updateLearningPath('nope', { name: 'X' });
      assert.equal(lp, null);
    });
  });

  describe('deleteLearningPath', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await TrainingService.deleteLearningPath('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Assessments ──

  describe('createAssessment', () => {
    it('creates an assessment with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_assessment', content: args.data.content as string });
      const a = await TrainingService.createAssessment('org-1', 'ws-1', { title: 'Quiz 1', type: 'quiz', questions: [{ question: 'What?' }] }, 'user-1');
      assert.equal(a.title, 'Quiz 1');
      assert.equal(a.type, 'quiz');
      assert.equal(a.status, 'active');
      assert.equal(a.questions.length, 1);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'lms_assessment', content: args.data.content as string });
      const a = await TrainingService.createAssessment('org-1', 'ws-1', {
        title: 'Final Exam', type: 'exam', questions: [{ question: 'Q?' }],
        courseId: 'c1', description: 'desc', passingScore: 80, durationMinutes: 60,
        attemptsAllowed: 3, status: 'active',
      }, 'user-1');
      assert.equal(a.passingScore, 80);
      assert.equal(a.durationMinutes, 60);
      assert.equal(a.status, 'active');
    });
  });

  describe('getAssessment', () => {
    it('returns an assessment when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_assessment', content: JSON.stringify({ courseId: null, title: 'A', description: '', type: 'quiz', questions: [], passingScore: null, durationMinutes: null, attemptsAllowed: null, status: 'active' }) });
      const a = await TrainingService.getAssessment('mem-1');
      assert.ok(a);
      assert.equal(a!.title, 'A');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_course' });
      const a = await TrainingService.getAssessment('mem-1');
      assert.equal(a, null);
    });
  });

  describe('listAssessments', () => {
    it('lists assessments and filters by courseId, type, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'a1', type: 'lms_assessment', content: JSON.stringify({ courseId: 'c1', title: 'A', description: '', type: 'quiz', questions: [], passingScore: null, durationMinutes: null, attemptsAllowed: null, status: 'active' }) }),
        makeRow({ id: 'a2', type: 'lms_assessment', content: JSON.stringify({ courseId: 'c2', title: 'B', description: '', type: 'exam', questions: [], passingScore: null, durationMinutes: null, attemptsAllowed: null, status: 'inactive' }) }),
      ];
      const list = await TrainingService.listAssessments('org-1', { courseId: 'c1', type: 'quiz', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateAssessment', () => {
    it('updates assessment fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_assessment', content: JSON.stringify({ courseId: null, title: 'Old', description: '', type: 'quiz', questions: [], passingScore: null, durationMinutes: null, attemptsAllowed: null, status: 'active' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_assessment', content: args.data.content as string });
      const a = await TrainingService.updateAssessment('mem-1', { title: 'New', status: 'archived' });
      assert.ok(a);
      assert.equal(a!.title, 'New');
      assert.equal(a!.status, 'archived');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await TrainingService.updateAssessment('nope', { title: 'X' });
      assert.equal(a, null);
    });
  });

  describe('deleteAssessment', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await TrainingService.deleteAssessment('mem-1');
      assert.equal(ok, true);
    });
  });

  describe('submitAssessment', () => {
    it('submits an assessment with answers and score', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'lms_assessment', content: JSON.stringify({ courseId: null, title: 'A', description: '', type: 'quiz', questions: [], passingScore: 70, durationMinutes: null, attemptsAllowed: null, status: 'active' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'lms_assessment', content: args.data.content as string });
      const a = await TrainingService.submitAssessment('mem-1', 'Bob', { q1: 'a' }, 85, 'admin');
      assert.ok(a);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await TrainingService.submitAssessment('nope', 'Bob', {}, 80, 'u');
      assert.equal(a, null);
    });
  });

  // ── Metrics & Stats ──

  describe('getTrainingMetrics', () => {
    it('returns aggregated metrics', async () => {
      memFindManyImpl = async (args) => {
        const t = (args.where as Record<string, unknown>).type as string;
        if (t === 'lms_enrollment') return [
          makeRow({ id: 'e1', content: JSON.stringify({ courseId: 'c1', employeeName: 'A', employeeEmail: '', status: 'completed', enrolledDate: null, completedDate: null, progress: 100, score: 90, certificateId: null, notes: '' }) }),
          makeRow({ id: 'e2', content: JSON.stringify({ courseId: 'c1', employeeName: 'B', employeeEmail: '', status: 'in_progress', enrolledDate: null, completedDate: null, progress: 50, score: null, certificateId: null, notes: '' }) }),
        ];
        if (t === 'lms_certification') return [
          makeRow({ id: 'cert1', content: JSON.stringify({ name: 'C', description: '', issuer: '', validFrom: null, validTo: null, requirements: [], courseId: null, employeeName: '', certificateNumber: '', status: 'issued', verifiedBy: 'admin', verifiedDate: null }) }),
        ];
        return [];
      };
      const m = await TrainingService.getTrainingMetrics('org-1');
      assert.equal(m.activeEnrollments, 1);
      assert.equal(m.avgScore, 90);
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      memFindManyImpl = async (args) => {
        const t = (args.where as Record<string, unknown>).type as string;
        if (t === 'lms_course') return [
          makeRow({ id: 'c1', content: JSON.stringify({ title: 'A', category: 'safety', format: 'online', description: '', durationHours: null, instructor: '', difficulty: 'beginner', prerequisites: [], tags: [], status: 'published', maxParticipants: null, materials: [], createdDate: '2024-01-01' }) }),
        ];
        if (t === 'lms_enrollment') return [
          makeRow({ id: 'e1', content: JSON.stringify({ courseId: 'c1', employeeName: 'A', employeeEmail: '', status: 'completed', enrolledDate: null, completedDate: null, progress: 100, score: 90, certificateId: null, notes: '' }) }),
        ];
        return [];
      };
      const s = await TrainingService.getStats('org-1');
      assert.equal(s.courseCount, 1);
      assert.equal(s.enrollmentCount, 1);
      assert.equal(s.completedEnrollmentCount, 1);
      assert.equal(s.byCourseCategory.safety, 1);
      assert.equal(s.byEnrollmentStatus.completed, 1);
    });
  });
});
