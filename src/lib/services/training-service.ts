import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CourseCategory = 'compliance' | 'technical' | 'soft_skills' | 'leadership' | 'safety' | 'onboarding' | 'product' | 'security' | 'other';
export type CourseFormat = 'online' | 'in_person' | 'hybrid' | 'self_paced';
export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type CourseStatus = 'published' | 'draft' | 'archived';
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'dropped' | 'expired';
export type CertificationStatus = 'issued' | 'verified' | 'expired' | 'revoked';
export type LearningPathStatus = 'active' | 'inactive' | 'archived';
export type AssessmentType = 'quiz' | 'exam' | 'practical' | 'peer_review' | 'self_assessment';
export type AssessmentStatus = 'active' | 'inactive' | 'archived';

// ── Memory row ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string | null;
  sourceId: string | null;
  confidence: number | null;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string | null;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Content payloads ──

interface CourseContent {
  title: string;
  description: string;
  category: CourseCategory;
  format: CourseFormat;
  durationHours: number | null;
  difficulty: CourseDifficulty;
  instructor: string;
  prerequisites: string[];
  tags: string[];
  status: CourseStatus;
  maxParticipants: number | null;
  materials: string[];
  createdDate: string | null;
}

interface EnrollmentContent {
  courseId: string;
  employeeName: string;
  employeeEmail: string;
  status: EnrollmentStatus;
  enrolledDate: string;
  completedDate: string | null;
  progress: number;
  score: number | null;
  certificateId: string | null;
  notes: string;
}

interface CertificationContent {
  name: string;
  description: string;
  issuer: string;
  validFrom: string;
  validTo: string | null;
  requirements: string[];
  courseId: string | null;
  employeeName: string;
  certificateNumber: string;
  status: CertificationStatus;
  verifiedBy: string | null;
  verifiedDate: string | null;
  revokedReason: string | null;
  revokedBy: string | null;
}

interface LearningPathContent {
  name: string;
  description: string;
  category: CourseCategory | null;
  courses: Array<{ courseId: string; order: number; required?: boolean }>;
  targetRole: string;
  estimatedHours: number | null;
  status: LearningPathStatus;
  difficulty: CourseDifficulty | null;
}

interface AssessmentContent {
  courseId: string | null;
  title: string;
  description: string;
  type: AssessmentType;
  questions: Array<{ question: string; options?: string[]; correctAnswer?: string; points?: number; type?: string }>;
  passingScore: number | null;
  durationMinutes: number | null;
  attemptsAllowed: number | null;
  status: AssessmentStatus;
  submissions: Array<{ employeeName: string; answers: Record<string, unknown>; score: number; submittedAt: string; submittedBy: string }>;
}

// ── Public interfaces ──

