import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type DocCategory =
  | 'contract'
  | 'policy'
  | 'agreement'
  | 'letter'
  | 'report'
  | 'form'
  | 'other';

export type FieldType = 'text' | 'date' | 'number' | 'signature' | 'checkbox';
export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';
export type RetentionAction = 'archive' | 'delete';
export type ESignStatus = 'pending' | 'completed' | 'cancelled' | 'expired';

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

interface TemplateContent {
  name: string;
  category: DocCategory;
  description: string;
  content: string;
  fields: Array<{ name: string; type: FieldType; required?: boolean }>;
  version: number;
}

interface DocumentContent {
  templateId: string | null;
  title: string;
  category: DocCategory;
  description: string;
  content: string;
  classification: Classification;
  tags: string[];
  version: number;
  currentVersionId: string | null;
  retentionPolicyId: string | null;
  expiresAt: string | null;
}

interface DocVersionContent {
  documentId: string;
  version: number;
  title: string;
  content: string;
  description: string;
  changedBy: string;
  changeNote: string;
}

interface ClassRuleContent {
  name: string;
  classification: Classification;
  criteria: string;
  autoClassify: boolean;
}

interface RetentionPolicyContent {
  name: string;
  category: DocCategory | 'all';
  retentionDays: number;
  action: RetentionAction;
  description: string;
}

interface ESignRequestContent {
  documentId: string;
  title: string;
  signers: Array<{ name: string; email: string; role: string; order: number }>;
  message: string;
  status: ESignStatus;
  expiresAt: string | null;
  cancelReason: string;
  completedAt: string | null;
}

interface ESignSignatureContent {
  requestId: string;
  signerEmail: string;
  signerName: string;
  signature: string;
  signedAt: string;
  status: 'signed' | 'declined';
}

interface AuditEventContent {
  documentId: string;
  event: string;
  actor: string;
  detail: string;
  timestamp: string;
}

// ── Public interfaces ──

