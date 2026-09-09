import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ApplicationType = 'utility' | 'design' | 'plant' | 'provisional' | 'pct' | 'continuation' | 'divisional' | 'reissue';
export type ApplicationStatus = 'draft' | 'filed' | 'under_examination' | 'office_action' | 'granted' | 'rejected' | 'abandoned' | 'expired';
export type DocumentType = 'specification' | 'claims' | 'drawings' | 'oath' | 'assignment' | 'response' | 'amendment' | 'search_report' | 'correspondence' | 'other';
export type LicenseType = 'exclusive' | 'non_exclusive' | 'cross_license' | 'sublicense' | 'compulsory' | 'research_only' | 'field_of_use';
export type LicenseStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'revoked' | 'pending';
export type MaintenanceType = 'renewal' | 'annuity' | 'continuation_fee' | 'examination_fee' | 'issue_fee' | 'extension_fee' | 'restoration_fee';
export type MaintenanceStatus = 'pending' | 'paid' | 'overdue' | 'lapsed' | 'waived';

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

export interface PatentApplication {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ApplicationType;
  description: string;
  status: ApplicationStatus;
  applicationNumber: string;
  filingDate: Date | null;
  priorityDate: Date | null;
  inventor: string;
  assignee: string;
  jurisdiction: string;
  classification: string;
  abstract: string;
  claims: string;
  statusDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatentDocument {
  id: string;
  organizationId: string;
  workspaceId: string;
  applicationId: string;
  type: DocumentType;
  title: string;
  description: string;
  status: string;
  fileName: string;
  fileUrl: string;
  filedDate: Date | null;
  pageCount: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatentLicense {
  id: string;
  organizationId: string;
  workspaceId: string;
  applicationId: string;
  licensee: string;
  type: LicenseType;
  description: string;
  status: LicenseStatus;
  startDate: Date | null;
  endDate: Date | null;
  royaltyRate: number;
  upfrontFee: number;
  territory: string;
  fieldOfUse: string;
  terms: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatentMaintenance {
  id: string;
  organizationId: string;
  workspaceId: string;
  applicationId: string;
  type: MaintenanceType;
  amount: number;
  currency: string;
  status: MaintenanceStatus;
  dueDate: Date | null;
  paidDate: Date | null;
  jurisdiction: string;
  description: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatentManagementMetrics {
  totalApplications: number;
  grantedPatents: number;
  pendingExamination: number;
  activeLicenses: number;
  pendingMaintenanceFees: number;
}

export interface PatentManagementStats {
  applicationCount: number;
  documentCount: number;
  licenseCount: number;
  maintenanceCount: number;
  byApplicationType: Record<string, number>;
  byApplicationStatus: Record<string, number>;
  byLicenseType: Record<string, number>;
  byLicenseStatus: Record<string, number>;
  byMaintenanceType: Record<string, number>;
  byMaintenanceStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateApplicationInput {
  title: string;
  type: ApplicationType;
  description?: string;
  status?: ApplicationStatus;
  applicationNumber?: string;
  filingDate?: string;
  priorityDate?: string;
  inventor?: string;
  assignee?: string;
  jurisdiction?: string;
  classification?: string;
  abstract?: string;
  claims?: string;
  statusDate?: string;
  notes?: string;
}

export interface UpdateApplicationInput {
  title?: string;
  type?: ApplicationType;
  description?: string;
  status?: ApplicationStatus;
  applicationNumber?: string;
  filingDate?: string;
  priorityDate?: string;
  inventor?: string;
  assignee?: string;
  jurisdiction?: string;
  classification?: string;
  abstract?: string;
  claims?: string;
  statusDate?: string;
  notes?: string;
}

export interface ListApplicationsOpts {
  type?: ApplicationType;
  status?: ApplicationStatus;
}

export interface CreateDocumentInput {
  applicationId: string;
  type: DocumentType;
  title: string;
  description?: string;
  status?: string;
  fileName?: string;
  fileUrl?: string;
  filedDate?: string;
  pageCount?: number;
  notes?: string;
}

export interface UpdateDocumentInput {
  type?: DocumentType;
  title?: string;
  description?: string;
  status?: string;
  fileName?: string;
  fileUrl?: string;
  filedDate?: string;
  pageCount?: number;
  notes?: string;
}

export interface ListDocumentsOpts {
  applicationId?: string;
  type?: DocumentType;
}

export interface CreateLicenseInput {
  applicationId: string;
  licensee: string;
  type: LicenseType;
  description?: string;
  status?: LicenseStatus;
  startDate?: string;
  endDate?: string;
  royaltyRate?: number;
  upfrontFee?: number;
  territory?: string;
  fieldOfUse?: string;
  terms?: string;
  notes?: string;
}

export interface UpdateLicenseInput {
  licensee?: string;
  type?: LicenseType;
  description?: string;
  status?: LicenseStatus;
  startDate?: string;
  endDate?: string;
  royaltyRate?: number;
  upfrontFee?: number;
  territory?: string;
  fieldOfUse?: string;
  terms?: string;
  notes?: string;
}

export interface ListLicensesOpts {
  applicationId?: string;
  type?: LicenseType;
  status?: LicenseStatus;
}

export interface CreateMaintenanceInput {
  applicationId: string;
  type: MaintenanceType;
  amount: number;
  currency?: string;
  status?: MaintenanceStatus;
  dueDate?: string;
  paidDate?: string;
  jurisdiction?: string;
  description?: string;
  notes?: string;
}

export interface UpdateMaintenanceInput {
  type?: MaintenanceType;
  amount?: number;
  currency?: string;
  status?: MaintenanceStatus;
  dueDate?: string;
  paidDate?: string;
  jurisdiction?: string;
  description?: string;
  notes?: string;
}

export interface ListMaintenanceOpts {
  applicationId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toApplication(row: MemoryRow): PatentApplication {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as ApplicationType) ?? 'utility',
    description: (c.description as string) ?? '',
    status: (c.status as ApplicationStatus) ?? 'draft',
    applicationNumber: (c.applicationNumber as string) ?? '',
    filingDate: c.filingDate ? new Date(c.filingDate as string) : null,
    priorityDate: c.priorityDate ? new Date(c.priorityDate as string) : null,
    inventor: (c.inventor as string) ?? '',
    assignee: (c.assignee as string) ?? '',
    jurisdiction: (c.jurisdiction as string) ?? '',
    classification: (c.classification as string) ?? '',
    abstract: (c.abstract as string) ?? '',
    claims: (c.claims as string) ?? '',
    statusDate: c.statusDate ? new Date(c.statusDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDocument(row: MemoryRow): PatentDocument {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    applicationId: (c.applicationId as string) ?? '',
    type: (c.type as DocumentType) ?? 'other',
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    status: (c.status as string) ?? '',
    fileName: (c.fileName as string) ?? '',
    fileUrl: (c.fileUrl as string) ?? '',
    filedDate: c.filedDate ? new Date(c.filedDate as string) : null,
    pageCount: (c.pageCount as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLicense(row: MemoryRow): PatentLicense {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    applicationId: (c.applicationId as string) ?? '',
    licensee: (c.licensee as string) ?? '',
    type: (c.type as LicenseType) ?? 'non_exclusive',
    description: (c.description as string) ?? '',
    status: (c.status as LicenseStatus) ?? 'draft',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    royaltyRate: (c.royaltyRate as number) ?? 0,
    upfrontFee: (c.upfrontFee as number) ?? 0,
    territory: (c.territory as string) ?? '',
    fieldOfUse: (c.fieldOfUse as string) ?? '',
    terms: (c.terms as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMaintenance(row: MemoryRow): PatentMaintenance {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    applicationId: (c.applicationId as string) ?? '',
    type: (c.type as MaintenanceType) ?? 'renewal',
    amount: (c.amount as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    status: (c.status as MaintenanceStatus) ?? 'pending',
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    paidDate: c.paidDate ? new Date(c.paidDate as string) : null,
    jurisdiction: (c.jurisdiction as string) ?? '',
    description: (c.description as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const PatentManagementService = {
  // ── Applications ──

  async createApplication(organizationId: string, workspaceId: string, input: CreateApplicationInput, createdBy: string): Promise<PatentApplication> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      applicationNumber: input.applicationNumber ?? '',
      filingDate: input.filingDate ?? null,
      priorityDate: input.priorityDate ?? null,
      inventor: input.inventor ?? '',
      assignee: input.assignee ?? '',
      jurisdiction: input.jurisdiction ?? '',
      classification: input.classification ?? '',
      abstract: input.abstract ?? '',
      claims: input.claims ?? '',
      statusDate: input.statusDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'patent_application',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['patent_application', content.type, content.status]),
        createdBy,
      },
    });
    return toApplication(row as MemoryRow);
  },

  async getApplication(id: string): Promise<PatentApplication | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'patent_application') return null;
    return toApplication(row as MemoryRow);
  },

  async listApplications(organizationId: string, opts: ListApplicationsOpts = {}): Promise<PatentApplication[]> {
    const where: Record<string, unknown> = { organizationId, type: 'patent_application' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toApplication);
  },

  async updateApplication(id: string, input: UpdateApplicationInput): Promise<PatentApplication | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.applicationNumber !== undefined && { applicationNumber: input.applicationNumber }),
      ...(input.filingDate !== undefined && { filingDate: input.filingDate }),
      ...(input.priorityDate !== undefined && { priorityDate: input.priorityDate }),
      ...(input.inventor !== undefined && { inventor: input.inventor }),
      ...(input.assignee !== undefined && { assignee: input.assignee }),
      ...(input.jurisdiction !== undefined && { jurisdiction: input.jurisdiction }),
      ...(input.classification !== undefined && { classification: input.classification }),
      ...(input.abstract !== undefined && { abstract: input.abstract }),
      ...(input.claims !== undefined && { claims: input.claims }),
      ...(input.statusDate !== undefined && { statusDate: input.statusDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['patent_application', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toApplication(row as MemoryRow);
  },

  async deleteApplication(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async fileApplication(id: string, _filedBy: string): Promise<PatentApplication | null> {
    return PatentManagementService.updateApplication(id, { status: 'filed', statusDate: new Date().toISOString() });
  },

  async examineApplication(id: string, _examinedBy: string): Promise<PatentApplication | null> {
    return PatentManagementService.updateApplication(id, { status: 'under_examination', statusDate: new Date().toISOString() });
  },

  async officeAction(id: string, _actionedBy: string): Promise<PatentApplication | null> {
    return PatentManagementService.updateApplication(id, { status: 'office_action', statusDate: new Date().toISOString() });
  },

  async grantApplication(id: string, _grantedBy: string): Promise<PatentApplication | null> {
    return PatentManagementService.updateApplication(id, { status: 'granted', statusDate: new Date().toISOString() });
  },

  async rejectApplication(id: string, _rejectedBy: string): Promise<PatentApplication | null> {
    return PatentManagementService.updateApplication(id, { status: 'rejected', statusDate: new Date().toISOString() });
  },

  async abandonApplication(id: string, _abandonedBy: string): Promise<PatentApplication | null> {
    return PatentManagementService.updateApplication(id, { status: 'abandoned', statusDate: new Date().toISOString() });
  },

  // ── Documents ──

  async createDocument(organizationId: string, workspaceId: string, input: CreateDocumentInput, createdBy: string): Promise<PatentDocument> {
    const content = {
      applicationId: input.applicationId,
      type: input.type,
      title: input.title.trim(),
      description: input.description ?? '',
      status: input.status ?? '',
      fileName: input.fileName ?? '',
      fileUrl: input.fileUrl ?? '',
      filedDate: input.filedDate ?? null,
      pageCount: input.pageCount ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'patent_document',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.applicationId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['patent_document', content.type]),
        createdBy,
      },
    });
    return toDocument(row as MemoryRow);
  },

  async getDocument(id: string): Promise<PatentDocument | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'patent_document') return null;
    return toDocument(row as MemoryRow);
  },

  async listDocuments(organizationId: string, opts: ListDocumentsOpts = {}): Promise<PatentDocument[]> {
    const where: Record<string, unknown> = { organizationId, type: 'patent_document' };
    const conditions: unknown[] = [];
    if (opts.applicationId) conditions.push({ content: { contains: `"applicationId":"${opts.applicationId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDocument);
  },

  async updateDocument(id: string, input: UpdateDocumentInput): Promise<PatentDocument | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.fileName !== undefined && { fileName: input.fileName }),
      ...(input.fileUrl !== undefined && { fileUrl: input.fileUrl }),
      ...(input.filedDate !== undefined && { filedDate: input.filedDate }),
      ...(input.pageCount !== undefined && { pageCount: input.pageCount }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['patent_document', content.type]) },
    }), null);
    if (!row) return null;
    return toDocument(row as MemoryRow);
  },

  async deleteDocument(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Licenses ──

  async createLicense(organizationId: string, workspaceId: string, input: CreateLicenseInput, createdBy: string): Promise<PatentLicense> {
    const content = {
      applicationId: input.applicationId,
      licensee: input.licensee.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      royaltyRate: input.royaltyRate ?? 0,
      upfrontFee: input.upfrontFee ?? 0,
      territory: input.territory ?? '',
      fieldOfUse: input.fieldOfUse ?? '',
      terms: input.terms ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'patent_license',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.applicationId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['patent_license', content.type, content.status]),
        createdBy,
      },
    });
    return toLicense(row as MemoryRow);
  },

  async getLicense(id: string): Promise<PatentLicense | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'patent_license') return null;
    return toLicense(row as MemoryRow);
  },

  async listLicenses(organizationId: string, opts: ListLicensesOpts = {}): Promise<PatentLicense[]> {
    const where: Record<string, unknown> = { organizationId, type: 'patent_license' };
    const conditions: unknown[] = [];
    if (opts.applicationId) conditions.push({ content: { contains: `"applicationId":"${opts.applicationId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toLicense);
  },

  async updateLicense(id: string, input: UpdateLicenseInput): Promise<PatentLicense | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.licensee !== undefined && { licensee: input.licensee.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.royaltyRate !== undefined && { royaltyRate: input.royaltyRate }),
      ...(input.upfrontFee !== undefined && { upfrontFee: input.upfrontFee }),
      ...(input.territory !== undefined && { territory: input.territory }),
      ...(input.fieldOfUse !== undefined && { fieldOfUse: input.fieldOfUse }),
      ...(input.terms !== undefined && { terms: input.terms }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['patent_license', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toLicense(row as MemoryRow);
  },

  async deleteLicense(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateLicense(id: string, _activatedBy: string): Promise<PatentLicense | null> {
    return PatentManagementService.updateLicense(id, { status: 'active' });
  },

  async expireLicense(id: string, _expiredBy: string): Promise<PatentLicense | null> {
    return PatentManagementService.updateLicense(id, { status: 'expired' });
  },

  async terminateLicense(id: string, _terminatedBy: string): Promise<PatentLicense | null> {
    return PatentManagementService.updateLicense(id, { status: 'terminated' });
  },

  async revokeLicense(id: string, _revokedBy: string): Promise<PatentLicense | null> {
    return PatentManagementService.updateLicense(id, { status: 'revoked' });
  },

  // ── Maintenance ──

  async createMaintenance(organizationId: string, workspaceId: string, input: CreateMaintenanceInput, createdBy: string): Promise<PatentMaintenance> {
    const content = {
      applicationId: input.applicationId,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'pending',
      dueDate: input.dueDate ?? null,
      paidDate: input.paidDate ?? null,
      jurisdiction: input.jurisdiction ?? '',
      description: input.description ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'patent_maintenance',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.applicationId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['patent_maintenance', content.type, content.status]),
        createdBy,
      },
    });
    return toMaintenance(row as MemoryRow);
  },

  async getMaintenance(id: string): Promise<PatentMaintenance | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'patent_maintenance') return null;
    return toMaintenance(row as MemoryRow);
  },

  async listMaintenance(organizationId: string, opts: ListMaintenanceOpts = {}): Promise<PatentMaintenance[]> {
    const where: Record<string, unknown> = { organizationId, type: 'patent_maintenance' };
    const conditions: unknown[] = [];
    if (opts.applicationId) conditions.push({ content: { contains: `"applicationId":"${opts.applicationId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMaintenance);
  },

  async updateMaintenance(id: string, input: UpdateMaintenanceInput): Promise<PatentMaintenance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.paidDate !== undefined && { paidDate: input.paidDate }),
      ...(input.jurisdiction !== undefined && { jurisdiction: input.jurisdiction }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['patent_maintenance', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toMaintenance(row as MemoryRow);
  },

  async deleteMaintenance(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async payMaintenance(id: string, _paidBy: string): Promise<PatentMaintenance | null> {
    return PatentManagementService.updateMaintenance(id, { status: 'paid', paidDate: new Date().toISOString() });
  },

  async overdueMaintenance(id: string, _markedBy: string): Promise<PatentMaintenance | null> {
    return PatentManagementService.updateMaintenance(id, { status: 'overdue' });
  },

  async lapseMaintenance(id: string, _lapsedBy: string): Promise<PatentMaintenance | null> {
    return PatentManagementService.updateMaintenance(id, { status: 'lapsed' });
  },

  async waiveMaintenance(id: string, _waivedBy: string): Promise<PatentMaintenance | null> {
    return PatentManagementService.updateMaintenance(id, { status: 'waived' });
  },

  // ── Metrics & Stats ──

  async getPatentManagementMetrics(organizationId: string): Promise<PatentManagementMetrics> {
    const [applications, licenses, maintenance] = await Promise.all([
      PatentManagementService.listApplications(organizationId),
      PatentManagementService.listLicenses(organizationId),
      PatentManagementService.listMaintenance(organizationId),
    ]);
    const totalApplications = applications.length;
    const grantedPatents = applications.filter((a) => a.status === 'granted').length;
    const pendingExamination = applications.filter((a) => a.status === 'under_examination' || a.status === 'office_action').length;
    const activeLicenses = licenses.filter((l) => l.status === 'active').length;
    const pendingMaintenanceFees = maintenance.filter((m) => m.status === 'pending').length;
    return { totalApplications, grantedPatents, pendingExamination, activeLicenses, pendingMaintenanceFees };
  },

  async getPatentManagementStats(organizationId: string): Promise<PatentManagementStats> {
    const [applications, documents, licenses, maintenance] = await Promise.all([
      PatentManagementService.listApplications(organizationId),
      PatentManagementService.listDocuments(organizationId),
      PatentManagementService.listLicenses(organizationId),
      PatentManagementService.listMaintenance(organizationId),
    ]);
    const byApplicationType: Record<string, number> = {};
    const byApplicationStatus: Record<string, number> = {};
    const byLicenseType: Record<string, number> = {};
    const byLicenseStatus: Record<string, number> = {};
    const byMaintenanceType: Record<string, number> = {};
    const byMaintenanceStatus: Record<string, number> = {};
    for (const a of applications) { byApplicationType[a.type] = (byApplicationType[a.type] ?? 0) + 1; byApplicationStatus[a.status] = (byApplicationStatus[a.status] ?? 0) + 1; }
    for (const l of licenses) { byLicenseType[l.type] = (byLicenseType[l.type] ?? 0) + 1; byLicenseStatus[l.status] = (byLicenseStatus[l.status] ?? 0) + 1; }
    for (const m of maintenance) { byMaintenanceType[m.type] = (byMaintenanceType[m.type] ?? 0) + 1; byMaintenanceStatus[m.status] = (byMaintenanceStatus[m.status] ?? 0) + 1; }
    return {
      applicationCount: applications.length,
      documentCount: documents.length,
      licenseCount: licenses.length,
      maintenanceCount: maintenance.length,
      byApplicationType, byApplicationStatus, byLicenseType, byLicenseStatus, byMaintenanceType, byMaintenanceStatus,
    };
  },
};