export interface Course {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  category: CourseCategory;
  format: CourseFormat;
  durationHours: number | null;
  difficulty: CourseDifficulty;
  instructor: string;
  prerequisites: string[];
  tags: string[];
  status: CourseStatus;
  maxParticipants: number | null;
  materials: string[];
  createdDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Enrollment {
  id: string;
  organizationId: string;
  workspaceId: string;
  courseId: string;
  employeeName: string;
  employeeEmail: string;
  status: EnrollmentStatus;
  enrolledDate: Date;
  completedDate: Date | null;
  progress: number;
  score: number | null;
  certificateId: string | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certification {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  issuer: string;
  validFrom: Date;
  validTo: Date | null;
  requirements: string[];
  courseId: string | null;
  employeeName: string;
  certificateNumber: string;
  status: CertificationStatus;
  verifiedBy: string | null;
  verifiedDate: Date | null;
  revokedReason: string | null;
  revokedBy: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningPath {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  category: CourseCategory | null;
  courses: Array<{ courseId: string; order: number; required?: boolean }>;
  targetRole: string;
  estimatedHours: number | null;
  status: LearningPathStatus;
  difficulty: CourseDifficulty | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assessment {
  id: string;
  organizationId: string;
  workspaceId: string;
  courseId: string | null;
  title: string;
  description: string;
  type: AssessmentType;
  questions: Array<{ question: string; options?: string[]; correctAnswer?: string; points?: number; type?: string }>;
  passingScore: number | null;
  durationMinutes: number | null;
  attemptsAllowed: number | null;
  status: AssessmentStatus;
  submissions: Array<{ employeeName: string; answers: Record<string, unknown>; score: number; submittedAt: Date; submittedBy: string }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingMetrics {
  completionRate: number;
  activeEnrollments: number;
  certificationCompliance: number;
  popularCourses: Array<{ courseId: string; title: string; enrollmentCount: number }>;
  avgScore: number;
}

export interface TrainingStats {
  courseCount: number;
  enrollmentCount: number;
  certificationCount: number;
  learningPathCount: number;
  assessmentCount: number;
  completedEnrollmentCount: number;
  activeEnrollmentCount: number;
  verifiedCertificationCount: number;
  completionRate: number;
  avgScore: number;
  byCourseCategory: Record<string, number>;
  byEnrollmentStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateCourseInput {
  title: string;
  description?: string;
  category: CourseCategory;
  format: CourseFormat;
  durationHours?: number;
  difficulty: CourseDifficulty;
  instructor?: string;
  prerequisites?: string[];
  tags?: string[];
  status?: CourseStatus;
  maxParticipants?: number;
  materials?: string[];
  createdDate?: string;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  category?: CourseCategory;
  format?: CourseFormat;
  durationHours?: number;
  difficulty?: CourseDifficulty;
  instructor?: string;
  prerequisites?: string[];
  tags?: string[];
  status?: CourseStatus;
  maxParticipants?: number;
  materials?: string[];
}

export interface ListCoursesOpts {
  category?: CourseCategory;
  format?: CourseFormat;
  difficulty?: CourseDifficulty;
  status?: CourseStatus;
}

export interface CreateEnrollmentInput {
  courseId: string;
  employeeName: string;
  employeeEmail?: string;
  status: EnrollmentStatus;
  enrolledDate?: string;
  completedDate?: string;
  progress?: number;
  score?: number;
  certificateId?: string;
  notes?: string;
}

export interface UpdateEnrollmentInput {
  employeeName?: string;
  employeeEmail?: string;
  status?: EnrollmentStatus;
  enrolledDate?: string;
  completedDate?: string;
  progress?: number;
  score?: number;
  certificateId?: string;
  notes?: string;
}

export interface ListEnrollmentsOpts {
  courseId?: string;
  employeeName?: string;
  status?: EnrollmentStatus;
}

export interface CreateCertificationInput {
  name: string;
  description?: string;
  issuer?: string;
  validFrom: string;
  validTo?: string;
  requirements?: string[];
  courseId?: string;
  employeeName?: string;
  certificateNumber?: string;
  status?: CertificationStatus;
  verifiedBy?: string;
  verifiedDate?: string;
}

export interface UpdateCertificationInput {
  name?: string;
  description?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  requirements?: string[];
  courseId?: string;
  employeeName?: string;
  certificateNumber?: string;
  status?: CertificationStatus;
}

export interface ListCertificationsOpts {
  employeeName?: string;
  status?: CertificationStatus;
  issuer?: string;
}

export interface CreateLearningPathInput {
  name: string;
  description?: string;
  category?: CourseCategory;
  courses: Array<{ courseId: string; order: number; required?: boolean }>;
  targetRole?: string;
  estimatedHours?: number;
  status?: LearningPathStatus;
  difficulty?: CourseDifficulty;
}

export interface UpdateLearningPathInput {
  name?: string;
  description?: string;
  category?: CourseCategory;
  courses?: Array<{ courseId: string; order: number; required?: boolean }>;
  targetRole?: string;
  estimatedHours?: number;
  status?: LearningPathStatus;
  difficulty?: CourseDifficulty;
}

export interface ListLearningPathsOpts {
  category?: CourseCategory;
  status?: LearningPathStatus;
  targetRole?: string;
}

export interface CreateAssessmentInput {
  courseId?: string;
  title: string;
  description?: string;
  type: AssessmentType;
  questions: Array<{ question: string; options?: string[]; correctAnswer?: string; points?: number; type?: string }>;
  passingScore?: number;
  durationMinutes?: number;
  attemptsAllowed?: number;
  status?: AssessmentStatus;
}

export interface UpdateAssessmentInput {
  courseId?: string;
  title?: string;
  description?: string;
  type?: AssessmentType;
  questions?: Array<{ question: string; options?: string[]; correctAnswer?: string; points?: number; type?: string }>;
  passingScore?: number;
  durationMinutes?: number;
  attemptsAllowed?: number;
  status?: AssessmentStatus;
}

export interface ListAssessmentsOpts {
  courseId?: string;
  type?: AssessmentType;
  status?: AssessmentStatus;
}

// ── Helpers ──

const fallbackCourse: CourseContent = {
  title: '', description: '', category: 'other', format: 'online', durationHours: null,
  difficulty: 'beginner', instructor: '', prerequisites: [], tags: [], status: 'published',
  maxParticipants: null, materials: [], createdDate: null,
};

const fallbackEnrollment: EnrollmentContent = {
  courseId: '', employeeName: '', employeeEmail: '', status: 'enrolled', enrolledDate: '',
  completedDate: null, progress: 0, score: null, certificateId: null, notes: '',
};

const fallbackCertification: CertificationContent = {
  name: '', description: '', issuer: '', validFrom: '', validTo: null, requirements: [],
  courseId: null, employeeName: '', certificateNumber: '', status: 'issued',
  verifiedBy: null, verifiedDate: null, revokedReason: null, revokedBy: null,
};

const fallbackLearningPath: LearningPathContent = {
  name: '', description: '', category: null, courses: [], targetRole: '',
  estimatedHours: null, status: 'active', difficulty: null,
};

const fallbackAssessment: AssessmentContent = {
  courseId: null, title: '', description: '', type: 'quiz', questions: [],
  passingScore: null, durationMinutes: null, attemptsAllowed: null, status: 'active', submissions: [],
};

function parseCourse(raw: string): CourseContent {
  if (!raw) return fallbackCourse;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      description: p.description ?? '',
      category: (p.category as CourseCategory) ?? 'other',
      format: (p.format as CourseFormat) ?? 'online',
      durationHours: p.durationHours ?? null,
      difficulty: (p.difficulty as CourseDifficulty) ?? 'beginner',
      instructor: p.instructor ?? '',
      prerequisites: Array.isArray(p.prerequisites) ? p.prerequisites : [],
      tags: Array.isArray(p.tags) ? p.tags : [],
      status: (p.status as CourseStatus) ?? 'published',
      maxParticipants: p.maxParticipants ?? null,
      materials: Array.isArray(p.materials) ? p.materials : [],
      createdDate: p.createdDate ?? null,
    };
  } catch { return fallbackCourse; }
}

function parseEnrollment(raw: string): EnrollmentContent {
  if (!raw) return fallbackEnrollment;
  try {
    const p = JSON.parse(raw);
    return {
      courseId: p.courseId ?? '',
      employeeName: p.employeeName ?? '',
      employeeEmail: p.employeeEmail ?? '',
      status: (p.status as EnrollmentStatus) ?? 'enrolled',
      enrolledDate: p.enrolledDate ?? '',
      completedDate: p.completedDate ?? null,
      progress: p.progress ?? 0,
      score: p.score ?? null,
      certificateId: p.certificateId ?? null,
      notes: p.notes ?? '',
    };
  } catch { return fallbackEnrollment; }
}

function parseCertification(raw: string): CertificationContent {
  if (!raw) return fallbackCertification;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      description: p.description ?? '',
      issuer: p.issuer ?? '',
      validFrom: p.validFrom ?? '',
      validTo: p.validTo ?? null,
      requirements: Array.isArray(p.requirements) ? p.requirements : [],
      courseId: p.courseId ?? null,
      employeeName: p.employeeName ?? '',
      certificateNumber: p.certificateNumber ?? '',
      status: (p.status as CertificationStatus) ?? 'issued',
      verifiedBy: p.verifiedBy ?? null,
      verifiedDate: p.verifiedDate ?? null,
      revokedReason: p.revokedReason ?? null,
      revokedBy: p.revokedBy ?? null,
    };
  } catch { return fallbackCertification; }
}

function parseLearningPath(raw: string): LearningPathContent {
  if (!raw) return fallbackLearningPath;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      description: p.description ?? '',
      category: (p.category as CourseCategory) ?? null,
      courses: Array.isArray(p.courses) ? p.courses : [],
      targetRole: p.targetRole ?? '',
      estimatedHours: p.estimatedHours ?? null,
      status: (p.status as LearningPathStatus) ?? 'active',
      difficulty: (p.difficulty as CourseDifficulty) ?? null,
    };
  } catch { return fallbackLearningPath; }
}