export interface DocTemplate {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: DocCategory;
  description: string;
  content: string;
  fields: Array<{ name: string; type: FieldType; required?: boolean }>;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  templateId: string | null;
  title: string;
  category: DocCategory;
  description: string;
  content: string;
  classification: Classification;
  tags: string[];
  version: number;
  currentVersionId: string | null;
  retentionPolicyId: string | null;
  expiresAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocVersion {
  id: string;
  organizationId: string;
  workspaceId: string;
  documentId: string;
  version: number;
  title: string;
  content: string;
  description: string;
  changedBy: string;
  changeNote: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassRule {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  classification: Classification;
  criteria: string;
  autoClassify: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionPolicy {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: DocCategory | 'all';
  retentionDays: number;
  action: RetentionAction;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ESignRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  documentId: string;
  title: string;
  signers: Array<{ name: string; email: string; role: string; order: number }>;
  message: string;
  status: ESignStatus;
  expiresAt: Date | null;
  cancelReason: string;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ESignSignature {
  id: string;
  organizationId: string;
  workspaceId: string;
  requestId: string;
  signerEmail: string;
  signerName: string;
  signature: string;
  signedAt: Date;
  status: 'signed' | 'declined';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  workspaceId: string;
  documentId: string;
  event: string;
  actor: string;
  detail: string;
  timestamp: Date;
  createdAt: Date;
}

export interface DocumentManagementStats {
  templateCount: number;
  documentCount: number;
  esignRequestCount: number;
  pendingEsignCount: number;
  completedEsignCount: number;
  classRuleCount: number;
  retentionPolicyCount: number;
  expiredDocumentCount: number;
  byCategory: Record<string, number>;
  byClassification: Record<string, number>;
}

// ── Input / Options ──

export interface CreateTemplateInput {
  name: string;
  category?: DocCategory;
  description?: string;
  content?: string;
  fields?: Array<{ name: string; type: FieldType; required?: boolean }>;
  version?: number;
}

export interface UpdateTemplateInput {
  name?: string;
  category?: DocCategory;
  description?: string;
  content?: string;
  fields?: Array<{ name: string; type: FieldType; required?: boolean }>;
  version?: number;
}

export interface ListTemplatesOpts {
  category?: DocCategory;
}

export interface CreateDocumentInput {
  templateId?: string;
  title: string;
  category?: DocCategory;
  content: string;
  description?: string;
  classification?: Classification;
  tags?: string[];
}

export interface UpdateDocumentInput {
  title?: string;
  category?: DocCategory;
  content?: string;
  description?: string;
  classification?: Classification;
  tags?: string[];
  changeNote?: string;
}

export interface ListDocumentsOpts {
  category?: DocCategory;
  classification?: Classification;
  tags?: string[];
}

export interface CreateClassRuleInput {
  name: string;
  classification: Classification;
  criteria: string;
  autoClassify?: boolean;
}

export interface UpdateClassRuleInput {
  name?: string;
  classification?: Classification;
  criteria?: string;
  autoClassify?: boolean;
}

export interface CreateRetentionPolicyInput {
  name: string;
  category?: DocCategory | 'all';
  retentionDays: number;
  action: RetentionAction;
  description?: string;
}

export interface UpdateRetentionPolicyInput {
  name?: string;
  category?: DocCategory | 'all';
  retentionDays?: number;
  action?: RetentionAction;
  description?: string;
}

export interface CreateESignRequestInput {
  documentId: string;
  title: string;
  signers: Array<{ name: string; email: string; role?: string; order?: number }>;
  message?: string;
  expiresAt?: string;
}

export interface SignDocumentInput {
  signerEmail: string;
  signature: string;
  signedAt?: string;
}

// ── Helpers ──

const fallbackTemplate: TemplateContent = {
  name: '',
  category: 'other',
  description: '',
  content: '',
  fields: [],
  version: 1,
};

const fallbackDocument: DocumentContent = {
  templateId: null,
  title: '',
  category: 'other',
  description: '',
  content: '',
  classification: 'internal',
  tags: [],
  version: 1,
  currentVersionId: null,
  retentionPolicyId: null,
  expiresAt: null,
};

const fallbackVersion: DocVersionContent = {
  documentId: '',
  version: 1,
  title: '',
  content: '',
  description: '',
  changedBy: '',
  changeNote: '',
};

const fallbackClassRule: ClassRuleContent = {
  name: '',
  classification: 'internal',
  criteria: '',
  autoClassify: false,
};

const fallbackRetention: RetentionPolicyContent = {
  name: '',
  category: 'all',
  retentionDays: 0,
  action: 'archive',
  description: '',
};

const fallbackESign: ESignRequestContent = {
  documentId: '',
  title: '',
  signers: [],
  message: '',
  status: 'pending',
  expiresAt: null,
  cancelReason: '',
  completedAt: null,
};

const fallbackSignature: ESignSignatureContent = {
  requestId: '',
  signerEmail: '',
  signerName: '',
  signature: '',
  signedAt: '',
  status: 'signed',
};

const fallbackAudit: AuditEventContent = {
  documentId: '',
  event: '',
  actor: '',
  detail: '',
  timestamp: '',
};

function parseTemplate(raw: string): TemplateContent {
  if (!raw) return fallbackTemplate;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      category: (p.category as DocCategory) ?? 'other',
      description: p.description ?? '',
      content: p.content ?? '',
      fields: Array.isArray(p.fields) ? p.fields : [],
      version: Number(p.version) || 1,
    };
  } catch {
    return fallbackTemplate;
  }
}

function parseDocument(raw: string): DocumentContent {
  if (!raw) return fallbackDocument;
  try {
    const p = JSON.parse(raw);
    return {
      templateId: p.templateId ?? null,
      title: p.title ?? '',
      category: (p.category as DocCategory) ?? 'other',
      description: p.description ?? '',
      content: p.content ?? '',
      classification: (p.classification as Classification) ?? 'internal',
      tags: Array.isArray(p.tags) ? p.tags : [],
      version: Number(p.version) || 1,
      currentVersionId: p.currentVersionId ?? null,
      retentionPolicyId: p.retentionPolicyId ?? null,
      expiresAt: p.expiresAt ?? null,
    };
  } catch {
    return fallbackDocument;
  }
}

function parseVersion(raw: string): DocVersionContent {
  if (!raw) return fallbackVersion;
  try {
    const p = JSON.parse(raw);
    return {
      documentId: p.documentId ?? '',
      version: Number(p.version) || 1,
      title: p.title ?? '',
      content: p.content ?? '',
      description: p.description ?? '',
      changedBy: p.changedBy ?? '',
      changeNote: p.changeNote ?? '',
    };
  } catch {
    return fallbackVersion;
  }
}

function parseClassRule(raw: string): ClassRuleContent {
  if (!raw) return fallbackClassRule;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      classification: (p.classification as Classification) ?? 'internal',
      criteria: p.criteria ?? '',
      autoClassify: p.autoClassify !== undefined ? Boolean(p.autoClassify) : false,
    };
  } catch {
    return fallbackClassRule;
  }
}

