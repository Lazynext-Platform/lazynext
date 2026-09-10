import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type RecordType = 'financial' | 'legal' | 'personnel' | 'corporate' | 'operational' | 'historical' | 'communications' | 'board' | 'compliance' | 'property' | 'marketing' | 'technical';
export type RecordStatus = 'active' | 'archived' | 'destroyed' | 'transferred' | 'restricted' | 'pending_review';
export type CollectionType = 'corporate_history' | 'executive_papers' | 'product_archive' | 'marketing_archive' | 'legal_archive' | 'financial_archive' | 'photo_archive' | 'av_archive' | 'digital_archive';
export type CollectionStatus = 'open' | 'closed' | 'processing' | 'restricted' | 'deprecated';
export type AccessType = 'research' | 'legal_hold' | 'audit' | 'exhibition' | 'publication' | 'internal' | 'external' | 'foia';
export type AccessStatus = 'requested' | 'approved' | 'denied' | 'fulfilled' | 'expired' | 'revoked';
export type DigitizationType = 'document' | 'photo' | 'audio' | 'video' | 'blueprint' | 'microfilm' | 'map' | 'artifact_3d';
export type DigitizationStatus = 'planned' | 'in_progress' | 'completed' | 'failed' | 'quality_check' | 're_digitized';

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

