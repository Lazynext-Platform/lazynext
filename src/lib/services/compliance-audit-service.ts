import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type FrameworkStandard = 'SOC2' | 'ISO 27001' | 'ISO 9001' | 'GDPR' | 'HIPAA' | 'PCI DSS' | 'CCPA' | 'custom';
export type FrameworkStatus = 'active' | 'inactive' | 'archived';
export type ControlStatus = 'implemented' | 'not_implemented' | 'gap' | 'in_progress' | 'deprecated';
export type ControlFrequency = 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
export type TestResult = 'pass' | 'fail' | 'exception';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'open' | 'remediated' | 'accepted' | 'closed';
export type EvidenceType = 'document' | 'screenshot' | 'log' | 'configuration' | 'other';
export type AuditReportStatus = 'draft' | 'in_review' | 'finalized';

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

interface FrameworkContent {
  name: string;
  standard: FrameworkStandard;
  description: string;
  version: string;
  status: FrameworkStatus;
  requirements: Array<{ id: string; title: string; description: string }>;
}

interface ControlContent {
  frameworkId: string;
  controlId: string;
  title: string;
  description: string;
  category: string;
  frequency: ControlFrequency;
  owner: string;
  status: ControlStatus;
}

interface ControlTestContent {
  controlId: string;
  testDate: string;
  tester: string;
  method: string;
  result: TestResult;
  notes: string;
  evidenceIds: string[];
}

interface FindingContent {
  controlId: string | null;
  testId: string | null;
  title: string;
  description: string;
  severity: FindingSeverity;
  recommendation: string;
  status: FindingStatus;
  dueDate: string | null;
  resolution: string;
  remediatedBy: string;
  remediatedAt: string | null;
}

interface EvidenceContent {
  controlId: string | null;
  testId: string | null;
  name: string;
  type: EvidenceType;
  description: string;
  fileRef: string;
  collectedBy: string;
  collectedDate: string;
}

interface AuditReportContent {
  frameworkId: string;
  title: string;
  auditor: string;
  startDate: string;
  endDate: string | null;
  scope: string;
  summary: string;
  status: AuditReportStatus;
  findings: Array<{ id: string; title: string; severity: string }>;
  conclusion: string;
}

// ── Public interfaces ──

