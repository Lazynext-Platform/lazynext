import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CatalogEntryType = 'dataset' | 'table' | 'api' | 'report' | 'metric' | 'dashboard';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type CatalogEntryStatus = 'active' | 'deprecated' | 'archived' | 'draft';
export type QualityRuleType = 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'uniqueness' | 'validity' | 'integrity';
export type QualityRuleStatus = 'active' | 'inactive' | 'draft';
export type QualityCheckResult = 'pass' | 'fail' | 'warning' | 'error';
export type LineageStatus = 'active' | 'inactive' | 'deprecated';
export type StewardRole = 'owner' | 'steward' | 'custodian' | 'consumer';
export type StewardshipStatus = 'active' | 'inactive';
export type MDMDomain = 'customer' | 'product' | 'employee' | 'vendor' | 'location' | 'asset' | 'other';
export type MDMRecordStatus = 'active' | 'merged' | 'archived' | 'pending';

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

interface CatalogEntryContent {
  name: string;
  type: CatalogEntryType;
  source: string;
  owner: string;
  description: string;
  tags: string[];
  classification: DataClassification;
  pii: boolean;
  refreshFrequency: string;
  qualityScore: number | null;
  status: CatalogEntryStatus;
}

interface QualityRuleContent {
  name: string;
  catalogEntryId: string | null;
  type: QualityRuleType;
  description: string;
  rule: string;
  threshold: number | null;
  frequency: string;
  status: QualityRuleStatus;
  lastRun: string | null;
  lastResult: QualityCheckResult | null;
  violations: number;
}

interface LineageContent {
  name: string;
  source: string;
  target: string;
  transformation: string;
  schedule: string;
  status: LineageStatus;
  dependencies: string[];
  dataVolume: string;
  lastUpdated: string | null;
}

interface StewardshipContent {
  catalogEntryId: string | null;
  stewardName: string;
  role: StewardRole;
  responsibilities: string;
  accountability: string;
  accessLevel: string;
  status: StewardshipStatus;
}

interface MDMRecordContent {
  domain: MDMDomain;
  entityName: string;
  goldenRecord: Record<string, unknown>;
  sourceRecords: Array<{ source: string; recordId: string; matchScore?: number }>;
  status: MDMRecordStatus;
  qualityScore: number | null;
  lastVerified: string | null;
  verifiedBy: string | null;
}

// ── Public interfaces ──