export interface ArchiveRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: RecordType;
  description: string;
  status: RecordStatus;
  collectionId: string | null;
  dateCreated: Date | null;
  dateArchived: Date | null;
  retentionPeriod: string;
  location: string;
  boxNumber: string;
  folderNumber: string;
  format: string;
  restricted: boolean;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArchiveCollection {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CollectionType;
  description: string;
  status: CollectionStatus;
  curator: string;
  dateRange: string;
  extent: string;
  accessPolicy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArchiveAccess {
  id: string;
  organizationId: string;
  workspaceId: string;
  recordId: string | null;
  collectionId: string | null;
  requester: string;
  type: AccessType;
  description: string;
  status: AccessStatus;
  requestDate: Date | null;
  approvalDate: Date | null;
  fulfillmentDate: Date | null;
  purpose: string;
  restrictions: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArchiveDigitization {
  id: string;
  organizationId: string;
  workspaceId: string;
  recordId: string;
  type: DigitizationType;
  description: string;
  status: DigitizationStatus;
  priority: string;
  assignedTo: string;
  startDate: Date | null;
  completedDate: Date | null;
  fileFormat: string;
  fileSize: number;
  resolution: string;
  qualityScore: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorporateArchivesMetrics {
  activeRecords: number;
  archivedRecords: number;
  openCollections: number;
  pendingAccessRequests: number;
  inProgressDigitization: number;
}

export interface CorporateArchivesStats {
  recordCount: number;
  activeRecordCount: number;
  archivedRecordCount: number;
  collectionCount: number;
  openCollectionCount: number;
  accessCount: number;
  pendingAccessCount: number;
  digitizationCount: number;
  inProgressDigitizationCount: number;
  byRecordType: Record<string, number>;
  byRecordStatus: Record<string, number>;
  byCollectionType: Record<string, number>;
  byCollectionStatus: Record<string, number>;
  byAccessType: Record<string, number>;
  byAccessStatus: Record<string, number>;
  byDigitizationType: Record<string, number>;
  byDigitizationStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateRecordInput {
  title: string;
  type: RecordType;
  description?: string;
  status?: RecordStatus;
  collectionId?: string;
  dateCreated?: string;
  dateArchived?: string;
  retentionPeriod?: string;
  location?: string;
  boxNumber?: string;
  folderNumber?: string;
  format?: string;
  restricted?: boolean;
  notes?: string;
}

export interface UpdateRecordInput {
  title?: string;
  type?: RecordType;
  description?: string;
  status?: RecordStatus;
  collectionId?: string;
  dateCreated?: string;
  dateArchived?: string;
  retentionPeriod?: string;
  location?: string;
  boxNumber?: string;
  folderNumber?: string;
  format?: string;
  restricted?: boolean;
  notes?: string;
}

export interface ListRecordsOpts {
  type?: RecordType;
  status?: RecordStatus;
  collectionId?: string;
}

export interface CreateCollectionInput {
  name: string;
  type: CollectionType;
  description?: string;
  status?: CollectionStatus;
  curator?: string;
  dateRange?: string;
  extent?: string;
  accessPolicy?: string;
  notes?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  type?: CollectionType;
  description?: string;
  status?: CollectionStatus;
  curator?: string;
  dateRange?: string;
  extent?: string;
  accessPolicy?: string;
  notes?: string;
}

export interface ListCollectionsOpts {
  type?: CollectionType;
  status?: CollectionStatus;
}

export interface CreateAccessInput {
  recordId?: string;
  collectionId?: string;
  requester: string;
  type: AccessType;
  description?: string;
  status?: AccessStatus;
  requestDate?: string;
  approvalDate?: string;
  fulfillmentDate?: string;
  purpose?: string;
  restrictions?: string;
  notes?: string;
}

export interface UpdateAccessInput {
  recordId?: string;
  collectionId?: string;
  requester?: string;
  type?: AccessType;
  description?: string;
  status?: AccessStatus;
  requestDate?: string;
  approvalDate?: string;
  fulfillmentDate?: string;
  purpose?: string;
  restrictions?: string;
  notes?: string;
}

export interface ListAccessOpts {
  type?: AccessType;
  status?: AccessStatus;
}

export interface CreateDigitizationInput {
  recordId: string;
  type: DigitizationType;
  description?: string;
  status?: DigitizationStatus;
  priority?: string;
  assignedTo?: string;
  startDate?: string;
  completedDate?: string;
  fileFormat?: string;
  fileSize?: number;
  resolution?: string;
  qualityScore?: number;
  notes?: string;
}

export interface UpdateDigitizationInput {
  recordId?: string;
  type?: DigitizationType;
  description?: string;
  status?: DigitizationStatus;
  priority?: string;
  assignedTo?: string;
  startDate?: string;
  completedDate?: string;
  fileFormat?: string;
  fileSize?: number;
  resolution?: string;
  qualityScore?: number;
  notes?: string;
}

export interface ListDigitizationOpts {
  recordId?: string;
  type?: DigitizationType;
  status?: DigitizationStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toRecord(row: MemoryRow): ArchiveRecord {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as RecordType) ?? 'corporate',
    description: (c.description as string) ?? '',
    status: (c.status as RecordStatus) ?? 'active',
    collectionId: (c.collectionId as string) ?? null,
    dateCreated: c.dateCreated ? new Date(c.dateCreated as string) : null,
    dateArchived: c.dateArchived ? new Date(c.dateArchived as string) : null,
    retentionPeriod: (c.retentionPeriod as string) ?? '',
    location: (c.location as string) ?? '',
    boxNumber: (c.boxNumber as string) ?? '',
    folderNumber: (c.folderNumber as string) ?? '',
    format: (c.format as string) ?? '',
    restricted: (c.restricted as boolean) ?? false,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCollection(row: MemoryRow): ArchiveCollection {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CollectionType) ?? 'corporate_history',
    description: (c.description as string) ?? '',
    status: (c.status as CollectionStatus) ?? 'open',
    curator: (c.curator as string) ?? '',
    dateRange: (c.dateRange as string) ?? '',
    extent: (c.extent as string) ?? '',
    accessPolicy: (c.accessPolicy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAccess(row: MemoryRow): ArchiveAccess {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    recordId: (c.recordId as string) ?? null,
    collectionId: (c.collectionId as string) ?? null,
    requester: (c.requester as string) ?? '',
    type: (c.type as AccessType) ?? 'research',
    description: (c.description as string) ?? '',
    status: (c.status as AccessStatus) ?? 'requested',
    requestDate: c.requestDate ? new Date(c.requestDate as string) : null,
    approvalDate: c.approvalDate ? new Date(c.approvalDate as string) : null,
    fulfillmentDate: c.fulfillmentDate ? new Date(c.fulfillmentDate as string) : null,
    purpose: (c.purpose as string) ?? '',
    restrictions: (c.restrictions as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDigitization(row: MemoryRow): ArchiveDigitization {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    recordId: (c.recordId as string) ?? '',
    type: (c.type as DigitizationType) ?? 'document',
    description: (c.description as string) ?? '',
    status: (c.status as DigitizationStatus) ?? 'planned',
    priority: (c.priority as string) ?? 'medium',
    assignedTo: (c.assignedTo as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    fileFormat: (c.fileFormat as string) ?? '',
    fileSize: (c.fileSize as number) ?? 0,
    resolution: (c.resolution as string) ?? '',
    qualityScore: (c.qualityScore as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const CorporateArchivesService = {
  // ── Records ──

  async createRecord(organizationId: string, workspaceId: string, input: CreateRecordInput, createdBy: string): Promise<ArchiveRecord> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      collectionId: input.collectionId ?? null,
      dateCreated: input.dateCreated ?? null,
      dateArchived: input.dateArchived ?? null,
      retentionPeriod: input.retentionPeriod ?? '',
      location: input.location ?? '',
      boxNumber: input.boxNumber ?? '',
      folderNumber: input.folderNumber ?? '',
      format: input.format ?? '',
      restricted: input.restricted ?? false,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'archive_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.collectionId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['archive_record', content.type, content.status]),
        createdBy,
      },
    });
    return toRecord(row as MemoryRow);
  },

  async getRecord(id: string): Promise<ArchiveRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'archive_record') return null;
    return toRecord(row as MemoryRow);
  },

  async listRecords(organizationId: string, opts: ListRecordsOpts = {}): Promise<ArchiveRecord[]> {
    const where: Record<string, unknown> = { organizationId, type: 'archive_record' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.collectionId) conditions.push({ content: { contains: `"collectionId":"${opts.collectionId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecord);
  },

  async updateRecord(id: string, input: UpdateRecordInput): Promise<ArchiveRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.collectionId !== undefined && { collectionId: input.collectionId }),
      ...(input.dateCreated !== undefined && { dateCreated: input.dateCreated }),
      ...(input.dateArchived !== undefined && { dateArchived: input.dateArchived }),
      ...(input.retentionPeriod !== undefined && { retentionPeriod: input.retentionPeriod }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.boxNumber !== undefined && { boxNumber: input.boxNumber }),
      ...(input.folderNumber !== undefined && { folderNumber: input.folderNumber }),
      ...(input.format !== undefined && { format: input.format }),
      ...(input.restricted !== undefined && { restricted: input.restricted }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['archive_record', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecord(row as MemoryRow);
  },

  async deleteRecord(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async archiveRecord(id: string, _archivedBy: string): Promise<ArchiveRecord | null> {
    return CorporateArchivesService.updateRecord(id, { status: 'archived', dateArchived: new Date().toISOString() });
  },

  async destroyRecord(id: string, _destroyedBy: string): Promise<ArchiveRecord | null> {
    return CorporateArchivesService.updateRecord(id, { status: 'destroyed' });
  },

  async transferRecord(id: string, _transferredBy: string): Promise<ArchiveRecord | null> {
    return CorporateArchivesService.updateRecord(id, { status: 'transferred' });
  },

  async restrictRecord(id: string, _restrictedBy: string): Promise<ArchiveRecord | null> {
    return CorporateArchivesService.updateRecord(id, { status: 'restricted', restricted: true });
  },

  // ── Collections ──

  async createCollection(organizationId: string, workspaceId: string, input: CreateCollectionInput, createdBy: string): Promise<ArchiveCollection> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'open',
      curator: input.curator ?? '',
      dateRange: input.dateRange ?? '',
      extent: input.extent ?? '',
      accessPolicy: input.accessPolicy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'archive_collection',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['archive_collection', content.type, content.status]),
        createdBy,
      },
    });
    return toCollection(row as MemoryRow);
  },

  async getCollection(id: string): Promise<ArchiveCollection | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'archive_collection') return null;
    return toCollection(row as MemoryRow);
  },

  async listCollections(organizationId: string, opts: ListCollectionsOpts = {}): Promise<ArchiveCollection[]> {
    const where: Record<string, unknown> = { organizationId, type: 'archive_collection' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCollection);
  },

  async updateCollection(id: string, input: UpdateCollectionInput): Promise<ArchiveCollection | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.curator !== undefined && { curator: input.curator }),
      ...(input.dateRange !== undefined && { dateRange: input.dateRange }),
      ...(input.extent !== undefined && { extent: input.extent }),
      ...(input.accessPolicy !== undefined && { accessPolicy: input.accessPolicy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['archive_collection', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCollection(row as MemoryRow);
  },

  async deleteCollection(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async closeCollection(id: string, _closedBy: string): Promise<ArchiveCollection | null> {
    return CorporateArchivesService.updateCollection(id, { status: 'closed' });
  },

  async processCollection(id: string, _processedBy: string): Promise<ArchiveCollection | null> {
    return CorporateArchivesService.updateCollection(id, { status: 'processing' });
  },

  async restrictCollection(id: string, _restrictedBy: string): Promise<ArchiveCollection | null> {
    return CorporateArchivesService.updateCollection(id, { status: 'restricted' });
  },

  async deprecateCollection(id: string, _deprecatedBy: string): Promise<ArchiveCollection | null> {
    return CorporateArchivesService.updateCollection(id, { status: 'deprecated' });
  },

  // ── Access ──

  async createAccess(organizationId: string, workspaceId: string, input: CreateAccessInput, createdBy: string): Promise<ArchiveAccess> {
    const content = {
      recordId: input.recordId ?? null,
      collectionId: input.collectionId ?? null,
      requester: input.requester.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'requested',
      requestDate: input.requestDate ?? null,
      approvalDate: input.approvalDate ?? null,
      fulfillmentDate: input.fulfillmentDate ?? null,
      purpose: input.purpose ?? '',
      restrictions: input.restrictions ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'archive_access',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.recordId ?? input.collectionId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['archive_access', content.type, content.status]),
        createdBy,
      },
    });
    return toAccess(row as MemoryRow);
  },

  async getAccess(id: string): Promise<ArchiveAccess | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'archive_access') return null;
    return toAccess(row as MemoryRow);
  },

  async listAccess(organizationId: string, opts: ListAccessOpts = {}): Promise<ArchiveAccess[]> {
    const where: Record<string, unknown> = { organizationId, type: 'archive_access' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAccess);
  },

  async updateAccess(id: string, input: UpdateAccessInput): Promise<ArchiveAccess | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.recordId !== undefined && { recordId: input.recordId }),
      ...(input.collectionId !== undefined && { collectionId: input.collectionId }),
      ...(input.requester !== undefined && { requester: input.requester.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.requestDate !== undefined && { requestDate: input.requestDate }),
      ...(input.approvalDate !== undefined && { approvalDate: input.approvalDate }),
      ...(input.fulfillmentDate !== undefined && { fulfillmentDate: input.fulfillmentDate }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.restrictions !== undefined && { restrictions: input.restrictions }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['archive_access', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAccess(row as MemoryRow);
  },

  async deleteAccess(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveAccess(id: string, _approvedBy: string): Promise<ArchiveAccess | null> {
    return CorporateArchivesService.updateAccess(id, { status: 'approved', approvalDate: new Date().toISOString() });
  },

  async denyAccess(id: string, _deniedBy: string): Promise<ArchiveAccess | null> {
    return CorporateArchivesService.updateAccess(id, { status: 'denied' });
  },

  async fulfillAccess(id: string, _fulfilledBy: string): Promise<ArchiveAccess | null> {
    return CorporateArchivesService.updateAccess(id, { status: 'fulfilled', fulfillmentDate: new Date().toISOString() });
  },

  async expireAccess(id: string, _expiredBy: string): Promise<ArchiveAccess | null> {
    return CorporateArchivesService.updateAccess(id, { status: 'expired' });
  },

  async revokeAccess(id: string, _revokedBy: string): Promise<ArchiveAccess | null> {
    return CorporateArchivesService.updateAccess(id, { status: 'revoked' });
  },

  // ── Digitization ──

  async createDigitization(organizationId: string, workspaceId: string, input: CreateDigitizationInput, createdBy: string): Promise<ArchiveDigitization> {
    const content = {
      recordId: input.recordId,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      priority: input.priority ?? 'medium',
      assignedTo: input.assignedTo ?? '',
      startDate: input.startDate ?? null,
      completedDate: input.completedDate ?? null,
      fileFormat: input.fileFormat ?? '',
      fileSize: input.fileSize ?? 0,
      resolution: input.resolution ?? '',
      qualityScore: input.qualityScore ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'archive_digitization',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.recordId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['archive_digitization', content.type, content.status]),
        createdBy,
      },
    });
    return toDigitization(row as MemoryRow);
  },

  async getDigitization(id: string): Promise<ArchiveDigitization | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'archive_digitization') return null;
    return toDigitization(row as MemoryRow);
  },

  async listDigitization(organizationId: string, opts: ListDigitizationOpts = {}): Promise<ArchiveDigitization[]> {
    const where: Record<string, unknown> = { organizationId, type: 'archive_digitization' };
    const conditions: unknown[] = [];
    if (opts.recordId) conditions.push({ content: { contains: `"recordId":"${opts.recordId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDigitization);
  },

  async updateDigitization(id: string, input: UpdateDigitizationInput): Promise<ArchiveDigitization | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.recordId !== undefined && { recordId: input.recordId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.fileFormat !== undefined && { fileFormat: input.fileFormat }),
      ...(input.fileSize !== undefined && { fileSize: input.fileSize }),
      ...(input.resolution !== undefined && { resolution: input.resolution }),
      ...(input.qualityScore !== undefined && { qualityScore: input.qualityScore }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['archive_digitization', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toDigitization(row as MemoryRow);
  },

  async deleteDigitization(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startDigitization(id: string, _startedBy: string): Promise<ArchiveDigitization | null> {
    return CorporateArchivesService.updateDigitization(id, { status: 'in_progress', startDate: new Date().toISOString() });
  },

  async completeDigitization(id: string, _completedBy: string): Promise<ArchiveDigitization | null> {
    return CorporateArchivesService.updateDigitization(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async failDigitization(id: string, _failedBy: string): Promise<ArchiveDigitization | null> {
    return CorporateArchivesService.updateDigitization(id, { status: 'failed' });
  },

  async qualityCheckDigitization(id: string, _checkedBy: string): Promise<ArchiveDigitization | null> {
    return CorporateArchivesService.updateDigitization(id, { status: 'quality_check' });
  },

  async reDigitize(id: string, _reBy: string): Promise<ArchiveDigitization | null> {
    return CorporateArchivesService.updateDigitization(id, { status: 're_digitized' });
  },

  // ── Metrics & Stats ──

  async getCorporateArchivesMetrics(organizationId: string): Promise<CorporateArchivesMetrics> {
    const [records, collections, access, digitization] = await Promise.all([
      CorporateArchivesService.listRecords(organizationId),
      CorporateArchivesService.listCollections(organizationId),
      CorporateArchivesService.listAccess(organizationId),
      CorporateArchivesService.listDigitization(organizationId),
    ]);
    const activeRecords = records.filter((r) => r.status === 'active').length;
    const archivedRecords = records.filter((r) => r.status === 'archived').length;
    const openCollections = collections.filter((c) => c.status === 'open').length;
    const pendingAccessRequests = access.filter((a) => a.status === 'requested').length;
    const inProgressDigitization = digitization.filter((d) => d.status === 'in_progress').length;
    return { activeRecords, archivedRecords, openCollections, pendingAccessRequests, inProgressDigitization };
  },

  async getCorporateArchivesStats(organizationId: string): Promise<CorporateArchivesStats> {
    const [records, collections, access, digitization] = await Promise.all([
      CorporateArchivesService.listRecords(organizationId),
      CorporateArchivesService.listCollections(organizationId),
      CorporateArchivesService.listAccess(organizationId),
      CorporateArchivesService.listDigitization(organizationId),
    ]);
    const byRecordType: Record<string, number> = {};
    const byRecordStatus: Record<string, number> = {};
    const byCollectionType: Record<string, number> = {};
    const byCollectionStatus: Record<string, number> = {};
    const byAccessType: Record<string, number> = {};
    const byAccessStatus: Record<string, number> = {};
    const byDigitizationType: Record<string, number> = {};
    const byDigitizationStatus: Record<string, number> = {};
    for (const r of records) { byRecordType[r.type] = (byRecordType[r.type] ?? 0) + 1; byRecordStatus[r.status] = (byRecordStatus[r.status] ?? 0) + 1; }
    for (const c of collections) { byCollectionType[c.type] = (byCollectionType[c.type] ?? 0) + 1; byCollectionStatus[c.status] = (byCollectionStatus[c.status] ?? 0) + 1; }
    for (const a of access) { byAccessType[a.type] = (byAccessType[a.type] ?? 0) + 1; byAccessStatus[a.status] = (byAccessStatus[a.status] ?? 0) + 1; }
    for (const d of digitization) { byDigitizationType[d.type] = (byDigitizationType[d.type] ?? 0) + 1; byDigitizationStatus[d.status] = (byDigitizationStatus[d.status] ?? 0) + 1; }
    return {
      recordCount: records.length,
      activeRecordCount: records.filter((r) => r.status === 'active').length,
      archivedRecordCount: records.filter((r) => r.status === 'archived').length,
      collectionCount: collections.length,
      openCollectionCount: collections.filter((c) => c.status === 'open').length,
      accessCount: access.length,
      pendingAccessCount: access.filter((a) => a.status === 'requested').length,
      digitizationCount: digitization.length,
      inProgressDigitizationCount: digitization.filter((d) => d.status === 'in_progress').length,
      byRecordType, byRecordStatus, byCollectionType, byCollectionStatus, byAccessType, byAccessStatus, byDigitizationType, byDigitizationStatus,
    };
  },
};