function parseAssessment(raw: string): AssessmentContent {
  if (!raw) return fallbackAssessment;
  try {
    const p = JSON.parse(raw);
    return {
      courseId: p.courseId ?? null,
      title: p.title ?? '',
      description: p.description ?? '',
      type: (p.type as AssessmentType) ?? 'quiz',
      questions: Array.isArray(p.questions) ? p.questions : [],
      passingScore: p.passingScore ?? null,
      durationMinutes: p.durationMinutes ?? null,
      attemptsAllowed: p.attemptsAllowed ?? null,
      status: (p.status as AssessmentStatus) ?? 'active',
      submissions: Array.isArray(p.submissions) ? p.submissions : [],
    };
  } catch { return fallbackAssessment; }
}

function toCourse(row: MemoryRow): Course {
  const c = parseCourse(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, description: c.description, category: c.category, format: c.format,
    durationHours: c.durationHours, difficulty: c.difficulty, instructor: c.instructor,
    prerequisites: c.prerequisites, tags: c.tags, status: c.status,
    maxParticipants: c.maxParticipants, materials: c.materials,
    createdDate: c.createdDate ? new Date(c.createdDate) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEnrollment(row: MemoryRow): Enrollment {
  const c = parseEnrollment(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    courseId: c.courseId, employeeName: c.employeeName, employeeEmail: c.employeeEmail,
    status: c.status, enrolledDate: c.enrolledDate ? new Date(c.enrolledDate) : row.createdAt,
    completedDate: c.completedDate ? new Date(c.completedDate) : null,
    progress: c.progress, score: c.score, certificateId: c.certificateId, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCertification(row: MemoryRow): Certification {
  const c = parseCertification(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, description: c.description, issuer: c.issuer,
    validFrom: c.validFrom ? new Date(c.validFrom) : row.createdAt,
    validTo: c.validTo ? new Date(c.validTo) : null,
    requirements: c.requirements, courseId: c.courseId, employeeName: c.employeeName,
    certificateNumber: c.certificateNumber, status: c.status,
    verifiedBy: c.verifiedBy, verifiedDate: c.verifiedDate ? new Date(c.verifiedDate) : null,
    revokedReason: c.revokedReason, revokedBy: c.revokedBy,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLearningPath(row: MemoryRow): LearningPath {
  const c = parseLearningPath(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, description: c.description, category: c.category, courses: c.courses,
    targetRole: c.targetRole, estimatedHours: c.estimatedHours, status: c.status,
    difficulty: c.difficulty,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAssessment(row: MemoryRow): Assessment {
  const c = parseAssessment(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    courseId: c.courseId, title: c.title, description: c.description, type: c.type,
    questions: c.questions, passingScore: c.passingScore, durationMinutes: c.durationMinutes,
    attemptsAllowed: c.attemptsAllowed, status: c.status,
    submissions: c.submissions.map((s) => ({ ...s, submittedAt: new Date(s.submittedAt) })),
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Training Service ──

export const TrainingService = {
  // ── Courses ──

  async createCourse(
    organizationId: string,
    workspaceId: string,
    input: CreateCourseInput,
    createdBy: string,
  ): Promise<Course> {
    const content: CourseContent = {
      title: input.title.trim(),
      description: input.description ?? '',
      category: input.category,
      format: input.format,
      durationHours: input.durationHours ?? null,
      difficulty: input.difficulty,
      instructor: input.instructor ?? '',
      prerequisites: input.prerequisites ?? [],
      tags: input.tags ?? [],
      status: input.status ?? 'published',
      maxParticipants: input.maxParticipants ?? null,
      materials: input.materials ?? [],
      createdDate: input.createdDate ?? new Date().toISOString(),
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'lms_course',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lms_course', content.category, content.format, content.status]),
        createdBy,
      },
    });

    return toCourse(row as MemoryRow);
  },

  async getCourse(id: string): Promise<Course | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lms_course') return null;
    return toCourse(row as MemoryRow);
  },

  async listCourses(organizationId: string, opts: ListCoursesOpts = {}): Promise<Course[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'lms_course', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCourse(r as MemoryRow));
    if (opts.category) records = records.filter((c) => c.category === opts.category);
    if (opts.format) records = records.filter((c) => c.format === opts.format);
    if (opts.difficulty) records = records.filter((c) => c.difficulty === opts.difficulty);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateCourse(id: string, input: UpdateCourseInput): Promise<Course | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCourse(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.format !== undefined) content.format = input.format;
    if (input.durationHours !== undefined) content.durationHours = input.durationHours;
    if (input.difficulty !== undefined) content.difficulty = input.difficulty;
    if (input.instructor !== undefined) content.instructor = input.instructor;
    if (input.prerequisites !== undefined) content.prerequisites = input.prerequisites;
    if (input.tags !== undefined) content.tags = input.tags;
    if (input.status !== undefined) content.status = input.status;
    if (input.maxParticipants !== undefined) content.maxParticipants = input.maxParticipants;
    if (input.materials !== undefined) content.materials = input.materials;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_course', content.category, content.format, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toCourse(row as MemoryRow);
  },

  async deleteCourse(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Enrollments ──

  async createEnrollment(
    organizationId: string,
    workspaceId: string,
    input: CreateEnrollmentInput,
    createdBy: string,
  ): Promise<Enrollment> {
    const content: EnrollmentContent = {
      courseId: input.courseId,
      employeeName: input.employeeName.trim(),
      employeeEmail: input.employeeEmail ?? '',
      status: input.status,
      enrolledDate: input.enrolledDate ?? new Date().toISOString(),
      completedDate: input.completedDate ?? null,
      progress: input.progress ?? 0,
      score: input.score ?? null,
      certificateId: input.certificateId ?? null,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'lms_enrollment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.courseId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lms_enrollment', content.status]),
        createdBy,
      },
    });

    return toEnrollment(row as MemoryRow);
  },

  async getEnrollment(id: string): Promise<Enrollment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lms_enrollment') return null;
    return toEnrollment(row as MemoryRow);
  },

  async listEnrollments(organizationId: string, opts: ListEnrollmentsOpts = {}): Promise<Enrollment[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'lms_enrollment', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toEnrollment(r as MemoryRow));
    if (opts.courseId) records = records.filter((e) => e.courseId === opts.courseId);
    if (opts.employeeName) records = records.filter((e) => e.employeeName === opts.employeeName);
    if (opts.status) records = records.filter((e) => e.status === opts.status);
    return records;
  },

  async updateEnrollment(id: string, input: UpdateEnrollmentInput): Promise<Enrollment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseEnrollment(existing.content);
    if (input.employeeName !== undefined) content.employeeName = input.employeeName.trim();
    if (input.employeeEmail !== undefined) content.employeeEmail = input.employeeEmail;
    if (input.status !== undefined) content.status = input.status;
    if (input.enrolledDate !== undefined) content.enrolledDate = input.enrolledDate;
    if (input.completedDate !== undefined) content.completedDate = input.completedDate;
    if (input.progress !== undefined) content.progress = input.progress;
    if (input.score !== undefined) content.score = input.score;
    if (input.certificateId !== undefined) content.certificateId = input.certificateId;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_enrollment', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toEnrollment(row as MemoryRow);
  },

  async completeEnrollment(id: string, score: number, completedBy: string): Promise<Enrollment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseEnrollment(existing.content);
    content.status = 'completed';
    content.completedDate = new Date().toISOString();
    content.progress = 100;
    content.score = score;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_enrollment', 'completed']),
          verifiedBy: completedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toEnrollment(row as MemoryRow);
  },

  async dropEnrollment(id: string, reason: string, droppedBy: string): Promise<Enrollment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseEnrollment(existing.content);
    content.status = 'dropped';
    content.notes = reason;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_enrollment', 'dropped']),
          verifiedBy: droppedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toEnrollment(row as MemoryRow);
  },

  // ── Certifications ──

  async createCertification(
    organizationId: string,
    workspaceId: string,
    input: CreateCertificationInput,
    createdBy: string,
  ): Promise<Certification> {
    const content: CertificationContent = {
      name: input.name.trim(),
      description: input.description ?? '',
      issuer: input.issuer ?? '',
      validFrom: input.validFrom,
      validTo: input.validTo ?? null,
      requirements: input.requirements ?? [],
      courseId: input.courseId ?? null,
      employeeName: input.employeeName ?? '',
      certificateNumber: input.certificateNumber ?? '',
      status: input.status ?? 'issued',
      verifiedBy: input.verifiedBy ?? null,
      verifiedDate: input.verifiedDate ?? null,
      revokedReason: null,
      revokedBy: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'lms_certification',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.courseId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lms_certification', content.status]),
        createdBy,
      },
    });

    return toCertification(row as MemoryRow);
  },

  async getCertification(id: string): Promise<Certification | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lms_certification') return null;
    return toCertification(row as MemoryRow);
  },

  async listCertifications(organizationId: string, opts: ListCertificationsOpts = {}): Promise<Certification[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'lms_certification', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCertification(r as MemoryRow));
    if (opts.employeeName) records = records.filter((c) => c.employeeName === opts.employeeName);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    if (opts.issuer) records = records.filter((c) => c.issuer === opts.issuer);
    return records;
  },

  async updateCertification(id: string, input: UpdateCertificationInput): Promise<Certification | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCertification(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.issuer !== undefined) content.issuer = input.issuer;
    if (input.validFrom !== undefined) content.validFrom = input.validFrom;
    if (input.validTo !== undefined) content.validTo = input.validTo;
    if (input.requirements !== undefined) content.requirements = input.requirements;
    if (input.courseId !== undefined) content.courseId = input.courseId;
    if (input.employeeName !== undefined) content.employeeName = input.employeeName;
    if (input.certificateNumber !== undefined) content.certificateNumber = input.certificateNumber;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_certification', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toCertification(row as MemoryRow);
  },

  async verifyCertification(id: string, verifiedBy: string): Promise<Certification | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCertification(existing.content);
    content.status = 'verified';
    content.verifiedBy = verifiedBy;
    content.verifiedDate = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_certification', 'verified']),
          verifiedBy,
          verifiedAt: new Date(),
        },
      }), null,
    );
    if (!row) return null;
    return toCertification(row as MemoryRow);
  },

  async revokeCertification(id: string, reason: string, revokedBy: string): Promise<Certification | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCertification(existing.content);
    content.status = 'revoked';
    content.revokedReason = reason;
    content.revokedBy = revokedBy;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_certification', 'revoked']),
        },
      }), null,
    );
    if (!row) return null;
    return toCertification(row as MemoryRow);
  },

  async getExpiringCertifications(organizationId: string, daysAhead = 90): Promise<Certification[]> {
    const certs = await TrainingService.listCertifications(organizationId);
    const now = new Date();
    const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    return certs.filter((c) => {
      if (!c.validTo) return false;
      if (c.status === 'revoked' || c.status === 'expired') return false;
      return c.validTo >= now && c.validTo <= horizon;
    });
  },

  // ── Learning Paths ──

  async createLearningPath(
    organizationId: string,
    workspaceId: string,
    input: CreateLearningPathInput,
    createdBy: string,
  ): Promise<LearningPath> {
    const content: LearningPathContent = {
      name: input.name.trim(),
      description: input.description ?? '',
      category: input.category ?? null,
      courses: input.courses,
      targetRole: input.targetRole ?? '',
      estimatedHours: input.estimatedHours ?? null,
      status: input.status ?? 'active',
      difficulty: input.difficulty ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'lms_learning_path',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lms_learning_path', content.status]),
        createdBy,
      },
    });

    return toLearningPath(row as MemoryRow);
  },

  async getLearningPath(id: string): Promise<LearningPath | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lms_learning_path') return null;
    return toLearningPath(row as MemoryRow);
  },

  async listLearningPaths(organizationId: string, opts: ListLearningPathsOpts = {}): Promise<LearningPath[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'lms_learning_path', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toLearningPath(r as MemoryRow));
    if (opts.category) records = records.filter((l) => l.category === opts.category);
    if (opts.status) records = records.filter((l) => l.status === opts.status);
    if (opts.targetRole) records = records.filter((l) => l.targetRole === opts.targetRole);
    return records;
  },

  async updateLearningPath(id: string, input: UpdateLearningPathInput): Promise<LearningPath | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseLearningPath(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.courses !== undefined) content.courses = input.courses;
    if (input.targetRole !== undefined) content.targetRole = input.targetRole;
    if (input.estimatedHours !== undefined) content.estimatedHours = input.estimatedHours;
    if (input.status !== undefined) content.status = input.status;
    if (input.difficulty !== undefined) content.difficulty = input.difficulty;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_learning_path', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toLearningPath(row as MemoryRow);
  },

  async deleteLearningPath(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Assessments ──

  async createAssessment(
    organizationId: string,
    workspaceId: string,
    input: CreateAssessmentInput,
    createdBy: string,
  ): Promise<Assessment> {
    const content: AssessmentContent = {
      courseId: input.courseId ?? null,
      title: input.title.trim(),
      description: input.description ?? '',
      type: input.type,
      questions: input.questions,
      passingScore: input.passingScore ?? null,
      durationMinutes: input.durationMinutes ?? null,
      attemptsAllowed: input.attemptsAllowed ?? null,
      status: input.status ?? 'active',
      submissions: [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'lms_assessment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.courseId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lms_assessment', content.type, content.status]),
        createdBy,
      },
    });

    return toAssessment(row as MemoryRow);
  },

  async getAssessment(id: string): Promise<Assessment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lms_assessment') return null;
    return toAssessment(row as MemoryRow);
  },

  async listAssessments(organizationId: string, opts: ListAssessmentsOpts = {}): Promise<Assessment[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'lms_assessment', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toAssessment(r as MemoryRow));
    if (opts.courseId) records = records.filter((a) => a.courseId === opts.courseId);
    if (opts.type) records = records.filter((a) => a.type === opts.type);
    if (opts.status) records = records.filter((a) => a.status === opts.status);
    return records;
  },

  async updateAssessment(id: string, input: UpdateAssessmentInput): Promise<Assessment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAssessment(existing.content);
    if (input.courseId !== undefined) content.courseId = input.courseId;
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.questions !== undefined) content.questions = input.questions;
    if (input.passingScore !== undefined) content.passingScore = input.passingScore;
    if (input.durationMinutes !== undefined) content.durationMinutes = input.durationMinutes;
    if (input.attemptsAllowed !== undefined) content.attemptsAllowed = input.attemptsAllowed;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_assessment', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toAssessment(row as MemoryRow);
  },

  async deleteAssessment(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async submitAssessment(id: string, employeeName: string, answers: Record<string, unknown>, score: number, submittedBy: string): Promise<Assessment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAssessment(existing.content);
    content.submissions = [...content.submissions, {
      employeeName,
      answers,
      score,
      submittedAt: new Date().toISOString(),
      submittedBy,
    }];

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['lms_assessment', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toAssessment(row as MemoryRow);
  },

  // ── Metrics ──

  async getTrainingMetrics(organizationId: string): Promise<TrainingMetrics> {
    const [courses, enrollments, certifications] = await Promise.all([
      TrainingService.listCourses(organizationId),
      TrainingService.listEnrollments(organizationId),
      TrainingService.listCertifications(organizationId),
    ]);

    const completed = enrollments.filter((e) => e.status === 'completed').length;
    const completionRate = enrollments.length > 0
      ? Math.round((completed / enrollments.length) * 100)
      : 0;

    const activeEnrollments = enrollments.filter(
      (e) => e.status === 'enrolled' || e.status === 'in_progress',
    ).length;

    const validCerts = certifications.filter(
      (c) => c.status === 'issued' || c.status === 'verified',
    ).length;
    const certificationCompliance = certifications.length > 0
      ? Math.round((validCerts / certifications.length) * 100)
      : 0;

    const courseEnrollmentCounts = new Map<string, number>();
    for (const e of enrollments) {
      courseEnrollmentCounts.set(e.courseId, (courseEnrollmentCounts.get(e.courseId) || 0) + 1);
    }
    const courseMap = new Map(courses.map((c) => [c.id, c.title]));
    const popularCourses = Array.from(courseEnrollmentCounts.entries())
      .map(([courseId, count]) => ({ courseId, title: courseMap.get(courseId) ?? 'Unknown', enrollmentCount: count }))
      .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
      .slice(0, 5);

    const scored = enrollments.filter((e) => e.score !== null);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((sum, e) => sum + (e.score ?? 0), 0) / scored.length)
      : 0;

    return {
      completionRate,
      activeEnrollments,
      certificationCompliance,
      popularCourses,
      avgScore,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<TrainingStats> {
    const [courses, enrollments, certifications, learningPaths, assessments] = await Promise.all([
      TrainingService.listCourses(organizationId),
      TrainingService.listEnrollments(organizationId),
      TrainingService.listCertifications(organizationId),
      TrainingService.listLearningPaths(organizationId),
      TrainingService.listAssessments(organizationId),
    ]);

    const completedEnrollmentCount = enrollments.filter((e) => e.status === 'completed').length;
    const activeEnrollmentCount = enrollments.filter(
      (e) => e.status === 'enrolled' || e.status === 'in_progress',
    ).length;
    const verifiedCertificationCount = certifications.filter(
      (c) => c.status === 'verified',
    ).length;
    const completionRate = enrollments.length > 0
      ? Math.round((completedEnrollmentCount / enrollments.length) * 100)
      : 0;

    const scored = enrollments.filter((e) => e.score !== null);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((sum, e) => sum + (e.score ?? 0), 0) / scored.length)
      : 0;

    const byCourseCategory: Record<string, number> = {};
    for (const c of courses) {
      byCourseCategory[c.category] = (byCourseCategory[c.category] || 0) + 1;
    }

    const byEnrollmentStatus: Record<string, number> = {};
    for (const e of enrollments) {
      byEnrollmentStatus[e.status] = (byEnrollmentStatus[e.status] || 0) + 1;
    }

    return {
      courseCount: courses.length,
      enrollmentCount: enrollments.length,
      certificationCount: certifications.length,
      learningPathCount: learningPaths.length,
      assessmentCount: assessments.length,
      completedEnrollmentCount,
      activeEnrollmentCount,
      verifiedCertificationCount,
      completionRate,
      avgScore,
      byCourseCategory,
      byEnrollmentStatus,
    };
  },
};