export interface CatalogEntry {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CatalogEntryType;
  source: string;
  owner: string;
  description: string;
  tags: string[];
  classification: DataClassification;
  pii: boolean;
  refreshFrequency: string;
  qualityScore: number | null;
  status: CatalogEntryStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityRule {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  catalogEntryId: string | null;
  type: QualityRuleType;
  description: string;
  rule: string;
  threshold: number | null;
  frequency: string;
  status: QualityRuleStatus;
  lastRun: Date | null;
  lastResult: QualityCheckResult | null;
  violations: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lineage {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  source: string;
  target: string;
  transformation: string;
  schedule: string;
  status: LineageStatus;
  dependencies: string[];
  dataVolume: string;
  lastUpdated: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stewardship {
  id: string;
  organizationId: string;
  workspaceId: string;
  catalogEntryId: string | null;
  stewardName: string;
  role: StewardRole;
  responsibilities: string;
  accountability: string;
  accessLevel: string;
  status: StewardshipStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MDMRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  domain: MDMDomain;
  entityName: string;
  goldenRecord: Record<string, unknown>;
  sourceRecords: Array<{ source: string; recordId: string; matchScore?: number }>;
  status: MDMRecordStatus;
  qualityScore: number | null;
  lastVerified: Date | null;
  verifiedBy: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LineageGraph {
  entryId: string;
  upstream: Array<{ id: string; name: string; source: string; target: string }>;
  downstream: Array<{ id: string; name: string; source: string; target: string }>;
}

export interface DataGovernanceMetrics {
  catalogCoverage: number;
  qualityRulePassRate: number;
  piiClassificationCoverage: number;
  mdmGoldenRecords: number;
  lineageCompleteness: number;
}

export interface DataGovernanceStats {
  catalogCount: number;
  qualityRuleCount: number;
  lineageCount: number;
  stewardshipCount: number;
  mdmRecordCount: number;
  piiCount: number;
  activeCatalogCount: number;
  qualityRulePassRate: number;
  byCatalogType: Record<string, number>;
  byClassification: Record<string, number>;
  byMDMDomain: Record<string, number>;
}

// ── Input / Options ──

export interface CreateCatalogEntryInput {
  name: string;
  type: CatalogEntryType;
  source: string;
  owner?: string;
  description?: string;
  tags?: string[];
  classification: DataClassification;
  pii?: boolean;
  refreshFrequency?: string;
  qualityScore?: number;
  status?: CatalogEntryStatus;
}

export interface UpdateCatalogEntryInput {
  name?: string;
  type?: CatalogEntryType;
  source?: string;
  owner?: string;
  description?: string;
  tags?: string[];
  classification?: DataClassification;
  pii?: boolean;
  refreshFrequency?: string;
  qualityScore?: number;
  status?: CatalogEntryStatus;
}

export interface ListCatalogOpts {
  type?: CatalogEntryType;
  classification?: DataClassification;
  owner?: string;
  status?: CatalogEntryStatus;
}

export interface CreateQualityRuleInput {
  name: string;
  catalogEntryId?: string;
  type: QualityRuleType;
  description?: string;
  rule: string;
  threshold?: number;
  frequency?: string;
  status?: QualityRuleStatus;
  lastRun?: string;
  lastResult?: QualityCheckResult;
  violations?: number;
}

export interface UpdateQualityRuleInput {
  name?: string;
  catalogEntryId?: string;
  type?: QualityRuleType;
  description?: string;
  rule?: string;
  threshold?: number;
  frequency?: string;
  status?: QualityRuleStatus;
}

export interface ListQualityRulesOpts {
  catalogEntryId?: string;
  type?: QualityRuleType;
  status?: QualityRuleStatus;
}

export interface CreateLineageInput {
  name: string;
  source: string;
  target: string;
  transformation?: string;
  schedule?: string;
  status?: LineageStatus;
  dependencies?: string[];
  dataVolume?: string;
  lastUpdated?: string;
}

export interface UpdateLineageInput {
  name?: string;
  source?: string;
  target?: string;
  transformation?: string;
  schedule?: string;
  status?: LineageStatus;
  dependencies?: string[];
  dataVolume?: string;
  lastUpdated?: string;
}

export interface ListLineageOpts {
  status?: LineageStatus;
}

export interface CreateStewardshipInput {
  catalogEntryId?: string;
  stewardName: string;
  role: StewardRole;
  responsibilities?: string;
  accountability?: string;
  accessLevel?: string;
  status?: StewardshipStatus;
}

export interface UpdateStewardshipInput {
  catalogEntryId?: string;
  stewardName?: string;
  role?: StewardRole;
  responsibilities?: string;
  accountability?: string;
  accessLevel?: string;
  status?: StewardshipStatus;
}

export interface ListStewardshipOpts {
  catalogEntryId?: string;
  role?: StewardRole;
  status?: StewardshipStatus;
}

export interface CreateMDMRecordInput {
  domain: MDMDomain;
  entityName: string;
  goldenRecord: Record<string, unknown>;
  sourceRecords?: Array<{ source: string; recordId: string; matchScore?: number }>;
  status?: MDMRecordStatus;
  qualityScore?: number;
  lastVerified?: string;
  verifiedBy?: string;
}

export interface UpdateMDMRecordInput {
  domain?: MDMDomain;
  entityName?: string;
  goldenRecord?: Record<string, unknown>;
  sourceRecords?: Array<{ source: string; recordId: string; matchScore?: number }>;
  status?: MDMRecordStatus;
  qualityScore?: number;
  lastVerified?: string;
  verifiedBy?: string;
}

export interface ListMDMRecordsOpts {
  domain?: MDMDomain;
  status?: MDMRecordStatus;
}

// ── Helpers ──

const fallbackCatalog: CatalogEntryContent = {
  name: '', type: 'dataset', source: '', owner: '', description: '', tags: [],
  classification: 'internal', pii: false, refreshFrequency: '', qualityScore: null, status: 'active',
};

const fallbackQualityRule: QualityRuleContent = {
  name: '', catalogEntryId: null, type: 'completeness', description: '', rule: '',
  threshold: null, frequency: '', status: 'active', lastRun: null, lastResult: null, violations: 0,
};

const fallbackLineage: LineageContent = {
  name: '', source: '', target: '', transformation: '', schedule: '',
  status: 'active', dependencies: [], dataVolume: '', lastUpdated: null,
};

const fallbackStewardship: StewardshipContent = {
  catalogEntryId: null, stewardName: '', role: 'steward', responsibilities: '',
  accountability: '', accessLevel: '', status: 'active',
};

const fallbackMDM: MDMRecordContent = {
  domain: 'other', entityName: '', goldenRecord: {}, sourceRecords: [],
  status: 'active', qualityScore: null, lastVerified: null, verifiedBy: null,
};

function parseCatalog(raw: string): CatalogEntryContent {
  if (!raw) return fallbackCatalog;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      type: (p.type as CatalogEntryType) ?? 'dataset',
      source: p.source ?? '',
      owner: p.owner ?? '',
      description: p.description ?? '',
      tags: Array.isArray(p.tags) ? p.tags : [],
      classification: (p.classification as DataClassification) ?? 'internal',
      pii: p.pii ?? false,
      refreshFrequency: p.refreshFrequency ?? '',
      qualityScore: p.qualityScore ?? null,
      status: (p.status as CatalogEntryStatus) ?? 'active',
    };
  } catch { return fallbackCatalog; }
}

function parseQualityRule(raw: string): QualityRuleContent {
  if (!raw) return fallbackQualityRule;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      catalogEntryId: p.catalogEntryId ?? null,
      type: (p.type as QualityRuleType) ?? 'completeness',
      description: p.description ?? '',
      rule: p.rule ?? '',
      threshold: p.threshold ?? null,
      frequency: p.frequency ?? '',
      status: (p.status as QualityRuleStatus) ?? 'active',
      lastRun: p.lastRun ?? null,
      lastResult: (p.lastResult as QualityCheckResult) ?? null,
      violations: p.violations ?? 0,
    };
  } catch { return fallbackQualityRule; }
}