export interface ComplianceFramework {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  standard: FrameworkStandard;
  description: string;
  version: string;
  status: FrameworkStatus;
  requirements: Array<{ id: string; title: string; description: string }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceControl {
  id: string;
  organizationId: string;
  workspaceId: string;
  frameworkId: string;
  controlId: string;
  title: string;
  description: string;
  category: string;
  frequency: ControlFrequency;
  owner: string;
  status: ControlStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ControlTest {
  id: string;
  organizationId: string;
  workspaceId: string;
  controlId: string;
  testDate: Date;
  tester: string;
  method: string;
  result: TestResult;
  notes: string;
  evidenceIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditFinding {
  id: string;
  organizationId: string;
  workspaceId: string;
  controlId: string | null;
  testId: string | null;
  title: string;
  description: string;
  severity: FindingSeverity;
  recommendation: string;
  status: FindingStatus;
  dueDate: Date | null;
  resolution: string;
  remediatedBy: string;
  remediatedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceEvidence {
  id: string;
  organizationId: string;
  workspaceId: string;
  controlId: string | null;
  testId: string | null;
  name: string;
  type: EvidenceType;
  description: string;
  fileRef: string;
  collectedBy: string;
  collectedDate: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  frameworkId: string;
  title: string;
  auditor: string;
  startDate: Date;
  endDate: Date | null;
  scope: string;
  summary: string;
  status: AuditReportStatus;
  findings: Array<{ id: string; title: string; severity: string }>;
  conclusion: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceScore {
  totalControls: number;
  passingControls: number;
  score: number;
  byFramework: Array<{ frameworkId: string; frameworkName: string; totalControls: number; passingControls: number; score: number }>;
}

export interface ComplianceStats {
  frameworkCount: number;
  controlCount: number;
  testCount: number;
  findingCount: number;
  openFindingCount: number;
  evidenceCount: number;
  auditReportCount: number;
  complianceScore: number;
  byControlStatus: Record<string, number>;
  byFindingSeverity: Record<string, number>;
}

// ── Input / Options ──

export interface CreateFrameworkInput {
  name: string;
  standard?: FrameworkStandard;
  description?: string;
  version?: string;
  status?: FrameworkStatus;
  requirements?: Array<{ id: string; title: string; description: string }>;
}

export interface UpdateFrameworkInput {
  name?: string;
  standard?: FrameworkStandard;
  description?: string;
  version?: string;
  status?: FrameworkStatus;
  requirements?: Array<{ id: string; title: string; description: string }>;
}

export interface ListFrameworksOpts {
  standard?: FrameworkStandard;
  status?: FrameworkStatus;
}

export interface CreateControlInput {
  frameworkId: string;
  controlId: string;
  title: string;
  description?: string;
  category?: string;
  frequency?: ControlFrequency;
  owner?: string;
  status?: ControlStatus;
}

export interface UpdateControlInput {
  title?: string;
  description?: string;
  category?: string;
  frequency?: ControlFrequency;
  owner?: string;
  status?: ControlStatus;
}

export interface ListControlsOpts {
  frameworkId?: string;
  status?: ControlStatus;
  category?: string;
  owner?: string;
}

export interface CreateControlTestInput {
  controlId: string;
  testDate: string;
  tester: string;
  method?: string;
  result: TestResult;
  notes?: string;
  evidenceIds?: string[];
}

export interface UpdateControlTestInput {
  testDate?: string;
  tester?: string;
  method?: string;
  result?: TestResult;
  notes?: string;
  evidenceIds?: string[];
}

export interface ListControlTestsOpts {
  controlId?: string;
  result?: TestResult;
}

export interface CreateFindingInput {
  controlId?: string;
  testId?: string;
  title: string;
  description?: string;
  severity?: FindingSeverity;
  recommendation?: string;
  status?: FindingStatus;
  dueDate?: string;
}

export interface UpdateFindingInput {
  title?: string;
  description?: string;
  severity?: FindingSeverity;
  recommendation?: string;
  status?: FindingStatus;
  dueDate?: string;
}

export interface ListFindingsOpts {
  status?: FindingStatus;
  severity?: FindingSeverity;
  controlId?: string;
}

export interface CreateEvidenceInput {
  controlId?: string;
  testId?: string;
  name: string;
  type: EvidenceType;
  description?: string;
  fileRef?: string;
  collectedBy: string;
  collectedDate?: string;
}

export interface ListEvidenceOpts {
  controlId?: string;
  testId?: string;
  type?: EvidenceType;
}

export interface CreateAuditReportInput {
  frameworkId: string;
  title: string;
  auditor: string;
  startDate: string;
  endDate?: string;
  scope: string;
  summary?: string;
  status?: AuditReportStatus;
}

export interface UpdateAuditReportInput {
  title?: string;
  auditor?: string;
  startDate?: string;
  endDate?: string;
  scope?: string;
  summary?: string;
  status?: AuditReportStatus;
}

export interface ListAuditReportsOpts {
  frameworkId?: string;
  status?: AuditReportStatus;
}

// ── Helpers ──

const fallbackFramework: FrameworkContent = {
  name: '', standard: 'custom', description: '', version: '1.0', status: 'active', requirements: [],
};

const fallbackControl: ControlContent = {
  frameworkId: '', controlId: '', title: '', description: '', category: '', frequency: 'annually', owner: '', status: 'not_implemented',
};

const fallbackTest: ControlTestContent = {
  controlId: '', testDate: '', tester: '', method: '', result: 'pass', notes: '', evidenceIds: [],
};

const fallbackFinding: FindingContent = {
  controlId: null, testId: null, title: '', description: '', severity: 'medium', recommendation: '', status: 'open', dueDate: null, resolution: '', remediatedBy: '', remediatedAt: null,
};

const fallbackEvidence: EvidenceContent = {
  controlId: null, testId: null, name: '', type: 'other', description: '', fileRef: '', collectedBy: '', collectedDate: '',
};

const fallbackReport: AuditReportContent = {
  frameworkId: '', title: '', auditor: '', startDate: '', endDate: null, scope: '', summary: '', status: 'draft', findings: [], conclusion: '',
};

function parseFramework(raw: string): FrameworkContent {
  if (!raw) return fallbackFramework;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      standard: (p.standard as FrameworkStandard) ?? 'custom',
      description: p.description ?? '',
      version: p.version ?? '1.0',
      status: (p.status as FrameworkStatus) ?? 'active',
      requirements: Array.isArray(p.requirements) ? p.requirements : [],
    };
  } catch { return fallbackFramework; }
}

function parseControl(raw: string): ControlContent {
  if (!raw) return fallbackControl;
  try {
    const p = JSON.parse(raw);
    return {
      frameworkId: p.frameworkId ?? '',
      controlId: p.controlId ?? '',
      title: p.title ?? '',
      description: p.description ?? '',
      category: p.category ?? '',
      frequency: (p.frequency as ControlFrequency) ?? 'annually',
      owner: p.owner ?? '',
      status: (p.status as ControlStatus) ?? 'not_implemented',
    };
  } catch { return fallbackControl; }
}

function parseTest(raw: string): ControlTestContent {
  if (!raw) return fallbackTest;
  try {
    const p = JSON.parse(raw);
    return {
      controlId: p.controlId ?? '',
      testDate: p.testDate ?? '',
      tester: p.tester ?? '',
      method: p.method ?? '',
      result: (p.result as TestResult) ?? 'pass',
      notes: p.notes ?? '',
      evidenceIds: Array.isArray(p.evidenceIds) ? p.evidenceIds : [],
    };
  } catch { return fallbackTest; }
}

function parseFinding(raw: string): FindingContent {
  if (!raw) return fallbackFinding;
  try {
    const p = JSON.parse(raw);
    return {
      controlId: p.controlId ?? null,
      testId: p.testId ?? null,
      title: p.title ?? '',
      description: p.description ?? '',
      severity: (p.severity as FindingSeverity) ?? 'medium',
      recommendation: p.recommendation ?? '',
      status: (p.status as FindingStatus) ?? 'open',
      dueDate: p.dueDate ?? null,
      resolution: p.resolution ?? '',
      remediatedBy: p.remediatedBy ?? '',
      remediatedAt: p.remediatedAt ?? null,
    };
  } catch { return fallbackFinding; }
}

function parseEvidence(raw: string): EvidenceContent {
  if (!raw) return fallbackEvidence;
  try {
    const p = JSON.parse(raw);
    return {
      controlId: p.controlId ?? null,
      testId: p.testId ?? null,
      name: p.name ?? '',
      type: (p.type as EvidenceType) ?? 'other',
      description: p.description ?? '',
      fileRef: p.fileRef ?? '',
      collectedBy: p.collectedBy ?? '',
      collectedDate: p.collectedDate ?? '',
    };
  } catch { return fallbackEvidence; }
}

function parseReport(raw: string): AuditReportContent {
  if (!raw) return fallbackReport;
  try {
    const p = JSON.parse(raw);
    return {
      frameworkId: p.frameworkId ?? '',
      title: p.title ?? '',
      auditor: p.auditor ?? '',
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? null,
      scope: p.scope ?? '',
      summary: p.summary ?? '',
      status: (p.status as AuditReportStatus) ?? 'draft',
      findings: Array.isArray(p.findings) ? p.findings : [],
      conclusion: p.conclusion ?? '',
    };
  } catch { return fallbackReport; }
}

function toFramework(row: MemoryRow): ComplianceFramework {
  const c = parseFramework(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, standard: c.standard, description: c.description, version: c.version,
    status: c.status, requirements: c.requirements,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toControl(row: MemoryRow): ComplianceControl {
  const c = parseControl(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    frameworkId: c.frameworkId, controlId: c.controlId, title: c.title, description: c.description,
    category: c.category, frequency: c.frequency, owner: c.owner, status: c.status,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTest(row: MemoryRow): ControlTest {
  const c = parseTest(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    controlId: c.controlId, testDate: c.testDate ? new Date(c.testDate) : row.createdAt,
    tester: c.tester, method: c.method, result: c.result, notes: c.notes, evidenceIds: c.evidenceIds,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toFinding(row: MemoryRow): AuditFinding {
  const c = parseFinding(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    controlId: c.controlId, testId: c.testId, title: c.title, description: c.description,
    severity: c.severity, recommendation: c.recommendation, status: c.status,
    dueDate: c.dueDate ? new Date(c.dueDate) : null, resolution: c.resolution,
    remediatedBy: c.remediatedBy, remediatedAt: c.remediatedAt ? new Date(c.remediatedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEvidence(row: MemoryRow): ComplianceEvidence {
  const c = parseEvidence(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    controlId: c.controlId, testId: c.testId, name: c.name, type: c.type, description: c.description,
    fileRef: c.fileRef, collectedBy: c.collectedBy,
    collectedDate: c.collectedDate ? new Date(c.collectedDate) : row.createdAt,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toReport(row: MemoryRow): AuditReport {
  const c = parseReport(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    frameworkId: c.frameworkId, title: c.title, auditor: c.auditor,
    startDate: c.startDate ? new Date(c.startDate) : row.createdAt,
    endDate: c.endDate ? new Date(c.endDate) : null,
    scope: c.scope, summary: c.summary, status: c.status, findings: c.findings, conclusion: c.conclusion,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Compliance & Audit Service ──

export const ComplianceAuditService = {
  // ── Frameworks ──

  async createFramework(
    organizationId: string,
    workspaceId: string,
    input: CreateFrameworkInput,
    createdBy: string,
  ): Promise<ComplianceFramework> {
    const content: FrameworkContent = {
      name: input.name.trim(),
      standard: input.standard ?? 'custom',
      description: input.description ?? '',
      version: input.version ?? '1.0',
      status: input.status ?? 'active',
      requirements: input.requirements ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'compliance_framework',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['compliance_framework', content.standard, content.status]),
        createdBy,
      },
    });

    return toFramework(row as MemoryRow);
  },

  async getFramework(id: string): Promise<ComplianceFramework | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'compliance_framework') return null;
    return toFramework(row as MemoryRow);
  },

  async listFrameworks(organizationId: string, opts: ListFrameworksOpts = {}): Promise<ComplianceFramework[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'compliance_framework', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toFramework(r as MemoryRow));
    if (opts.standard) records = records.filter((f) => f.standard === opts.standard);
    if (opts.status) records = records.filter((f) => f.status === opts.status);
    return records;
  },

  async updateFramework(id: string, input: UpdateFrameworkInput): Promise<ComplianceFramework | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFramework(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.standard !== undefined) content.standard = input.standard;
    if (input.description !== undefined) content.description = input.description;
    if (input.version !== undefined) content.version = input.version;
    if (input.status !== undefined) content.status = input.status;
    if (input.requirements !== undefined) content.requirements = input.requirements;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['compliance_framework', content.standard, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toFramework(row as MemoryRow);
  },

  async deleteFramework(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Controls ──

  async createControl(
    organizationId: string,
    workspaceId: string,
    input: CreateControlInput,
    createdBy: string,
  ): Promise<ComplianceControl> {
    const content: ControlContent = {
      frameworkId: input.frameworkId,
      controlId: input.controlId.trim(),
      title: input.title.trim(),
      description: input.description ?? '',
      category: input.category ?? '',
      frequency: input.frequency ?? 'annually',
      owner: input.owner ?? '',
      status: input.status ?? 'not_implemented',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'compliance_control',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.frameworkId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['compliance_control', content.status, content.category]),
        createdBy,
      },
    });

    return toControl(row as MemoryRow);
  },

  async getControl(id: string): Promise<ComplianceControl | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'compliance_control') return null;
    return toControl(row as MemoryRow);
  },

  async listControls(organizationId: string, opts: ListControlsOpts = {}): Promise<ComplianceControl[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'compliance_control', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toControl(r as MemoryRow));
    if (opts.frameworkId) records = records.filter((c) => c.frameworkId === opts.frameworkId);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    if (opts.category) records = records.filter((c) => c.category === opts.category);
    if (opts.owner) records = records.filter((c) => c.owner === opts.owner);
    return records;
  },

  async updateControl(id: string, input: UpdateControlInput): Promise<ComplianceControl | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseControl(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.frequency !== undefined) content.frequency = input.frequency;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['compliance_control', content.status, content.category]),
        },
      }), null,
    );
    if (!row) return null;
    return toControl(row as MemoryRow);
  },

  async deleteControl(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Control Tests ──

  async createControlTest(
    organizationId: string,
    workspaceId: string,
    input: CreateControlTestInput,
    createdBy: string,
  ): Promise<ControlTest> {
    const content: ControlTestContent = {
      controlId: input.controlId,
      testDate: input.testDate,
      tester: input.tester.trim(),
      method: input.method ?? '',
      result: input.result,
      notes: input.notes ?? '',
      evidenceIds: input.evidenceIds ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'control_test',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.controlId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['control_test', content.result]),
        createdBy,
      },
    });

    return toTest(row as MemoryRow);
  },

  async getControlTest(id: string): Promise<ControlTest | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'control_test') return null;
    return toTest(row as MemoryRow);
  },

  async listControlTests(organizationId: string, opts: ListControlTestsOpts = {}): Promise<ControlTest[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'control_test', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTest(r as MemoryRow));
    if (opts.controlId) records = records.filter((t) => t.controlId === opts.controlId);
    if (opts.result) records = records.filter((t) => t.result === opts.result);
    return records;
  },

  async updateControlTest(id: string, input: UpdateControlTestInput): Promise<ControlTest | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTest(existing.content);
    if (input.testDate !== undefined) content.testDate = input.testDate;
    if (input.tester !== undefined) content.tester = input.tester;
    if (input.method !== undefined) content.method = input.method;
    if (input.result !== undefined) content.result = input.result;
    if (input.notes !== undefined) content.notes = input.notes;
    if (input.evidenceIds !== undefined) content.evidenceIds = input.evidenceIds;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['control_test', content.result]),
        },
      }), null,
    );
    if (!row) return null;
    return toTest(row as MemoryRow);
  },

  // ── Findings ──

  async createFinding(
    organizationId: string,
    workspaceId: string,
    input: CreateFindingInput,
    createdBy: string,
  ): Promise<AuditFinding> {
    const content: FindingContent = {
      controlId: input.controlId ?? null,
      testId: input.testId ?? null,
      title: input.title.trim(),
      description: input.description ?? '',
      severity: input.severity ?? 'medium',
      recommendation: input.recommendation ?? '',
      status: input.status ?? 'open',
      dueDate: input.dueDate ?? null,
      resolution: '',
      remediatedBy: '',
      remediatedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'audit_finding',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.controlId ?? input.testId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['audit_finding', content.severity, content.status]),
        createdBy,
      },
    });

    return toFinding(row as MemoryRow);
  },

  async getFinding(id: string): Promise<AuditFinding | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'audit_finding') return null;
    return toFinding(row as MemoryRow);
  },

  async listFindings(organizationId: string, opts: ListFindingsOpts = {}): Promise<AuditFinding[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'audit_finding', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toFinding(r as MemoryRow));
    if (opts.status) records = records.filter((f) => f.status === opts.status);
    if (opts.severity) records = records.filter((f) => f.severity === opts.severity);
    if (opts.controlId) records = records.filter((f) => f.controlId === opts.controlId);
    return records;
  },

  async updateFinding(id: string, input: UpdateFindingInput): Promise<AuditFinding | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFinding(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.severity !== undefined) content.severity = input.severity;
    if (input.recommendation !== undefined) content.recommendation = input.recommendation;
    if (input.status !== undefined) content.status = input.status;
    if (input.dueDate !== undefined) content.dueDate = input.dueDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['audit_finding', content.severity, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toFinding(row as MemoryRow);
  },

  async remediateFinding(id: string, resolution: string, remediatedBy: string): Promise<AuditFinding | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFinding(existing.content);
    content.status = 'remediated';
    content.resolution = resolution;
    content.remediatedBy = remediatedBy;
    content.remediatedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['audit_finding', content.severity, 'remediated']),
        },
      }), null,
    );
    if (!row) return null;
    return toFinding(row as MemoryRow);
  },

  // ── Evidence ──

  async createEvidence(
    organizationId: string,
    workspaceId: string,
    input: CreateEvidenceInput,
    createdBy: string,
  ): Promise<ComplianceEvidence> {
    const content: EvidenceContent = {
      controlId: input.controlId ?? null,
      testId: input.testId ?? null,
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      fileRef: input.fileRef ?? '',
      collectedBy: input.collectedBy.trim(),
      collectedDate: input.collectedDate ?? new Date().toISOString(),
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'evidence',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.controlId ?? input.testId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['evidence', content.type]),
        createdBy,
      },
    });

    return toEvidence(row as MemoryRow);
  },

  async getEvidence(id: string): Promise<ComplianceEvidence | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'evidence') return null;
    return toEvidence(row as MemoryRow);
  },

  async listEvidence(organizationId: string, opts: ListEvidenceOpts = {}): Promise<ComplianceEvidence[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'evidence', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toEvidence(r as MemoryRow));
    if (opts.controlId) records = records.filter((e) => e.controlId === opts.controlId);
    if (opts.testId) records = records.filter((e) => e.testId === opts.testId);
    if (opts.type) records = records.filter((e) => e.type === opts.type);
    return records;
  },

  async deleteEvidence(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Audit Reports ──

  async createAuditReport(
    organizationId: string,
    workspaceId: string,
    input: CreateAuditReportInput,
    createdBy: string,
  ): Promise<AuditReport> {
    const content: AuditReportContent = {
      frameworkId: input.frameworkId,
      title: input.title.trim(),
      auditor: input.auditor.trim(),
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      scope: input.scope,
      summary: input.summary ?? '',
      status: input.status ?? 'draft',
      findings: [],
      conclusion: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'audit_report',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.frameworkId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['audit_report', content.status]),
        createdBy,
      },
    });

    return toReport(row as MemoryRow);
  },

  async getAuditReport(id: string): Promise<AuditReport | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'audit_report') return null;
    return toReport(row as MemoryRow);
  },

  async listAuditReports(organizationId: string, opts: ListAuditReportsOpts = {}): Promise<AuditReport[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'audit_report', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toReport(r as MemoryRow));
    if (opts.frameworkId) records = records.filter((r) => r.frameworkId === opts.frameworkId);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    return records;
  },

  async updateAuditReport(id: string, input: UpdateAuditReportInput): Promise<AuditReport | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseReport(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.auditor !== undefined) content.auditor = input.auditor;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.scope !== undefined) content.scope = input.scope;
    if (input.summary !== undefined) content.summary = input.summary;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['audit_report', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  async finalizeAuditReport(
    id: string,
    findings: Array<{ id: string; title: string; severity: string }>,
    conclusion: string,
  ): Promise<AuditReport | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseReport(existing.content);
    content.findings = findings;
    content.conclusion = conclusion;
    content.status = 'finalized';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['audit_report', 'finalized']),
        },
      }), null,
    );
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  // ── Compliance Score ──

  async getComplianceScore(organizationId: string, opts: { frameworkId?: string } = {}): Promise<ComplianceScore> {
    const controls = await ComplianceAuditService.listControls(organizationId, opts.frameworkId ? { frameworkId: opts.frameworkId } : {});
    const tests = await ComplianceAuditService.listControlTests(organizationId);

    const testByControl = new Map<string, ControlTest>();
    for (const t of tests) {
      const existing = testByControl.get(t.controlId);
      if (!existing || t.testDate > existing.testDate) {
        testByControl.set(t.controlId, t);
      }
    }

    const frameworks = await ComplianceAuditService.listFrameworks(organizationId);
    const frameworkMap = new Map(frameworks.map((f) => [f.id, f]));

    const byFrameworkMap = new Map<string, { totalControls: number; passingControls: number }>();

    let totalControls = 0;
    let passingControls = 0;

    for (const c of controls) {
      totalControls++;
      const latestTest = testByControl.get(c.id);
      const isPassing = c.status === 'implemented' || (latestTest?.result === 'pass');
      if (isPassing) passingControls++;

      const fw = c.frameworkId;
      if (!byFrameworkMap.has(fw)) byFrameworkMap.set(fw, { totalControls: 0, passingControls: 0 });
      const entry = byFrameworkMap.get(fw)!;
      entry.totalControls++;
      if (isPassing) entry.passingControls++;
    }

    const byFramework = Array.from(byFrameworkMap.entries()).map(([fwId, data]) => ({
      frameworkId: fwId,
      frameworkName: frameworkMap.get(fwId)?.name ?? 'Unknown',
      totalControls: data.totalControls,
      passingControls: data.passingControls,
      score: data.totalControls > 0 ? Math.round((data.passingControls / data.totalControls) * 100) : 0,
    }));

    return {
      totalControls,
      passingControls,
      score: totalControls > 0 ? Math.round((passingControls / totalControls) * 100) : 0,
      byFramework,
    };
  },

  // ── Gap Analysis ──

  async getGapAnalysis(organizationId: string, opts: { frameworkId?: string } = {}): Promise<ComplianceControl[]> {
    const controls = await ComplianceAuditService.listControls(organizationId, opts.frameworkId ? { frameworkId: opts.frameworkId } : {});
    return controls.filter((c) => c.status === 'gap' || c.status === 'not_implemented');
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<ComplianceStats> {
    const [frameworks, controls, tests, findings, evidence, reports, score] = await Promise.all([
      ComplianceAuditService.listFrameworks(organizationId),
      ComplianceAuditService.listControls(organizationId),
      ComplianceAuditService.listControlTests(organizationId),
      ComplianceAuditService.listFindings(organizationId),
      ComplianceAuditService.listEvidence(organizationId),
      ComplianceAuditService.listAuditReports(organizationId),
      ComplianceAuditService.getComplianceScore(organizationId),
    ]);

    const byControlStatus: Record<string, number> = {};
    for (const c of controls) {
      byControlStatus[c.status] = (byControlStatus[c.status] || 0) + 1;
    }

    const byFindingSeverity: Record<string, number> = {};
    let openFindingCount = 0;
    for (const f of findings) {
      byFindingSeverity[f.severity] = (byFindingSeverity[f.severity] || 0) + 1;
      if (f.status === 'open') openFindingCount++;
    }

    return {
      frameworkCount: frameworks.length,
      controlCount: controls.length,
      testCount: tests.length,
      findingCount: findings.length,
      openFindingCount,
      evidenceCount: evidence.length,
      auditReportCount: reports.length,
      complianceScore: score.score,
      byControlStatus,
      byFindingSeverity,
    };
  },
};
