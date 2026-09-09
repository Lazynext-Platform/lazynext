import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type TrainingCourseType = 'safety_orientation' | 'hazard_communication' | 'ppe' | 'emergency_response' | 'first_aid' | 'cpr' | 'forklift' | 'confined_space' | 'fall_protection' | 'electrical_safety' | 'fire_safety' | 'ergonomics';
export type TrainingCourseStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type EnrollmentType = 'initial' | 'refresher' | 'remedial' | 'voluntary' | 'mandatory' | 'makeup';
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'no_show';
export type CertificationType = 'osha' | 'first_aid' | 'cpr' | 'forklift' | 'aerial_lift' | 'confined_space' | 'hazardous_materials' | 'fall_protection' | 'fire_warden' | 'first_responder';
export type CertificationStatus = 'active' | 'expired' | 'revoked' | 'pending' | 'renewed';
export type ComplianceType = 'mandatory' | 'regulatory' | 'company_policy' | 'department_specific' | 'role_specific' | 'certification_required';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending' | 'overdue' | 'exempt';

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

export interface TrainingCourse {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: TrainingCourseType;
  description: string;
  status: TrainingCourseStatus;
  duration: string;
  format: string;
  provider: string;
  certification: string;
  validityPeriod: string;
  prerequisites: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingEnrollment {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EnrollmentType;
  description: string;
  status: EnrollmentStatus;
  courseId: string;
  employeeId: string;
  employeeName: string;
  enrollmentDate: Date | null;
  completionDate: Date | null;
  score: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificationRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CertificationType;
  description: string;
  status: CertificationStatus;
  employeeId: string;
  employeeName: string;
  certificationNumber: string;
  issuedBy: string;
  issueDate: Date | null;
  expiryDate: Date | null;
  score: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingCompliance {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ComplianceType;
  description: string;
  status: ComplianceStatus;
  employeeId: string;
  employeeName: string;
  courseId: string;
  requiredDate: Date | null;
  completedDate: Date | null;
  complianceScore: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyTrainingMetrics {
  activeCourses: number;
  completedEnrollments: number;
  activeCertifications: number;
  compliantEmployees: number;
  overdueCompliance: number;
}

export interface SafetyTrainingStats {
  courseCount: number;
  enrollmentCount: number;
  certificationCount: number;
  complianceCount: number;
  byCourseType: Record<string, number>;
  byCourseStatus: Record<string, number>;
  byEnrollmentType: Record<string, number>;
  byEnrollmentStatus: Record<string, number>;
  byCertificationType: Record<string, number>;
  byCertificationStatus: Record<string, number>;
  byComplianceType: Record<string, number>;
  byComplianceStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateTrainingCourseInput {
  name: string;
  type: TrainingCourseType;
  description?: string;
  status?: TrainingCourseStatus;
  duration?: string;
  format?: string;
  provider?: string;
  certification?: string;
  validityPeriod?: string;
  prerequisites?: string;
  notes?: string;
}

export interface UpdateTrainingCourseInput {
  name?: string;
  type?: TrainingCourseType;
  description?: string;
  status?: TrainingCourseStatus;
  duration?: string;
  format?: string;
  provider?: string;
  certification?: string;
  validityPeriod?: string;
  prerequisites?: string;
  notes?: string;
}

export interface ListTrainingCoursesOpts {
  type?: TrainingCourseType;
  status?: TrainingCourseStatus;
}

export interface CreateTrainingEnrollmentInput {
  name: string;
  type: EnrollmentType;
  description?: string;
  status?: EnrollmentStatus;
  courseId?: string;
  employeeId?: string;
  employeeName?: string;
  enrollmentDate?: string;
  completionDate?: string;
  score?: number;
  notes?: string;
}

export interface UpdateTrainingEnrollmentInput {
  name?: string;
  type?: EnrollmentType;
  description?: string;
  status?: EnrollmentStatus;
  courseId?: string;
  employeeId?: string;
  employeeName?: string;
  enrollmentDate?: string;
  completionDate?: string;
  score?: number;
  notes?: string;
}

export interface ListTrainingEnrollmentsOpts {
  courseId?: string;
  employeeId?: string;
  type?: EnrollmentType;
  status?: EnrollmentStatus;
}

export interface CreateCertificationRecordInput {
  name: string;
  type: CertificationType;
  description?: string;
  status?: CertificationStatus;
  employeeId?: string;
  employeeName?: string;
  certificationNumber?: string;
  issuedBy?: string;
  issueDate?: string;
  expiryDate?: string;
  score?: number;
  notes?: string;
}

export interface UpdateCertificationRecordInput {
  name?: string;
  type?: CertificationType;
  description?: string;
  status?: CertificationStatus;
  employeeId?: string;
  employeeName?: string;
  certificationNumber?: string;
  issuedBy?: string;
  issueDate?: string;
  expiryDate?: string;
  score?: number;
  notes?: string;
}

export interface ListCertificationRecordsOpts {
  employeeId?: string;
  type?: CertificationType;
  status?: CertificationStatus;
}

export interface CreateTrainingComplianceInput {
  name: string;
  type: ComplianceType;
  description?: string;
  status?: ComplianceStatus;
  employeeId?: string;
  employeeName?: string;
  courseId?: string;
  requiredDate?: string;
  completedDate?: string;
  complianceScore?: number;
  notes?: string;
}

export interface UpdateTrainingComplianceInput {
  name?: string;
  type?: ComplianceType;
  description?: string;
  status?: ComplianceStatus;
  employeeId?: string;
  employeeName?: string;
  courseId?: string;
  requiredDate?: string;
  completedDate?: string;
  complianceScore?: number;
  notes?: string;
}

export interface ListTrainingCompliancesOpts {
  employeeId?: string;
  courseId?: string;
  type?: ComplianceType;
  status?: ComplianceStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toTrainingCourse(row: MemoryRow): TrainingCourse {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as TrainingCourseType) ?? 'safety_orientation',
    description: (c.description as string) ?? '',
    status: (c.status as TrainingCourseStatus) ?? 'draft',
    duration: (c.duration as string) ?? '',
    format: (c.format as string) ?? '',
    provider: (c.provider as string) ?? '',
    certification: (c.certification as string) ?? '',
    validityPeriod: (c.validityPeriod as string) ?? '',
    prerequisites: (c.prerequisites as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTrainingEnrollment(row: MemoryRow): TrainingEnrollment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EnrollmentType) ?? 'initial',
    description: (c.description as string) ?? '',
    status: (c.status as EnrollmentStatus) ?? 'enrolled',
    courseId: (c.courseId as string) ?? '',
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    enrollmentDate: c.enrollmentDate ? new Date(c.enrollmentDate as string) : null,
    completionDate: c.completionDate ? new Date(c.completionDate as string) : null,
    score: (c.score as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCertificationRecord(row: MemoryRow): CertificationRecord {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CertificationType) ?? 'osha',
    description: (c.description as string) ?? '',
    status: (c.status as CertificationStatus) ?? 'active',
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    certificationNumber: (c.certificationNumber as string) ?? '',
    issuedBy: (c.issuedBy as string) ?? '',
    issueDate: c.issueDate ? new Date(c.issueDate as string) : null,
    expiryDate: c.expiryDate ? new Date(c.expiryDate as string) : null,
    score: (c.score as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTrainingCompliance(row: MemoryRow): TrainingCompliance {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ComplianceType) ?? 'mandatory',
    description: (c.description as string) ?? '',
    status: (c.status as ComplianceStatus) ?? 'pending',
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    courseId: (c.courseId as string) ?? '',
    requiredDate: c.requiredDate ? new Date(c.requiredDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    complianceScore: (c.complianceScore as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const SafetyTrainingService = {
  // ── Training Courses ──

  async createTrainingCourse(organizationId: string, workspaceId: string, input: CreateTrainingCourseInput, createdBy: string): Promise<TrainingCourse> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      duration: input.duration ?? '',
      format: input.format ?? '',
      provider: input.provider ?? '',
      certification: input.certification ?? '',
      validityPeriod: input.validityPeriod ?? '',
      prerequisites: input.prerequisites ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'training_course',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['training_course', content.type, content.status]),
        createdBy,
      },
    });
    return toTrainingCourse(row as MemoryRow);
  },

  async getTrainingCourse(id: string): Promise<TrainingCourse | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'training_course') return null;
    return toTrainingCourse(row as MemoryRow);
  },

  async listTrainingCourses(organizationId: string, opts: ListTrainingCoursesOpts = {}): Promise<TrainingCourse[]> {
    const where: Record<string, unknown> = { organizationId, type: 'training_course' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTrainingCourse);
  },

  async updateTrainingCourse(id: string, input: UpdateTrainingCourseInput): Promise<TrainingCourse | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.format !== undefined && { format: input.format }),
      ...(input.provider !== undefined && { provider: input.provider }),
      ...(input.certification !== undefined && { certification: input.certification }),
      ...(input.validityPeriod !== undefined && { validityPeriod: input.validityPeriod }),
      ...(input.prerequisites !== undefined && { prerequisites: input.prerequisites }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['training_course', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTrainingCourse(row as MemoryRow);
  },

  async deleteTrainingCourse(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateTrainingCourse(id: string, _activatedBy: string): Promise<TrainingCourse | null> {
    return SafetyTrainingService.updateTrainingCourse(id, { status: 'active' });
  },

  async deprecateTrainingCourse(id: string, _deprecatedBy: string): Promise<TrainingCourse | null> {
    return SafetyTrainingService.updateTrainingCourse(id, { status: 'deprecated' });
  },

  async archiveTrainingCourse(id: string, _archivedBy: string): Promise<TrainingCourse | null> {
    return SafetyTrainingService.updateTrainingCourse(id, { status: 'archived' });
  },

  // ── Training Enrollments ──

  async createTrainingEnrollment(organizationId: string, workspaceId: string, input: CreateTrainingEnrollmentInput, createdBy: string): Promise<TrainingEnrollment> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'enrolled',
      courseId: input.courseId ?? '',
      employeeId: input.employeeId ?? '',
      employeeName: input.employeeName ?? '',
      enrollmentDate: input.enrollmentDate ?? null,
      completionDate: input.completionDate ?? null,
      score: input.score ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'training_enrollment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.courseId ?? input.employeeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['training_enrollment', content.type, content.status]),
        createdBy,
      },
    });
    return toTrainingEnrollment(row as MemoryRow);
  },

  async getTrainingEnrollment(id: string): Promise<TrainingEnrollment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'training_enrollment') return null;
    return toTrainingEnrollment(row as MemoryRow);
  },

  async listTrainingEnrollments(organizationId: string, opts: ListTrainingEnrollmentsOpts = {}): Promise<TrainingEnrollment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'training_enrollment' };
    const conditions: unknown[] = [];
    if (opts.courseId) conditions.push({ content: { contains: `"courseId":"${opts.courseId}"` } });
    if (opts.employeeId) conditions.push({ content: { contains: `"employeeId":"${opts.employeeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTrainingEnrollment);
  },

  async updateTrainingEnrollment(id: string, input: UpdateTrainingEnrollmentInput): Promise<TrainingEnrollment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.courseId !== undefined && { courseId: input.courseId }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName }),
      ...(input.enrollmentDate !== undefined && { enrollmentDate: input.enrollmentDate }),
      ...(input.completionDate !== undefined && { completionDate: input.completionDate }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['training_enrollment', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTrainingEnrollment(row as MemoryRow);
  },

  async deleteTrainingEnrollment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startEnrollment(id: string, _startedBy: string): Promise<TrainingEnrollment | null> {
    return SafetyTrainingService.updateTrainingEnrollment(id, { status: 'in_progress' });
  },

  async completeEnrollment(id: string, _completedBy: string): Promise<TrainingEnrollment | null> {
    return SafetyTrainingService.updateTrainingEnrollment(id, { status: 'completed', completionDate: new Date().toISOString() });
  },

  async failEnrollment(id: string, _failedBy: string): Promise<TrainingEnrollment | null> {
    return SafetyTrainingService.updateTrainingEnrollment(id, { status: 'failed' });
  },

  async cancelEnrollment(id: string, _cancelledBy: string): Promise<TrainingEnrollment | null> {
    return SafetyTrainingService.updateTrainingEnrollment(id, { status: 'cancelled' });
  },

  async noShowEnrollment(id: string, _noShowBy: string): Promise<TrainingEnrollment | null> {
    return SafetyTrainingService.updateTrainingEnrollment(id, { status: 'no_show' });
  },

  // ── Certification Records ──

  async createCertificationRecord(organizationId: string, workspaceId: string, input: CreateCertificationRecordInput, createdBy: string): Promise<CertificationRecord> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      employeeId: input.employeeId ?? '',
      employeeName: input.employeeName ?? '',
      certificationNumber: input.certificationNumber ?? '',
      issuedBy: input.issuedBy ?? '',
      issueDate: input.issueDate ?? null,
      expiryDate: input.expiryDate ?? null,
      score: input.score ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'certification_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.employeeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['certification_record', content.type, content.status]),
        createdBy,
      },
    });
    return toCertificationRecord(row as MemoryRow);
  },

  async getCertificationRecord(id: string): Promise<CertificationRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'certification_record') return null;
    return toCertificationRecord(row as MemoryRow);
  },

  async listCertificationRecords(organizationId: string, opts: ListCertificationRecordsOpts = {}): Promise<CertificationRecord[]> {
    const where: Record<string, unknown> = { organizationId, type: 'certification_record' };
    const conditions: unknown[] = [];
    if (opts.employeeId) conditions.push({ content: { contains: `"employeeId":"${opts.employeeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCertificationRecord);
  },

  async updateCertificationRecord(id: string, input: UpdateCertificationRecordInput): Promise<CertificationRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName }),
      ...(input.certificationNumber !== undefined && { certificationNumber: input.certificationNumber }),
      ...(input.issuedBy !== undefined && { issuedBy: input.issuedBy }),
      ...(input.issueDate !== undefined && { issueDate: input.issueDate }),
      ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['certification_record', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCertificationRecord(row as MemoryRow);
  },

  async deleteCertificationRecord(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async renewCertification(id: string, _renewedBy: string): Promise<CertificationRecord | null> {
    return SafetyTrainingService.updateCertificationRecord(id, { status: 'renewed' });
  },

  async expireCertification(id: string, _expiredBy: string): Promise<CertificationRecord | null> {
    return SafetyTrainingService.updateCertificationRecord(id, { status: 'expired' });
  },

  async revokeCertification(id: string, _revokedBy: string): Promise<CertificationRecord | null> {
    return SafetyTrainingService.updateCertificationRecord(id, { status: 'revoked' });
  },

  async pendingCertification(id: string, _pendingBy: string): Promise<CertificationRecord | null> {
    return SafetyTrainingService.updateCertificationRecord(id, { status: 'pending' });
  },

  // ── Training Compliance ──

  async createTrainingCompliance(organizationId: string, workspaceId: string, input: CreateTrainingComplianceInput, createdBy: string): Promise<TrainingCompliance> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      employeeId: input.employeeId ?? '',
      employeeName: input.employeeName ?? '',
      courseId: input.courseId ?? '',
      requiredDate: input.requiredDate ?? null,
      completedDate: input.completedDate ?? null,
      complianceScore: input.complianceScore ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'training_compliance',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.employeeId ?? input.courseId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['training_compliance', content.type, content.status]),
        createdBy,
      },
    });
    return toTrainingCompliance(row as MemoryRow);
  },

  async getTrainingCompliance(id: string): Promise<TrainingCompliance | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'training_compliance') return null;
    return toTrainingCompliance(row as MemoryRow);
  },

  async listTrainingCompliances(organizationId: string, opts: ListTrainingCompliancesOpts = {}): Promise<TrainingCompliance[]> {
    const where: Record<string, unknown> = { organizationId, type: 'training_compliance' };
    const conditions: unknown[] = [];
    if (opts.employeeId) conditions.push({ content: { contains: `"employeeId":"${opts.employeeId}"` } });
    if (opts.courseId) conditions.push({ content: { contains: `"courseId":"${opts.courseId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTrainingCompliance);
  },

  async updateTrainingCompliance(id: string, input: UpdateTrainingComplianceInput): Promise<TrainingCompliance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName }),
      ...(input.courseId !== undefined && { courseId: input.courseId }),
      ...(input.requiredDate !== undefined && { requiredDate: input.requiredDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.complianceScore !== undefined && { complianceScore: input.complianceScore }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['training_compliance', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTrainingCompliance(row as MemoryRow);
  },

  async deleteTrainingCompliance(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async markCompliant(id: string, _markedBy: string): Promise<TrainingCompliance | null> {
    return SafetyTrainingService.updateTrainingCompliance(id, { status: 'compliant', completedDate: new Date().toISOString() });
  },

  async markNonCompliant(id: string, _markedBy: string): Promise<TrainingCompliance | null> {
    return SafetyTrainingService.updateTrainingCompliance(id, { status: 'non_compliant' });
  },

  async markOverdueCompliance(id: string, _markedBy: string): Promise<TrainingCompliance | null> {
    return SafetyTrainingService.updateTrainingCompliance(id, { status: 'overdue' });
  },

  async markExemptCompliance(id: string, _markedBy: string): Promise<TrainingCompliance | null> {
    return SafetyTrainingService.updateTrainingCompliance(id, { status: 'exempt' });
  },

  // ── Metrics & Stats ──

  async getSafetyTrainingMetrics(organizationId: string): Promise<SafetyTrainingMetrics> {
    const [courses, enrollments, certifications, compliances] = await Promise.all([
      SafetyTrainingService.listTrainingCourses(organizationId),
      SafetyTrainingService.listTrainingEnrollments(organizationId),
      SafetyTrainingService.listCertificationRecords(organizationId),
      SafetyTrainingService.listTrainingCompliances(organizationId),
    ]);
    return {
      activeCourses: courses.filter((c) => c.status === 'active').length,
      completedEnrollments: enrollments.filter((e) => e.status === 'completed').length,
      activeCertifications: certifications.filter((c) => c.status === 'active').length,
      compliantEmployees: compliances.filter((c) => c.status === 'compliant').length,
      overdueCompliance: compliances.filter((c) => c.status === 'overdue').length,
    };
  },

  async getSafetyTrainingStats(organizationId: string): Promise<SafetyTrainingStats> {
    const [courses, enrollments, certifications, compliances] = await Promise.all([
      SafetyTrainingService.listTrainingCourses(organizationId),
      SafetyTrainingService.listTrainingEnrollments(organizationId),
      SafetyTrainingService.listCertificationRecords(organizationId),
      SafetyTrainingService.listTrainingCompliances(organizationId),
    ]);
    const byCourseType: Record<string, number> = {};
    const byCourseStatus: Record<string, number> = {};
    const byEnrollmentType: Record<string, number> = {};
    const byEnrollmentStatus: Record<string, number> = {};
    const byCertificationType: Record<string, number> = {};
    const byCertificationStatus: Record<string, number> = {};
    const byComplianceType: Record<string, number> = {};
    const byComplianceStatus: Record<string, number> = {};
    for (const c of courses) { byCourseType[c.type] = (byCourseType[c.type] ?? 0) + 1; byCourseStatus[c.status] = (byCourseStatus[c.status] ?? 0) + 1; }
    for (const e of enrollments) { byEnrollmentType[e.type] = (byEnrollmentType[e.type] ?? 0) + 1; byEnrollmentStatus[e.status] = (byEnrollmentStatus[e.status] ?? 0) + 1; }
    for (const c of certifications) { byCertificationType[c.type] = (byCertificationType[c.type] ?? 0) + 1; byCertificationStatus[c.status] = (byCertificationStatus[c.status] ?? 0) + 1; }
    for (const c of compliances) { byComplianceType[c.type] = (byComplianceType[c.type] ?? 0) + 1; byComplianceStatus[c.status] = (byComplianceStatus[c.status] ?? 0) + 1; }
    return {
      courseCount: courses.length,
      enrollmentCount: enrollments.length,
      certificationCount: certifications.length,
      complianceCount: compliances.length,
      byCourseType, byCourseStatus, byEnrollmentType, byEnrollmentStatus, byCertificationType, byCertificationStatus, byComplianceType, byComplianceStatus,
    };
  },
};