function parseRetention(raw: string): RetentionPolicyContent {
  if (!raw) return fallbackRetention;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      category: (p.category as DocCategory | 'all') ?? 'all',
      retentionDays: Number(p.retentionDays) || 0,
      action: (p.action as RetentionAction) ?? 'archive',
      description: p.description ?? '',
    };
  } catch {
    return fallbackRetention;
  }
}

function parseESign(raw: string): ESignRequestContent {
  if (!raw) return fallbackESign;
  try {
    const p = JSON.parse(raw);
    return {
      documentId: p.documentId ?? '',
      title: p.title ?? '',
      signers: Array.isArray(p.signers) ? p.signers : [],
      message: p.message ?? '',
      status: (p.status as ESignStatus) ?? 'pending',
      expiresAt: p.expiresAt ?? null,
      cancelReason: p.cancelReason ?? '',
      completedAt: p.completedAt ?? null,
    };
  } catch {
    return fallbackESign;
  }
}

function parseSignature(raw: string): ESignSignatureContent {
  if (!raw) return fallbackSignature;
  try {
    const p = JSON.parse(raw);
    return {
      requestId: p.requestId ?? '',
      signerEmail: p.signerEmail ?? '',
      signerName: p.signerName ?? '',
      signature: p.signature ?? '',
      signedAt: p.signedAt ?? '',
      status: (p.status as 'signed' | 'declined') ?? 'signed',
    };
  } catch {
    return fallbackSignature;
  }
}

function parseAudit(raw: string): AuditEventContent {
  if (!raw) return fallbackAudit;
  try {
    const p = JSON.parse(raw);
    return {
      documentId: p.documentId ?? '',
      event: p.event ?? '',
      actor: p.actor ?? '',
      detail: p.detail ?? '',
      timestamp: p.timestamp ?? '',
    };
  } catch {
    return fallbackAudit;
  }
}