function parseLineage(raw: string): LineageContent {
  if (!raw) return fallbackLineage;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      source: p.source ?? '',
      target: p.target ?? '',
      transformation: p.transformation ?? '',
      schedule: p.schedule ?? '',
      status: (p.status as LineageStatus) ?? 'active',
      dependencies: Array.isArray(p.dependencies) ? p.dependencies : [],
      dataVolume: p.dataVolume ?? '',
      lastUpdated: p.lastUpdated ?? null,
    };
  } catch { return fallbackLineage; }
}

function parseStewardship(raw: string): StewardshipContent {
  if (!raw) return fallbackStewardship;
  try {
    const p = JSON.parse(raw);
    return {
      catalogEntryId: p.catalogEntryId ?? null,
      stewardName: p.stewardName ?? '',
      role: (p.role as StewardRole) ?? 'steward',
      responsibilities: p.responsibilities ?? '',
      accountability: p.accountability ?? '',
      accessLevel: p.accessLevel ?? '',
      status: (p.status as StewardshipStatus) ?? 'active',
    };
  } catch { return fallbackStewardship; }
}

function parseMDM(raw: string): MDMRecordContent {
  if (!raw) return fallbackMDM;
  try {
    const p = JSON.parse(raw);
    return {
      domain: (p.domain as MDMDomain) ?? 'other',
      entityName: p.entityName ?? '',
      goldenRecord: p.goldenRecord ?? {},
      sourceRecords: Array.isArray(p.sourceRecords) ? p.sourceRecords : [],
      status: (p.status as MDMRecordStatus) ?? 'active',
      qualityScore: p.qualityScore ?? null,
      lastVerified: p.lastVerified ?? null,
      verifiedBy: p.verifiedBy ?? null,
    };
  } catch { return fallbackMDM; }
}

function toCatalogEntry(row: MemoryRow): CatalogEntry {
  const c = parseCatalog(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, source: c.source, owner: c.owner, description: c.description,
    tags: c.tags, classification: c.classification, pii: c.pii, refreshFrequency: c.refreshFrequency,
    qualityScore: c.qualityScore, status: c.status,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toQualityRule(row: MemoryRow): QualityRule {
  const c = parseQualityRule(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, catalogEntryId: c.catalogEntryId, type: c.type, description: c.description,
    rule: c.rule, threshold: c.threshold, frequency: c.frequency, status: c.status,
    lastRun: c.lastRun ? new Date(c.lastRun) : null, lastResult: c.lastResult, violations: c.violations,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLineage(row: MemoryRow): Lineage {
  const c = parseLineage(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, source: c.source, target: c.target, transformation: c.transformation,
    schedule: c.schedule, status: c.status, dependencies: c.dependencies, dataVolume: c.dataVolume,
    lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toStewardship(row: MemoryRow): Stewardship {
  const c = parseStewardship(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    catalogEntryId: c.catalogEntryId, stewardName: c.stewardName, role: c.role,
    responsibilities: c.responsibilities, accountability: c.accountability,
    accessLevel: c.accessLevel, status: c.status,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMDMRecord(row: MemoryRow): MDMRecord {
  const c = parseMDM(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    domain: c.domain, entityName: c.entityName, goldenRecord: c.goldenRecord,
    sourceRecords: c.sourceRecords, status: c.status, qualityScore: c.qualityScore,
    lastVerified: c.lastVerified ? new Date(c.lastVerified) : null, verifiedBy: c.verifiedBy,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Data Governance Service ──

export const DataGovernanceService = {
  // ── Catalog Entries ──

  async createCatalogEntry(
    organizationId: string,
    workspaceId: string,
    input: CreateCatalogEntryInput,
    createdBy: string,
  ): Promise<CatalogEntry> {
    const content: CatalogEntryContent = {
      name: input.name.trim(),
      type: input.type,
      source: input.source.trim(),
      owner: input.owner ?? '',
      description: input.description ?? '',
      tags: input.tags ?? [],
      classification: input.classification,
      pii: input.pii ?? false,
      refreshFrequency: input.refreshFrequency ?? '',
      qualityScore: input.qualityScore ?? null,
      status: input.status ?? 'active',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'dg_catalog_entry',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dg_catalog_entry', content.type, content.classification, content.status]),
        createdBy,
      },
    });

    return toCatalogEntry(row as MemoryRow);
  },

  async getCatalogEntry(id: string): Promise<CatalogEntry | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dg_catalog_entry') return null;
    return toCatalogEntry(row as MemoryRow);
  },

  async listCatalog(organizationId: string, opts: ListCatalogOpts = {}): Promise<CatalogEntry[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'dg_catalog_entry', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCatalogEntry(r as MemoryRow));
    if (opts.type) records = records.filter((c) => c.type === opts.type);
    if (opts.classification) records = records.filter((c) => c.classification === opts.classification);
    if (opts.owner) records = records.filter((c) => c.owner === opts.owner);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateCatalogEntry(id: string, input: UpdateCatalogEntryInput): Promise<CatalogEntry | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCatalog(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.source !== undefined) content.source = input.source.trim();
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.description !== undefined) content.description = input.description;
    if (input.tags !== undefined) content.tags = input.tags;
    if (input.classification !== undefined) content.classification = input.classification;
    if (input.pii !== undefined) content.pii = input.pii;
    if (input.refreshFrequency !== undefined) content.refreshFrequency = input.refreshFrequency;
    if (input.qualityScore !== undefined) content.qualityScore = input.qualityScore;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dg_catalog_entry', content.type, content.classification, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toCatalogEntry(row as MemoryRow);
  },

  async deleteCatalogEntry(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Quality Rules ──

  async createQualityRule(
    organizationId: string,
    workspaceId: string,
    input: CreateQualityRuleInput,
    createdBy: string,
  ): Promise<QualityRule> {
    const content: QualityRuleContent = {
      name: input.name.trim(),
      catalogEntryId: input.catalogEntryId ?? null,
      type: input.type,
      description: input.description ?? '',
      rule: input.rule,
      threshold: input.threshold ?? null,
      frequency: input.frequency ?? '',
      status: input.status ?? 'active',
      lastRun: input.lastRun ?? null,
      lastResult: input.lastResult ?? null,
      violations: input.violations ?? 0,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'dg_quality_rule',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.catalogEntryId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dg_quality_rule', content.type, content.status]),
        createdBy,
      },
    });

    return toQualityRule(row as MemoryRow);
  },

  async getQualityRule(id: string): Promise<QualityRule | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dg_quality_rule') return null;
    return toQualityRule(row as MemoryRow);
  },

  async listQualityRules(organizationId: string, opts: ListQualityRulesOpts = {}): Promise<QualityRule[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'dg_quality_rule', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toQualityRule(r as MemoryRow));
    if (opts.catalogEntryId) records = records.filter((r) => r.catalogEntryId === opts.catalogEntryId);
    if (opts.type) records = records.filter((r) => r.type === opts.type);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    return records;
  },

  async updateQualityRule(id: string, input: UpdateQualityRuleInput): Promise<QualityRule | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseQualityRule(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.catalogEntryId !== undefined) content.catalogEntryId = input.catalogEntryId;
    if (input.type !== undefined) content.type = input.type;
    if (input.description !== undefined) content.description = input.description;
    if (input.rule !== undefined) content.rule = input.rule;
    if (input.threshold !== undefined) content.threshold = input.threshold;
    if (input.frequency !== undefined) content.frequency = input.frequency;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dg_quality_rule', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toQualityRule(row as MemoryRow);
  },

  async deleteQualityRule(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async runQualityCheck(id: string, result: QualityCheckResult, violations: number, runBy: string): Promise<QualityRule | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseQualityRule(existing.content);
    content.lastRun = new Date().toISOString();
    content.lastResult = result;
    content.violations = violations;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dg_quality_rule', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toQualityRule(row as MemoryRow);
  },

  // ── Lineage ──

  async createLineage(
    organizationId: string,
    workspaceId: string,
    input: CreateLineageInput,
    createdBy: string,
  ): Promise<Lineage> {
    const content: LineageContent = {
      name: input.name.trim(),
      source: input.source,
      target: input.target,
      transformation: input.transformation ?? '',
      schedule: input.schedule ?? '',
      status: input.status ?? 'active',
      dependencies: input.dependencies ?? [],
      dataVolume: input.dataVolume ?? '',
      lastUpdated: input.lastUpdated ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'dg_lineage',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dg_lineage', content.status]),
        createdBy,
      },
    });

    return toLineage(row as MemoryRow);
  },

  async getLineage(id: string): Promise<Lineage | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dg_lineage') return null;
    return toLineage(row as MemoryRow);
  },

  async listLineage(organizationId: string, opts: ListLineageOpts = {}): Promise<Lineage[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'dg_lineage', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toLineage(r as MemoryRow));
    if (opts.status) records = records.filter((l) => l.status === opts.status);
    return records;
  },

  async updateLineage(id: string, input: UpdateLineageInput): Promise<Lineage | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseLineage(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.source !== undefined) content.source = input.source;
    if (input.target !== undefined) content.target = input.target;
    if (input.transformation !== undefined) content.transformation = input.transformation;
    if (input.schedule !== undefined) content.schedule = input.schedule;
    if (input.status !== undefined) content.status = input.status;
    if (input.dependencies !== undefined) content.dependencies = input.dependencies;
    if (input.dataVolume !== undefined) content.dataVolume = input.dataVolume;
    if (input.lastUpdated !== undefined) content.lastUpdated = input.lastUpdated;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dg_lineage', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toLineage(row as MemoryRow);
  },

  async deleteLineage(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async getLineageGraph(organizationId: string, entryId: string): Promise<LineageGraph> {
    const allLineage = await DataGovernanceService.listLineage(organizationId);
    const catalog = await DataGovernanceService.getCatalogEntry(entryId);

    const entryName = catalog?.name ?? entryId;

    const upstream = allLineage
      .filter((l) => l.target === entryName || l.target === entryId)
      .map((l) => ({ id: l.id, name: l.name, source: l.source, target: l.target }));

    const downstream = allLineage
      .filter((l) => l.source === entryName || l.source === entryId)
      .map((l) => ({ id: l.id, name: l.name, source: l.source, target: l.target }));

    return { entryId, upstream, downstream };
  },

  // ── Stewardship ──

  async createStewardship(
    organizationId: string,
    workspaceId: string,
    input: CreateStewardshipInput,
    createdBy: string,
  ): Promise<Stewardship> {
    const content: StewardshipContent = {
      catalogEntryId: input.catalogEntryId ?? null,
      stewardName: input.stewardName.trim(),
      role: input.role,
      responsibilities: input.responsibilities ?? '',
      accountability: input.accountability ?? '',
      accessLevel: input.accessLevel ?? '',
      status: input.status ?? 'active',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'dg_stewardship',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.catalogEntryId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dg_stewardship', content.role, content.status]),
        createdBy,
      },
    });

    return toStewardship(row as MemoryRow);
  },

  async getStewardship(id: string): Promise<Stewardship | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dg_stewardship') return null;
    return toStewardship(row as MemoryRow);
  },

  async listStewardship(organizationId: string, opts: ListStewardshipOpts = {}): Promise<Stewardship[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'dg_stewardship', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toStewardship(r as MemoryRow));
    if (opts.catalogEntryId) records = records.filter((s) => s.catalogEntryId === opts.catalogEntryId);
    if (opts.role) records = records.filter((s) => s.role === opts.role);
    if (opts.status) records = records.filter((s) => s.status === opts.status);
    return records;
  },

  async updateStewardship(id: string, input: UpdateStewardshipInput): Promise<Stewardship | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseStewardship(existing.content);
    if (input.catalogEntryId !== undefined) content.catalogEntryId = input.catalogEntryId;
    if (input.stewardName !== undefined) content.stewardName = input.stewardName.trim();
    if (input.role !== undefined) content.role = input.role;
    if (input.responsibilities !== undefined) content.responsibilities = input.responsibilities;
    if (input.accountability !== undefined) content.accountability = input.accountability;
    if (input.accessLevel !== undefined) content.accessLevel = input.accessLevel;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dg_stewardship', content.role, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toStewardship(row as MemoryRow);
  },

  async deleteStewardship(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── MDM Records ──

  async createMDMRecord(
    organizationId: string,
    workspaceId: string,
    input: CreateMDMRecordInput,
    createdBy: string,
  ): Promise<MDMRecord> {
    const content: MDMRecordContent = {
      domain: input.domain,
      entityName: input.entityName.trim(),
      goldenRecord: input.goldenRecord,
      sourceRecords: input.sourceRecords ?? [],
      status: input.status ?? 'active',
      qualityScore: input.qualityScore ?? null,
      lastVerified: input.lastVerified ?? null,
      verifiedBy: input.verifiedBy ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'dg_mdm_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dg_mdm_record', content.domain, content.status]),
        createdBy,
      },
    });

    return toMDMRecord(row as MemoryRow);
  },

  async getMDMRecord(id: string): Promise<MDMRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dg_mdm_record') return null;
    return toMDMRecord(row as MemoryRow);
  },

  async listMDMRecords(organizationId: string, opts: ListMDMRecordsOpts = {}): Promise<MDMRecord[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'dg_mdm_record', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toMDMRecord(r as MemoryRow));
    if (opts.domain) records = records.filter((r) => r.domain === opts.domain);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    return records;
  },

  async updateMDMRecord(id: string, input: UpdateMDMRecordInput): Promise<MDMRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMDM(existing.content);
    if (input.domain !== undefined) content.domain = input.domain;
    if (input.entityName !== undefined) content.entityName = input.entityName.trim();
    if (input.goldenRecord !== undefined) content.goldenRecord = input.goldenRecord;
    if (input.sourceRecords !== undefined) content.sourceRecords = input.sourceRecords;
    if (input.status !== undefined) content.status = input.status;
    if (input.qualityScore !== undefined) content.qualityScore = input.qualityScore;
    if (input.lastVerified !== undefined) content.lastVerified = input.lastVerified;
    if (input.verifiedBy !== undefined) content.verifiedBy = input.verifiedBy;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dg_mdm_record', content.domain, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toMDMRecord(row as MemoryRow);
  },

  async deleteMDMRecord(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async mergeRecords(id: string, sourceRecordId: string, mergedBy: string): Promise<MDMRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMDM(existing.content);
    content.sourceRecords = [...content.sourceRecords, { source: 'merged', recordId: sourceRecordId, matchScore: 100 }];
    content.status = 'merged';
    content.lastVerified = new Date().toISOString();
    content.verifiedBy = mergedBy;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dg_mdm_record', content.domain, 'merged']),
        },
      }), null,
    );
    if (!row) return null;
    return toMDMRecord(row as MemoryRow);
  },

  async verifyMDMRecord(id: string, verifiedBy: string): Promise<MDMRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMDM(existing.content);
    content.lastVerified = new Date().toISOString();
    content.verifiedBy = verifiedBy;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          verifiedBy,
          verifiedAt: new Date(),
          tags: JSON.stringify(['dg_mdm_record', content.domain, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toMDMRecord(row as MemoryRow);
  },

  // ── Metrics ──

  async getDGMetrics(organizationId: string): Promise<DataGovernanceMetrics> {
    const [catalog, qualityRules, mdmRecords, lineage] = await Promise.all([
      DataGovernanceService.listCatalog(organizationId),
      DataGovernanceService.listQualityRules(organizationId),
      DataGovernanceService.listMDMRecords(organizationId),
      DataGovernanceService.listLineage(organizationId),
    ]);

    const catalogCoverage = catalog.length;
    const piiClassified = catalog.filter((c) => c.classification !== 'internal' || c.pii).length;
    const piiClassificationCoverage = catalog.length > 0
      ? Math.round((piiClassified / catalog.length) * 100)
      : 0;

    const passedRules = qualityRules.filter((r) => r.lastResult === 'pass').length;
    const qualityRulePassRate = qualityRules.length > 0
      ? Math.round((passedRules / qualityRules.length) * 100)
      : 0;

    const mdmGoldenRecords = mdmRecords.filter((r) => r.status === 'active').length;
    const lineageCompleteness = lineage.length;

    return {
      catalogCoverage,
      qualityRulePassRate,
      piiClassificationCoverage,
      mdmGoldenRecords,
      lineageCompleteness,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<DataGovernanceStats> {
    const [catalog, qualityRules, lineage, stewardship, mdmRecords] = await Promise.all([
      DataGovernanceService.listCatalog(organizationId),
      DataGovernanceService.listQualityRules(organizationId),
      DataGovernanceService.listLineage(organizationId),
      DataGovernanceService.listStewardship(organizationId),
      DataGovernanceService.listMDMRecords(organizationId),
    ]);

    const byCatalogType: Record<string, number> = {};
    const byClassification: Record<string, number> = {};
    let piiCount = 0;
    let activeCatalogCount = 0;
    for (const c of catalog) {
      byCatalogType[c.type] = (byCatalogType[c.type] || 0) + 1;
      byClassification[c.classification] = (byClassification[c.classification] || 0) + 1;
      if (c.pii) piiCount++;
      if (c.status === 'active') activeCatalogCount++;
    }

    const passedRules = qualityRules.filter((r) => r.lastResult === 'pass').length;
    const qualityRulePassRate = qualityRules.length > 0
      ? Math.round((passedRules / qualityRules.length) * 100)
      : 0;

    const byMDMDomain: Record<string, number> = {};
    for (const r of mdmRecords) {
      byMDMDomain[r.domain] = (byMDMDomain[r.domain] || 0) + 1;
    }

    return {
      catalogCount: catalog.length,
      qualityRuleCount: qualityRules.length,
      lineageCount: lineage.length,
      stewardshipCount: stewardship.length,
      mdmRecordCount: mdmRecords.length,
      piiCount,
      activeCatalogCount,
      qualityRulePassRate,
      byCatalogType,
      byClassification,
      byMDMDomain,
    };
  },
};