function toTemplate(row: MemoryRow): DocTemplate {
  const c = parseTemplate(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: c.name,
    category: c.category,
    description: c.description,
    content: c.content,
    fields: c.fields,
    version: c.version,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDocument(row: MemoryRow): DocRecord {
  const c = parseDocument(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    templateId: c.templateId,
    title: c.title,
    category: c.category,
    description: c.description,
    content: c.content,
    classification: c.classification,
    tags: c.tags,
    version: c.version,
    currentVersionId: c.currentVersionId,
    retentionPolicyId: c.retentionPolicyId,
    expiresAt: c.expiresAt ? new Date(c.expiresAt) : row.expiresAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toVersion(row: MemoryRow): DocVersion {
  const c = parseVersion(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    documentId: c.documentId,
    version: c.version,
    title: c.title,
    content: c.content,
    description: c.description,
    changedBy: c.changedBy,
    changeNote: c.changeNote,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toClassRule(row: MemoryRow): ClassRule {
  const c = parseClassRule(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: c.name,
    classification: c.classification,
    criteria: c.criteria,
    autoClassify: c.autoClassify,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRetention(row: MemoryRow): RetentionPolicy {
  const c = parseRetention(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: c.name,
    category: c.category,
    retentionDays: c.retentionDays,
    action: c.action,
    description: c.description,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toESign(row: MemoryRow): ESignRequest {
  const c = parseESign(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    documentId: c.documentId,
    title: c.title,
    signers: c.signers,
    message: c.message,
    status: c.status,
    expiresAt: c.expiresAt ? new Date(c.expiresAt) : row.expiresAt,
    cancelReason: c.cancelReason,
    completedAt: c.completedAt ? new Date(c.completedAt) : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSignature(row: MemoryRow): ESignSignature {
  const c = parseSignature(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    requestId: c.requestId,
    signerEmail: c.signerEmail,
    signerName: c.signerName,
    signature: c.signature,
    signedAt: c.signedAt ? new Date(c.signedAt) : row.createdAt,
    status: c.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAudit(row: MemoryRow): AuditEvent {
  const c = parseAudit(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    documentId: c.documentId,
    event: c.event,
    actor: c.actor,
    detail: c.detail,
    timestamp: c.timestamp ? new Date(c.timestamp) : row.createdAt,
    createdAt: row.createdAt,
  };
}

/** Append an audit event for a document. */
async function recordAudit(
  organizationId: string,
  workspaceId: string,
  documentId: string,
  event: string,
  actor: string,
  detail: string,
): Promise<void> {
  const now = new Date().toISOString();
  const content: AuditEventContent = {
    documentId,
    event,
    actor,
    detail,
    timestamp: now,
  };
  await safePrisma(
    () =>
      prisma.memory.create({
        data: {
          workspaceId,
          organizationId,
          type: 'doc_audit_event',
          content: JSON.stringify(content).slice(0, 10000),
          source: 'system',
          sourceId: documentId,
          confidence: 1.0,
          lifecycle: 'permanent',
          tags: JSON.stringify(['doc_audit', event]),
          createdBy: actor,
        },
      }),
    null,
  );
}

// ── Document Management Service ──

export const DocumentManagementService = {
  // ── Templates ──

  async createTemplate(
    organizationId: string,
    workspaceId: string,
    input: CreateTemplateInput,
    createdBy: string,
  ): Promise<DocTemplate> {
    const content: TemplateContent = {
      name: input.name.trim(),
      category: input.category ?? 'other',
      description: input.description ?? '',
      content: input.content ?? '',
      fields: input.fields ?? [],
      version: input.version ?? 1,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'doc_template',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['doc_template', content.category]),
        createdBy,
      },
    });

    return toTemplate(row as MemoryRow);
  },

  async getTemplate(id: string): Promise<DocTemplate | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'doc_template') return null;
    return toTemplate(row as MemoryRow);
  },

  async listTemplates(organizationId: string, opts: ListTemplatesOpts = {}): Promise<DocTemplate[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'doc_template',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      [],
    );

    let records = rows.map((r) => toTemplate(r as MemoryRow));
    if (opts.category) {
      records = records.filter((t) => t.category === opts.category);
    }
    return records;
  },

  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<DocTemplate | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTemplate(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.category !== undefined) content.category = input.category;
    if (input.description !== undefined) content.description = input.description;
    if (input.content !== undefined) content.content = input.content;
    if (input.fields !== undefined) content.fields = input.fields;
    if (input.version !== undefined) content.version = input.version;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 50000),
            tags: JSON.stringify(['doc_template', content.category]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toTemplate(row as MemoryRow);
  },

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Documents ──

  async createDocument(
    organizationId: string,
    workspaceId: string,
    input: CreateDocumentInput,
    createdBy: string,
  ): Promise<DocRecord> {
    const content: DocumentContent = {
      templateId: input.templateId ?? null,
      title: input.title.trim(),
      category: input.category ?? 'other',
      description: input.description ?? '',
      content: input.content,
      classification: input.classification ?? 'internal',
      tags: input.tags ?? [],
      version: 1,
      currentVersionId: null,
      retentionPolicyId: null,
      expiresAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'doc_version',
        content: JSON.stringify(content).slice(0, 100000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['doc_version', content.category, content.classification, ...content.tags]),
        createdBy,
      },
    });

    const doc = toDocument(row as MemoryRow);

    // Record initial version snapshot
    const versionContent: DocVersionContent = {
      documentId: doc.id,
      version: 1,
      title: content.title,
      content: content.content,
      description: content.description,
      changedBy: createdBy,
      changeNote: 'Initial version',
    };
    const versionRow = await safePrisma(
      () =>
        prisma.memory.create({
          data: {
            workspaceId,
            organizationId,
            type: 'doc_version_snapshot',
            content: JSON.stringify(versionContent).slice(0, 100000),
            source: 'system',
            sourceId: doc.id,
            confidence: 1.0,
            lifecycle: 'permanent',
            tags: JSON.stringify(['doc_version_snapshot', `v${1}`]),
            createdBy,
          },
        }),
      null,
    );

    // Link current version id back to the document
    if (versionRow) {
      content.currentVersionId = (versionRow as MemoryRow).id;
      const updated = await safePrisma(
        () =>
          prisma.memory.update({
            where: { id: doc.id },
            data: { content: JSON.stringify(content).slice(0, 100000) },
          }),
        null,
      );
      if (updated) {
        return toDocument(updated as MemoryRow);
      }
    }

    await recordAudit(organizationId, workspaceId, doc.id, 'created', createdBy, `Created document "${content.title}"`);
    return doc;
  },

  async getDocument(id: string): Promise<DocRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'doc_version') return null;
    return toDocument(row as MemoryRow);
  },

  async listDocuments(organizationId: string, opts: ListDocumentsOpts = {}): Promise<DocRecord[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'doc_version',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      [],
    );

    let records = rows.map((r) => toDocument(r as MemoryRow));
    if (opts.category) {
      records = records.filter((d) => d.category === opts.category);
    }
    if (opts.classification) {
      records = records.filter((d) => d.classification === opts.classification);
    }
    if (opts.tags && opts.tags.length > 0) {
      records = records.filter((d) => opts.tags!.some((t) => d.tags.includes(t)));
    }
    return records;
  },

  async updateDocument(id: string, input: UpdateDocumentInput): Promise<DocRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDocument(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.category !== undefined) content.category = input.category;
    if (input.content !== undefined) content.content = input.content;
    if (input.description !== undefined) content.description = input.description;
    if (input.classification !== undefined) content.classification = input.classification;
    if (input.tags !== undefined) content.tags = input.tags;

    content.version += 1;

    // Create a new version snapshot
    const versionContent: DocVersionContent = {
      documentId: id,
      version: content.version,
      title: content.title,
      content: content.content,
      description: content.description,
      changedBy: existing.createdBy,
      changeNote: input.changeNote ?? `Version ${content.version}`,
    };
    const versionRow = await safePrisma(
      () =>
        prisma.memory.create({
          data: {
            workspaceId: (existing as MemoryRow).workspaceId,
            organizationId: (existing as MemoryRow).organizationId,
            type: 'doc_version_snapshot',
            content: JSON.stringify(versionContent).slice(0, 100000),
            source: 'system',
            sourceId: id,
            confidence: 1.0,
            lifecycle: 'permanent',
            tags: JSON.stringify(['doc_version_snapshot', `v${content.version}`]),
            createdBy: existing.createdBy,
          },
        }),
      null,
    );
    if (versionRow) {
      content.currentVersionId = (versionRow as MemoryRow).id;
    }

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 100000),
            tags: JSON.stringify(['doc_version', content.category, content.classification, ...content.tags]),
          },
        }),
      null,
    );
    if (!row) return null;

    await recordAudit(
      (existing as MemoryRow).organizationId,
      (existing as MemoryRow).workspaceId,
      id,
      'updated',
      existing.createdBy,
      `Updated to version ${content.version}`,
    );

    return toDocument(row as MemoryRow);
  },

  async deleteDocument(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getDocumentVersions(documentId: string): Promise<DocVersion[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'doc_version_snapshot',
            sourceId: documentId,
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );
    return rows.map((r) => toVersion(r as MemoryRow));
  },

  async restoreVersion(documentId: string, versionId: string): Promise<DocRecord | null> {
    const versionRow = await safePrisma(() => prisma.memory.findUnique({ where: { id: versionId } }), null);
    if (!versionRow) return null;
    const vc = parseVersion((versionRow as MemoryRow).content);
    if (vc.documentId !== documentId) return null;

    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id: documentId } }), null);
    if (!existing) return null;

    const content = parseDocument(existing.content);
    content.title = vc.title;
    content.content = vc.content;
    content.description = vc.description;
    content.version += 1;
    content.currentVersionId = versionId;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id: documentId },
          data: {
            content: JSON.stringify(content).slice(0, 100000),
            tags: JSON.stringify(['doc_version', content.category, content.classification, ...content.tags]),
          },
        }),
      null,
    );
    if (!row) return null;

    await recordAudit(
      (existing as MemoryRow).organizationId,
      (existing as MemoryRow).workspaceId,
      documentId,
      'restored',
      existing.createdBy,
      `Restored version ${vc.version}`,
    );

    return toDocument(row as MemoryRow);
  },

  // ── Classification Rules ──

  async createClassRule(
    organizationId: string,
    workspaceId: string,
    input: CreateClassRuleInput,
    createdBy: string,
  ): Promise<ClassRule> {
    const content: ClassRuleContent = {
      name: input.name.trim(),
      classification: input.classification,
      criteria: input.criteria,
      autoClassify: input.autoClassify ?? false,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'doc_classification',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['doc_classification', content.classification]),
        createdBy,
      },
    });

    return toClassRule(row as MemoryRow);
  },

  async getClassRules(organizationId: string): Promise<ClassRule[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'doc_classification',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      [],
    );
    return rows.map((r) => toClassRule(r as MemoryRow));
  },

  async updateClassRule(id: string, input: UpdateClassRuleInput): Promise<ClassRule | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseClassRule(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.classification !== undefined) content.classification = input.classification;
    if (input.criteria !== undefined) content.criteria = input.criteria;
    if (input.autoClassify !== undefined) content.autoClassify = input.autoClassify;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['doc_classification', content.classification]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toClassRule(row as MemoryRow);
  },

  async deleteClassRule(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Retention Policies ──

  async createRetentionPolicy(
    organizationId: string,
    workspaceId: string,
    input: CreateRetentionPolicyInput,
    createdBy: string,
  ): Promise<RetentionPolicy> {
    const content: RetentionPolicyContent = {
      name: input.name.trim(),
      category: input.category ?? 'all',
      retentionDays: Number(input.retentionDays) || 0,
      action: input.action,
      description: input.description ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'retention_policy',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['retention_policy', content.category, content.action]),
        createdBy,
      },
    });

    return toRetention(row as MemoryRow);
  },

  async getRetentionPolicies(organizationId: string): Promise<RetentionPolicy[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'retention_policy',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      [],
    );
    return rows.map((r) => toRetention(r as MemoryRow));
  },

  async updateRetentionPolicy(id: string, input: UpdateRetentionPolicyInput): Promise<RetentionPolicy | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRetention(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.category !== undefined) content.category = input.category;
    if (input.retentionDays !== undefined) content.retentionDays = Number(input.retentionDays) || 0;
    if (input.action !== undefined) content.action = input.action;
    if (input.description !== undefined) content.description = input.description;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['retention_policy', content.category, content.action]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRetention(row as MemoryRow);
  },

  async deleteRetentionPolicy(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getExpiredDocuments(organizationId: string): Promise<DocRecord[]> {
    const documents = await DocumentManagementService.listDocuments(organizationId);
    const now = new Date();
    return documents.filter((d) => d.expiresAt !== null && d.expiresAt < now);
  },

  // ── E-Sign ──

  async createESignRequest(
    organizationId: string,
    workspaceId: string,
    input: CreateESignRequestInput,
    createdBy: string,
  ): Promise<ESignRequest> {
    const signers = input.signers.map((s, i) => ({
      name: s.name,
      email: s.email,
      role: s.role ?? 'signer',
      order: s.order ?? i + 1,
    }));

    const content: ESignRequestContent = {
      documentId: input.documentId,
      title: input.title.trim(),
      signers,
      message: input.message ?? '',
      status: 'pending',
      expiresAt: input.expiresAt ?? null,
      cancelReason: '',
      completedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'esign_request',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user',
        sourceId: input.documentId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['esign_request', 'pending']),
        createdBy,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    await recordAudit(
      organizationId,
      workspaceId,
      input.documentId,
      'esign_requested',
      createdBy,
      `E-sign request "${content.title}" created for ${signers.length} signer(s)`,
    );

    return toESign(row as MemoryRow);
  },

  async getESignRequest(id: string): Promise<ESignRequest | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'esign_request') return null;
    return toESign(row as MemoryRow);
  },

  async listESignRequests(
    organizationId: string,
    opts: { status?: ESignStatus } = {},
  ): Promise<ESignRequest[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'esign_request',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      [],
    );

    let records = rows.map((r) => toESign(r as MemoryRow));
    if (opts.status) {
      records = records.filter((r) => r.status === opts.status);
    }
    return records;
  },

  async cancelESignRequest(id: string, reason: string): Promise<ESignRequest | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseESign(existing.content);
    content.status = 'cancelled';
    content.cancelReason = reason ?? '';

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 50000),
            tags: JSON.stringify(['esign_request', 'cancelled']),
          },
        }),
      null,
    );
    if (!row) return null;

    await recordAudit(
      (existing as MemoryRow).organizationId,
      (existing as MemoryRow).workspaceId,
      content.documentId,
      'esign_cancelled',
      existing.createdBy,
      `E-sign request cancelled: ${reason}`,
    );

    return toESign(row as MemoryRow);
  },

  async signDocument(
    requestId: string,
    input: SignDocumentInput,
  ): Promise<{ signature: ESignSignature; request: ESignRequest | null }> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id: requestId } }), null);
    if (!existing) throw new Error('esign_request_not_found');

    const reqContent = parseESign(existing.content);
    const signer = reqContent.signers.find((s) => s.email === input.signerEmail);
    const signerName = signer?.name ?? input.signerEmail;
    const signedAt = input.signedAt ?? new Date().toISOString();

    const sigContent: ESignSignatureContent = {
      requestId,
      signerEmail: input.signerEmail,
      signerName,
      signature: input.signature,
      signedAt,
      status: 'signed',
    };

    const sigRow = await prisma.memory.create({
      data: {
        workspaceId: (existing as MemoryRow).workspaceId,
        organizationId: (existing as MemoryRow).organizationId,
        type: 'esign_signature',
        content: JSON.stringify(sigContent).slice(0, 50000),
        source: 'user',
        sourceId: requestId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['esign_signature', 'signed']),
        createdBy: existing.createdBy,
      },
    });

    const signature = toSignature(sigRow as MemoryRow);

    // Check if all signers have signed
    const allSigs = await DocumentManagementService.getSignatures(requestId);
    const signedEmails = new Set(allSigs.map((s) => s.signerEmail));
    const allSigned = reqContent.signers.every((s) => signedEmails.has(s.email));

    let request: ESignRequest | null = null;
    if (allSigned) {
      reqContent.status = 'completed';
      reqContent.completedAt = new Date().toISOString();
      const updated = await safePrisma(
        () =>
          prisma.memory.update({
            where: { id: requestId },
            data: {
              content: JSON.stringify(reqContent).slice(0, 50000),
              tags: JSON.stringify(['esign_request', 'completed']),
            },
          }),
        null,
      );
      if (updated) {
        request = toESign(updated as MemoryRow);
      }
      await recordAudit(
        (existing as MemoryRow).organizationId,
        (existing as MemoryRow).workspaceId,
        reqContent.documentId,
        'esign_completed',
        existing.createdBy,
        `All signers completed for "${reqContent.title}"`,
      );
    } else {
      await recordAudit(
        (existing as MemoryRow).organizationId,
        (existing as MemoryRow).workspaceId,
        reqContent.documentId,
        'signed',
        input.signerEmail,
        `Signed by ${signerName} (${input.signerEmail})`,
      );
    }

    return { signature, request };
  },

  async getSignatures(requestId: string): Promise<ESignSignature[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'esign_signature',
            sourceId: requestId,
          },
          orderBy: { createdAt: 'asc' },
          take: 200,
        }),
      [],
    );
    return rows.map((r) => toSignature(r as MemoryRow));
  },

  // ── Audit Trail ──

  async getAuditTrail(documentId: string): Promise<AuditEvent[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'doc_audit_event',
            sourceId: documentId,
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );
    return rows.map((r) => toAudit(r as MemoryRow));
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<DocumentManagementStats> {
    const [templates, documents, esignRequests, classRules, retentionPolicies, expiredDocs] = await Promise.all([
      DocumentManagementService.listTemplates(organizationId),
      DocumentManagementService.listDocuments(organizationId),
      DocumentManagementService.listESignRequests(organizationId),
      DocumentManagementService.getClassRules(organizationId),
      DocumentManagementService.getRetentionPolicies(organizationId),
      DocumentManagementService.getExpiredDocuments(organizationId),
    ]);

    const byCategory: Record<string, number> = {};
    for (const d of documents) {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
    }

    const byClassification: Record<string, number> = {};
    for (const d of documents) {
      byClassification[d.classification] = (byClassification[d.classification] || 0) + 1;
    }

    let pendingEsignCount = 0;
    let completedEsignCount = 0;
    for (const r of esignRequests) {
      if (r.status === 'pending') pendingEsignCount += 1;
      if (r.status === 'completed') completedEsignCount += 1;
    }

    return {
      templateCount: templates.length,
      documentCount: documents.length,
      esignRequestCount: esignRequests.length,
      pendingEsignCount,
      completedEsignCount,
      classRuleCount: classRules.length,
      retentionPolicyCount: retentionPolicies.length,
      expiredDocumentCount: expiredDocs.length,
      byCategory,
      byClassification,
    };
  },
};
