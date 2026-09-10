import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type IPAssetType = 'patent' | 'trademark' | 'copyright' | 'trade_secret' | 'design' | 'domain' | 'software' | 'other';
export type IPAssetStatus = 'filed' | 'registered' | 'pending' | 'granted' | 'expired' | 'abandoned' | 'in_dispute';
export type LicenseType = 'exclusive' | 'non_exclusive' | 'sole';
export type LicenseStatus = 'active' | 'expired' | 'terminated' | 'suspended' | 'pending';
export type DisputeType = 'infringement' | 'opposition' | 'invalidity' | 'ownership' | 'breach' | 'other';
export type DisputeStatus = 'filed' | 'under_review' | 'resolved' | 'dismissed' | 'appealed';
export type TrademarkStatus = 'filed' | 'registered' | 'pending' | 'opposed' | 'expired' | 'abandoned';
export type TradeSecretCategory = 'technical' | 'commercial' | 'financial' | 'operational' | 'customer' | 'other';
export type TradeSecretAccessLevel = 'restricted' | 'confidential' | 'top_secret';
export type TradeSecretStatus = 'active' | 'deprecated' | 'compromised' | 'retired';

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

interface IPAssetContent {
  title: string;
  type: IPAssetType;
  status: IPAssetStatus;
  registrationNumber: string | null;
  filingDate: string | null;
  grantDate: string | null;
  expiryDate: string | null;
  jurisdiction: string;
  inventor: string;
  owner: string;
  description: string;
  value: number | null;
  classification: string;
  tags: string[];
  notes: string;
}

interface LicenseContent {
  assetId: string;
  licensee: string;
  type: LicenseType;
  territory: string;
  fieldOfUse: string;
  startDate: string;
  endDate: string | null;
  royaltyRate: number | null;
  minimumRoyalty: number | null;
  upfrontFee: number | null;
  status: LicenseStatus;
  terms: string;
  restrictions: string;
  signedDate: string | null;
}

interface DisputeContent {
  assetId: string | null;
  title: string;
  type: DisputeType;
  status: DisputeStatus;
  opposingParty: string;
  filedDate: string | null;
  jurisdiction: string;
  description: string;
  claims: string[];
  evidence: string[];
  resolution: string;
  legalCosts: number | null;
}

interface TrademarkContent {
  name: string;
  classes: string[];
  registrationNumber: string | null;
  filingDate: string | null;
  registrationDate: string | null;
  expiryDate: string | null;
  jurisdiction: string;
  status: TrademarkStatus;
  logoDescription: string;
  colorsClaimed: string;
  priorityClaim: string;
  owner: string;
  attorney: string;
}

interface TradeSecretContent {
  name: string;
  description: string;
  category: TradeSecretCategory;
  accessLevel: TradeSecretAccessLevel;
  owner: string;
  custodian: string;
  protectionMeasures: string[];
  disclosureHistory: string;
  value: number | null;
  createdDate: string | null;
  lastReviewed: string | null;
  status: TradeSecretStatus;
}

// ── Public interfaces ──

export interface IPAsset {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: IPAssetType;
  status: IPAssetStatus;
  registrationNumber: string | null;
  filingDate: Date | null;
  grantDate: Date | null;
  expiryDate: Date | null;
  jurisdiction: string;
  inventor: string;
  owner: string;
  description: string;
  value: number | null;
  classification: string;
  tags: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPLicense {
  id: string;
  organizationId: string;
  workspaceId: string;
  assetId: string;
  licensee: string;
  type: LicenseType;
  territory: string;
  fieldOfUse: string;
  startDate: Date;
  endDate: Date | null;
  royaltyRate: number | null;
  minimumRoyalty: number | null;
  upfrontFee: number | null;
  status: LicenseStatus;
  terms: string;
  restrictions: string;
  signedDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPDispute {
  id: string;
  organizationId: string;
  workspaceId: string;
  assetId: string | null;
  title: string;
  type: DisputeType;
  status: DisputeStatus;
  opposingParty: string;
  filedDate: Date | null;
  jurisdiction: string;
  description: string;
  claims: string[];
  evidence: string[];
  resolution: string;
  legalCosts: number | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trademark {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  classes: string[];
  registrationNumber: string | null;
  filingDate: Date | null;
  registrationDate: Date | null;
  expiryDate: Date | null;
  jurisdiction: string;
  status: TrademarkStatus;
  logoDescription: string;
  colorsClaimed: string;
  priorityClaim: string;
  owner: string;
  attorney: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeSecret {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  category: TradeSecretCategory;
  accessLevel: TradeSecretAccessLevel;
  owner: string;
  custodian: string;
  protectionMeasures: string[];
  disclosureHistory: string;
  value: number | null;
  createdDate: Date | null;
  lastReviewed: Date | null;
  status: TradeSecretStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPMetrics {
  portfolioValue: number;
  activeLicenses: number;
  royaltyIncome: number;
  pendingDisputes: number;
  expiringIP: number;
  byType: Record<string, number>;
}

export interface IPStats {
  assetCount: number;
  licenseCount: number;
  disputeCount: number;
  trademarkCount: number;
  tradeSecretCount: number;
  activeLicenseCount: number;
  pendingDisputeCount: number;
  portfolioValue: number;
  royaltyIncome: number;
  byAssetType: Record<string, number>;
  byAssetStatus: Record<string, number>;
  byDisputeStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateIPAssetInput {
  title: string;
  type: IPAssetType;
  status: IPAssetStatus;
  registrationNumber?: string;
  filingDate?: string;
  grantDate?: string;
  expiryDate?: string;
  jurisdiction?: string;
  inventor?: string;
  owner?: string;
  description?: string;
  value?: number;
  classification?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateIPAssetInput {
  title?: string;
  type?: IPAssetType;
  status?: IPAssetStatus;
  registrationNumber?: string;
  filingDate?: string;
  grantDate?: string;
  expiryDate?: string;
  jurisdiction?: string;
  inventor?: string;
  owner?: string;
  description?: string;
  value?: number;
  classification?: string;
  tags?: string[];
  notes?: string;
}

export interface ListIPAssetsOpts {
  type?: IPAssetType;
  status?: IPAssetStatus;
  jurisdiction?: string;
  owner?: string;
}

export interface CreateLicenseInput {
  assetId: string;
  licensee: string;
  type: LicenseType;
  territory?: string;
  fieldOfUse?: string;
  startDate: string;
  endDate?: string;
  royaltyRate?: number;
  minimumRoyalty?: number;
  upfrontFee?: number;
  status?: LicenseStatus;
  terms?: string;
  restrictions?: string;
  signedDate?: string;
}

export interface UpdateLicenseInput {
  licensee?: string;
  type?: LicenseType;
  territory?: string;
  fieldOfUse?: string;
  startDate?: string;
  endDate?: string;
  royaltyRate?: number;
  minimumRoyalty?: number;
  upfrontFee?: number;
  status?: LicenseStatus;
  terms?: string;
  restrictions?: string;
  signedDate?: string;
}

export interface ListLicensesOpts {
  assetId?: string;
  type?: LicenseType;
  status?: LicenseStatus;
  licensee?: string;
}

export interface CreateDisputeInput {
  assetId?: string;
  title: string;
  type: DisputeType;
  status?: DisputeStatus;
  opposingParty?: string;
  filedDate?: string;
  jurisdiction?: string;
  description?: string;
  claims?: string[];
  evidence?: string[];
  resolution?: string;
  legalCosts?: number;
}

export interface UpdateDisputeInput {
  title?: string;
  type?: DisputeType;
  status?: DisputeStatus;
  opposingParty?: string;
  filedDate?: string;
  jurisdiction?: string;
  description?: string;
  claims?: string[];
  evidence?: string[];
  legalCosts?: number;
}

export interface ListDisputesOpts {
  assetId?: string;
  type?: DisputeType;
  status?: DisputeStatus;
}

export interface CreateTrademarkInput {
  name: string;
  classes: string[];
  registrationNumber?: string;
  filingDate?: string;
  registrationDate?: string;
  expiryDate?: string;
  jurisdiction?: string;
  status: TrademarkStatus;
  logoDescription?: string;
  colorsClaimed?: string;
  priorityClaim?: string;
  owner?: string;
  attorney?: string;
}

export interface UpdateTrademarkInput {
  name?: string;
  classes?: string[];
  registrationNumber?: string;
  filingDate?: string;
  registrationDate?: string;
  expiryDate?: string;
  jurisdiction?: string;
  status?: TrademarkStatus;
  logoDescription?: string;
  colorsClaimed?: string;
  priorityClaim?: string;
  owner?: string;
  attorney?: string;
}

export interface ListTrademarksOpts {
  status?: TrademarkStatus;
  jurisdiction?: string;
}

export interface CreateTradeSecretInput {
  name: string;
  description?: string;
  category: TradeSecretCategory;
  accessLevel: TradeSecretAccessLevel;
  owner?: string;
  custodian?: string;
  protectionMeasures?: string[];
  disclosureHistory?: string;
  value?: number;
  createdDate?: string;
  lastReviewed?: string;
  status?: TradeSecretStatus;
}

export interface UpdateTradeSecretInput {
  name?: string;
  description?: string;
  category?: TradeSecretCategory;
  accessLevel?: TradeSecretAccessLevel;
  owner?: string;
  custodian?: string;
  protectionMeasures?: string[];
  disclosureHistory?: string;
  value?: number;
  createdDate?: string;
  lastReviewed?: string;
  status?: TradeSecretStatus;
}

export interface ListTradeSecretsOpts {
  category?: TradeSecretCategory;
  accessLevel?: TradeSecretAccessLevel;
  status?: TradeSecretStatus;
}

// ── Helpers ──

const fallbackAsset: IPAssetContent = {
  title: '', type: 'other', status: 'filed', registrationNumber: null, filingDate: null,
  grantDate: null, expiryDate: null, jurisdiction: '', inventor: '', owner: '',
  description: '', value: null, classification: '', tags: [], notes: '',
};

const fallbackLicense: LicenseContent = {
  assetId: '', licensee: '', type: 'non_exclusive', territory: '', fieldOfUse: '',
  startDate: '', endDate: null, royaltyRate: null, minimumRoyalty: null, upfrontFee: null,
  status: 'active', terms: '', restrictions: '', signedDate: null,
};

const fallbackDispute: DisputeContent = {
  assetId: null, title: '', type: 'other', status: 'filed', opposingParty: '',
  filedDate: null, jurisdiction: '', description: '', claims: [], evidence: [],
  resolution: '', legalCosts: null,
};

const fallbackTrademark: TrademarkContent = {
  name: '', classes: [], registrationNumber: null, filingDate: null,
  registrationDate: null, expiryDate: null, jurisdiction: '', status: 'filed',
  logoDescription: '', colorsClaimed: '', priorityClaim: '', owner: '', attorney: '',
};

const fallbackTradeSecret: TradeSecretContent = {
  name: '', description: '', category: 'other', accessLevel: 'confidential',
  owner: '', custodian: '', protectionMeasures: [], disclosureHistory: '',
  value: null, createdDate: null, lastReviewed: null, status: 'active',
};

function parseAsset(raw: string): IPAssetContent {
  if (!raw) return fallbackAsset;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      type: (p.type as IPAssetType) ?? 'other',
      status: (p.status as IPAssetStatus) ?? 'filed',
      registrationNumber: p.registrationNumber ?? null,
      filingDate: p.filingDate ?? null,
      grantDate: p.grantDate ?? null,
      expiryDate: p.expiryDate ?? null,
      jurisdiction: p.jurisdiction ?? '',
      inventor: p.inventor ?? '',
      owner: p.owner ?? '',
      description: p.description ?? '',
      value: p.value ?? null,
      classification: p.classification ?? '',
      tags: Array.isArray(p.tags) ? p.tags : [],
      notes: p.notes ?? '',
    };
  } catch { return fallbackAsset; }
}

function parseLicense(raw: string): LicenseContent {
  if (!raw) return fallbackLicense;
  try {
    const p = JSON.parse(raw);
    return {
      assetId: p.assetId ?? '',
      licensee: p.licensee ?? '',
      type: (p.type as LicenseType) ?? 'non_exclusive',
      territory: p.territory ?? '',
      fieldOfUse: p.fieldOfUse ?? '',
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? null,
      royaltyRate: p.royaltyRate ?? null,
      minimumRoyalty: p.minimumRoyalty ?? null,
      upfrontFee: p.upfrontFee ?? null,
      status: (p.status as LicenseStatus) ?? 'active',
      terms: p.terms ?? '',
      restrictions: p.restrictions ?? '',
      signedDate: p.signedDate ?? null,
    };
  } catch { return fallbackLicense; }
}

function parseDispute(raw: string): DisputeContent {
  if (!raw) return fallbackDispute;
  try {
    const p = JSON.parse(raw);
    return {
      assetId: p.assetId ?? null,
      title: p.title ?? '',
      type: (p.type as DisputeType) ?? 'other',
      status: (p.status as DisputeStatus) ?? 'filed',
      opposingParty: p.opposingParty ?? '',
      filedDate: p.filedDate ?? null,
      jurisdiction: p.jurisdiction ?? '',
      description: p.description ?? '',
      claims: Array.isArray(p.claims) ? p.claims : [],
      evidence: Array.isArray(p.evidence) ? p.evidence : [],
      resolution: p.resolution ?? '',
      legalCosts: p.legalCosts ?? null,
    };
  } catch { return fallbackDispute; }
}

function parseTrademark(raw: string): TrademarkContent {
  if (!raw) return fallbackTrademark;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      classes: Array.isArray(p.classes) ? p.classes : [],
      registrationNumber: p.registrationNumber ?? null,
      filingDate: p.filingDate ?? null,
      registrationDate: p.registrationDate ?? null,
      expiryDate: p.expiryDate ?? null,
      jurisdiction: p.jurisdiction ?? '',
      status: (p.status as TrademarkStatus) ?? 'filed',
      logoDescription: p.logoDescription ?? '',
      colorsClaimed: p.colorsClaimed ?? '',
      priorityClaim: p.priorityClaim ?? '',
      owner: p.owner ?? '',
      attorney: p.attorney ?? '',
    };
  } catch { return fallbackTrademark; }
}

function parseTradeSecret(raw: string): TradeSecretContent {
  if (!raw) return fallbackTradeSecret;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      description: p.description ?? '',
      category: (p.category as TradeSecretCategory) ?? 'other',
      accessLevel: (p.accessLevel as TradeSecretAccessLevel) ?? 'confidential',
      owner: p.owner ?? '',
      custodian: p.custodian ?? '',
      protectionMeasures: Array.isArray(p.protectionMeasures) ? p.protectionMeasures : [],
      disclosureHistory: p.disclosureHistory ?? '',
      value: p.value ?? null,
      createdDate: p.createdDate ?? null,
      lastReviewed: p.lastReviewed ?? null,
      status: (p.status as TradeSecretStatus) ?? 'active',
    };
  } catch { return fallbackTradeSecret; }
}

function toAsset(row: MemoryRow): IPAsset {
  const c = parseAsset(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, type: c.type, status: c.status, registrationNumber: c.registrationNumber,
    filingDate: c.filingDate ? new Date(c.filingDate) : null,
    grantDate: c.grantDate ? new Date(c.grantDate) : null,
    expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
    jurisdiction: c.jurisdiction, inventor: c.inventor, owner: c.owner,
    description: c.description, value: c.value, classification: c.classification,
    tags: c.tags, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLicense(row: MemoryRow): IPLicense {
  const c = parseLicense(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    assetId: c.assetId, licensee: c.licensee, type: c.type, territory: c.territory,
    fieldOfUse: c.fieldOfUse, startDate: c.startDate ? new Date(c.startDate) : row.createdAt,
    endDate: c.endDate ? new Date(c.endDate) : null,
    royaltyRate: c.royaltyRate, minimumRoyalty: c.minimumRoyalty, upfrontFee: c.upfrontFee,
    status: c.status, terms: c.terms, restrictions: c.restrictions,
    signedDate: c.signedDate ? new Date(c.signedDate) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDispute(row: MemoryRow): IPDispute {
  const c = parseDispute(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    assetId: c.assetId, title: c.title, type: c.type, status: c.status,
    opposingParty: c.opposingParty,
    filedDate: c.filedDate ? new Date(c.filedDate) : null,
    jurisdiction: c.jurisdiction, description: c.description, claims: c.claims,
    evidence: c.evidence, resolution: c.resolution, legalCosts: c.legalCosts,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTrademark(row: MemoryRow): Trademark {
  const c = parseTrademark(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, classes: c.classes, registrationNumber: c.registrationNumber,
    filingDate: c.filingDate ? new Date(c.filingDate) : null,
    registrationDate: c.registrationDate ? new Date(c.registrationDate) : null,
    expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
    jurisdiction: c.jurisdiction, status: c.status,
    logoDescription: c.logoDescription, colorsClaimed: c.colorsClaimed,
    priorityClaim: c.priorityClaim, owner: c.owner, attorney: c.attorney,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTradeSecret(row: MemoryRow): TradeSecret {
  const c = parseTradeSecret(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, description: c.description, category: c.category, accessLevel: c.accessLevel,
    owner: c.owner, custodian: c.custodian, protectionMeasures: c.protectionMeasures,
    disclosureHistory: c.disclosureHistory, value: c.value,
    createdDate: c.createdDate ? new Date(c.createdDate) : null,
    lastReviewed: c.lastReviewed ? new Date(c.lastReviewed) : null,
    status: c.status,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── IP Service ──

export const IPService = {
  // ── Assets ──

  async createAsset(
    organizationId: string,
    workspaceId: string,
    input: CreateIPAssetInput,
    createdBy: string,
  ): Promise<IPAsset> {
    const content: IPAssetContent = {
      title: input.title.trim(),
      type: input.type,
      status: input.status,
      registrationNumber: input.registrationNumber ?? null,
      filingDate: input.filingDate ?? null,
      grantDate: input.grantDate ?? null,
      expiryDate: input.expiryDate ?? null,
      jurisdiction: input.jurisdiction ?? '',
      inventor: input.inventor ?? '',
      owner: input.owner ?? '',
      description: input.description ?? '',
      value: input.value ?? null,
      classification: input.classification ?? '',
      tags: input.tags ?? [],
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ip_asset',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ip_asset', content.type, content.status]),
        createdBy,
      },
    });

    return toAsset(row as MemoryRow);
  },

  async getAsset(id: string): Promise<IPAsset | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ip_asset') return null;
    return toAsset(row as MemoryRow);
  },

  async listAssets(organizationId: string, opts: ListIPAssetsOpts = {}): Promise<IPAsset[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ip_asset', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toAsset(r as MemoryRow));
    if (opts.type) records = records.filter((a) => a.type === opts.type);
    if (opts.status) records = records.filter((a) => a.status === opts.status);
    if (opts.jurisdiction) records = records.filter((a) => a.jurisdiction === opts.jurisdiction);
    if (opts.owner) records = records.filter((a) => a.owner === opts.owner);
    return records;
  },

  async updateAsset(id: string, input: UpdateIPAssetInput): Promise<IPAsset | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAsset(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.status !== undefined) content.status = input.status;
    if (input.registrationNumber !== undefined) content.registrationNumber = input.registrationNumber;
    if (input.filingDate !== undefined) content.filingDate = input.filingDate;
    if (input.grantDate !== undefined) content.grantDate = input.grantDate;
    if (input.expiryDate !== undefined) content.expiryDate = input.expiryDate;
    if (input.jurisdiction !== undefined) content.jurisdiction = input.jurisdiction;
    if (input.inventor !== undefined) content.inventor = input.inventor;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.description !== undefined) content.description = input.description;
    if (input.value !== undefined) content.value = input.value;
    if (input.classification !== undefined) content.classification = input.classification;
    if (input.tags !== undefined) content.tags = input.tags;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ip_asset', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toAsset(row as MemoryRow);
  },

  async deleteAsset(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async getExpiringIP(organizationId: string, daysAhead = 180): Promise<IPAsset[]> {
    const assets = await IPService.listAssets(organizationId);
    const now = new Date();
    const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    return assets.filter((a) => {
      if (!a.expiryDate) return false;
      if (a.status === 'expired' || a.status === 'abandoned') return false;
      return a.expiryDate >= now && a.expiryDate <= horizon;
    });
  },

  // ── Licenses ──

  async createLicense(
    organizationId: string,
    workspaceId: string,
    input: CreateLicenseInput,
    createdBy: string,
  ): Promise<IPLicense> {
    const content: LicenseContent = {
      assetId: input.assetId,
      licensee: input.licensee.trim(),
      type: input.type,
      territory: input.territory ?? '',
      fieldOfUse: input.fieldOfUse ?? '',
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      royaltyRate: input.royaltyRate ?? null,
      minimumRoyalty: input.minimumRoyalty ?? null,
      upfrontFee: input.upfrontFee ?? null,
      status: input.status ?? 'active',
      terms: input.terms ?? '',
      restrictions: input.restrictions ?? '',
      signedDate: input.signedDate ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ip_license',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.assetId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ip_license', content.type, content.status]),
        createdBy,
      },
    });

    return toLicense(row as MemoryRow);
  },

  async getLicense(id: string): Promise<IPLicense | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ip_license') return null;
    return toLicense(row as MemoryRow);
  },

  async listLicenses(organizationId: string, opts: ListLicensesOpts = {}): Promise<IPLicense[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ip_license', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toLicense(r as MemoryRow));
    if (opts.assetId) records = records.filter((l) => l.assetId === opts.assetId);
    if (opts.type) records = records.filter((l) => l.type === opts.type);
    if (opts.status) records = records.filter((l) => l.status === opts.status);
    if (opts.licensee) records = records.filter((l) => l.licensee === opts.licensee);
    return records;
  },

  async updateLicense(id: string, input: UpdateLicenseInput): Promise<IPLicense | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseLicense(existing.content);
    if (input.licensee !== undefined) content.licensee = input.licensee.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.territory !== undefined) content.territory = input.territory;
    if (input.fieldOfUse !== undefined) content.fieldOfUse = input.fieldOfUse;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.royaltyRate !== undefined) content.royaltyRate = input.royaltyRate;
    if (input.minimumRoyalty !== undefined) content.minimumRoyalty = input.minimumRoyalty;
    if (input.upfrontFee !== undefined) content.upfrontFee = input.upfrontFee;
    if (input.status !== undefined) content.status = input.status;
    if (input.terms !== undefined) content.terms = input.terms;
    if (input.restrictions !== undefined) content.restrictions = input.restrictions;
    if (input.signedDate !== undefined) content.signedDate = input.signedDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ip_license', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toLicense(row as MemoryRow);
  },

  async terminateLicense(id: string, reason: string, terminatedBy: string): Promise<IPLicense | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseLicense(existing.content);
    content.status = 'terminated';
    content.restrictions = content.restrictions
      ? `${content.restrictions}\n[Terminated by ${terminatedBy}: ${reason}]`
      : `[Terminated by ${terminatedBy}: ${reason}]`;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ip_license', content.type, 'terminated']),
          verifiedBy: terminatedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toLicense(row as MemoryRow);
  },

  async renewLicense(id: string, newEndDate: string, renewedBy: string): Promise<IPLicense | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseLicense(existing.content);
    content.endDate = newEndDate;
    content.status = 'active';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ip_license', content.type, 'active']),
          verifiedBy: renewedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toLicense(row as MemoryRow);
  },

  // ── Disputes ──

  async createDispute(
    organizationId: string,
    workspaceId: string,
    input: CreateDisputeInput,
    createdBy: string,
  ): Promise<IPDispute> {
    const content: DisputeContent = {
      assetId: input.assetId ?? null,
      title: input.title.trim(),
      type: input.type,
      status: input.status ?? 'filed',
      opposingParty: input.opposingParty ?? '',
      filedDate: input.filedDate ?? null,
      jurisdiction: input.jurisdiction ?? '',
      description: input.description ?? '',
      claims: input.claims ?? [],
      evidence: input.evidence ?? [],
      resolution: input.resolution ?? '',
      legalCosts: input.legalCosts ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ip_dispute',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.assetId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ip_dispute', content.type, content.status]),
        createdBy,
      },
    });

    return toDispute(row as MemoryRow);
  },

  async getDispute(id: string): Promise<IPDispute | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ip_dispute') return null;
    return toDispute(row as MemoryRow);
  },

  async listDisputes(organizationId: string, opts: ListDisputesOpts = {}): Promise<IPDispute[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ip_dispute', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toDispute(r as MemoryRow));
    if (opts.assetId) records = records.filter((d) => d.assetId === opts.assetId);
    if (opts.type) records = records.filter((d) => d.type === opts.type);
    if (opts.status) records = records.filter((d) => d.status === opts.status);
    return records;
  },

  async updateDispute(id: string, input: UpdateDisputeInput): Promise<IPDispute | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDispute(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.status !== undefined) content.status = input.status;
    if (input.opposingParty !== undefined) content.opposingParty = input.opposingParty;
    if (input.filedDate !== undefined) content.filedDate = input.filedDate;
    if (input.jurisdiction !== undefined) content.jurisdiction = input.jurisdiction;
    if (input.description !== undefined) content.description = input.description;
    if (input.claims !== undefined) content.claims = input.claims;
    if (input.evidence !== undefined) content.evidence = input.evidence;
    if (input.legalCosts !== undefined) content.legalCosts = input.legalCosts;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ip_dispute', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toDispute(row as MemoryRow);
  },

  async resolveDispute(id: string, resolution: string, resolvedBy: string): Promise<IPDispute | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDispute(existing.content);
    content.status = 'resolved';
    content.resolution = resolution;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ip_dispute', content.type, 'resolved']),
          verifiedBy: resolvedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toDispute(row as MemoryRow);
  },

  async appealDispute(id: string, appealDetails: string, appealedBy: string): Promise<IPDispute | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDispute(existing.content);
    content.status = 'appealed';
    content.claims = [...content.claims, `[Appeal by ${appealedBy}: ${appealDetails}]`];

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ip_dispute', content.type, 'appealed']),
          verifiedBy: appealedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toDispute(row as MemoryRow);
  },

  // ── Trademarks ──

  async createTrademark(
    organizationId: string,
    workspaceId: string,
    input: CreateTrademarkInput,
    createdBy: string,
  ): Promise<Trademark> {
    const content: TrademarkContent = {
      name: input.name.trim(),
      classes: input.classes,
      registrationNumber: input.registrationNumber ?? null,
      filingDate: input.filingDate ?? null,
      registrationDate: input.registrationDate ?? null,
      expiryDate: input.expiryDate ?? null,
      jurisdiction: input.jurisdiction ?? '',
      status: input.status,
      logoDescription: input.logoDescription ?? '',
      colorsClaimed: input.colorsClaimed ?? '',
      priorityClaim: input.priorityClaim ?? '',
      owner: input.owner ?? '',
      attorney: input.attorney ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ip_trademark',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ip_trademark', content.status]),
        createdBy,
      },
    });

    return toTrademark(row as MemoryRow);
  },

  async getTrademark(id: string): Promise<Trademark | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ip_trademark') return null;
    return toTrademark(row as MemoryRow);
  },

  async listTrademarks(organizationId: string, opts: ListTrademarksOpts = {}): Promise<Trademark[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ip_trademark', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTrademark(r as MemoryRow));
    if (opts.status) records = records.filter((t) => t.status === opts.status);
    if (opts.jurisdiction) records = records.filter((t) => t.jurisdiction === opts.jurisdiction);
    return records;
  },

  async updateTrademark(id: string, input: UpdateTrademarkInput): Promise<Trademark | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTrademark(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.classes !== undefined) content.classes = input.classes;
    if (input.registrationNumber !== undefined) content.registrationNumber = input.registrationNumber;
    if (input.filingDate !== undefined) content.filingDate = input.filingDate;
    if (input.registrationDate !== undefined) content.registrationDate = input.registrationDate;
    if (input.expiryDate !== undefined) content.expiryDate = input.expiryDate;
    if (input.jurisdiction !== undefined) content.jurisdiction = input.jurisdiction;
    if (input.status !== undefined) content.status = input.status;
    if (input.logoDescription !== undefined) content.logoDescription = input.logoDescription;
    if (input.colorsClaimed !== undefined) content.colorsClaimed = input.colorsClaimed;
    if (input.priorityClaim !== undefined) content.priorityClaim = input.priorityClaim;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.attorney !== undefined) content.attorney = input.attorney;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ip_trademark', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toTrademark(row as MemoryRow);
  },

  async deleteTrademark(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Trade Secrets ──

  async createTradeSecret(
    organizationId: string,
    workspaceId: string,
    input: CreateTradeSecretInput,
    createdBy: string,
  ): Promise<TradeSecret> {
    const content: TradeSecretContent = {
      name: input.name.trim(),
      description: input.description ?? '',
      category: input.category,
      accessLevel: input.accessLevel,
      owner: input.owner ?? '',
      custodian: input.custodian ?? '',
      protectionMeasures: input.protectionMeasures ?? [],
      disclosureHistory: input.disclosureHistory ?? '',
      value: input.value ?? null,
      createdDate: input.createdDate ?? null,
      lastReviewed: input.lastReviewed ?? null,
      status: input.status ?? 'active',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ip_trade_secret',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ip_trade_secret', content.category, content.accessLevel, content.status]),
        createdBy,
      },
    });

    return toTradeSecret(row as MemoryRow);
  },

  async getTradeSecret(id: string): Promise<TradeSecret | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ip_trade_secret') return null;
    return toTradeSecret(row as MemoryRow);
  },

  async listTradeSecrets(organizationId: string, opts: ListTradeSecretsOpts = {}): Promise<TradeSecret[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ip_trade_secret', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTradeSecret(r as MemoryRow));
    if (opts.category) records = records.filter((s) => s.category === opts.category);
    if (opts.accessLevel) records = records.filter((s) => s.accessLevel === opts.accessLevel);
    if (opts.status) records = records.filter((s) => s.status === opts.status);
    return records;
  },

  async updateTradeSecret(id: string, input: UpdateTradeSecretInput): Promise<TradeSecret | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTradeSecret(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.accessLevel !== undefined) content.accessLevel = input.accessLevel;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.custodian !== undefined) content.custodian = input.custodian;
    if (input.protectionMeasures !== undefined) content.protectionMeasures = input.protectionMeasures;
    if (input.disclosureHistory !== undefined) content.disclosureHistory = input.disclosureHistory;
    if (input.value !== undefined) content.value = input.value;
    if (input.createdDate !== undefined) content.createdDate = input.createdDate;
    if (input.lastReviewed !== undefined) content.lastReviewed = input.lastReviewed;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ip_trade_secret', content.category, content.accessLevel, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toTradeSecret(row as MemoryRow);
  },

  async deleteTradeSecret(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async reviewTradeSecret(id: string, reviewedBy: string): Promise<TradeSecret | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTradeSecret(existing.content);
    content.lastReviewed = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          verifiedBy: reviewedBy,
          verifiedAt: new Date(),
          tags: JSON.stringify(['ip_trade_secret', content.category, content.accessLevel, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toTradeSecret(row as MemoryRow);
  },

  // ── Metrics ──

  async getIPMetrics(organizationId: string): Promise<IPMetrics> {
    const [assets, licenses, disputes, expiring] = await Promise.all([
      IPService.listAssets(organizationId),
      IPService.listLicenses(organizationId),
      IPService.listDisputes(organizationId),
      IPService.getExpiringIP(organizationId),
    ]);

    const portfolioValue = assets.reduce((sum, a) => sum + (a.value ?? 0), 0);
    const activeLicenses = licenses.filter((l) => l.status === 'active').length;
    const royaltyIncome = licenses
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + (l.royaltyRate ?? 0) * (l.minimumRoyalty ?? 0), 0);
    const pendingDisputes = disputes.filter(
      (d) => d.status === 'filed' || d.status === 'under_review' || d.status === 'appealed',
    ).length;

    const byType: Record<string, number> = {};
    for (const a of assets) {
      byType[a.type] = (byType[a.type] || 0) + 1;
    }

    return {
      portfolioValue,
      activeLicenses,
      royaltyIncome,
      pendingDisputes,
      expiringIP: expiring.length,
      byType,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<IPStats> {
    const [assets, licenses, disputes, trademarks, tradeSecrets] = await Promise.all([
      IPService.listAssets(organizationId),
      IPService.listLicenses(organizationId),
      IPService.listDisputes(organizationId),
      IPService.listTrademarks(organizationId),
      IPService.listTradeSecrets(organizationId),
    ]);

    const byAssetType: Record<string, number> = {};
    const byAssetStatus: Record<string, number> = {};
    let portfolioValue = 0;
    for (const a of assets) {
      byAssetType[a.type] = (byAssetType[a.type] || 0) + 1;
      byAssetStatus[a.status] = (byAssetStatus[a.status] || 0) + 1;
      portfolioValue += a.value ?? 0;
    }

    const byDisputeStatus: Record<string, number> = {};
    let pendingDisputeCount = 0;
    for (const d of disputes) {
      byDisputeStatus[d.status] = (byDisputeStatus[d.status] || 0) + 1;
      if (d.status === 'filed' || d.status === 'under_review' || d.status === 'appealed') pendingDisputeCount++;
    }

    const activeLicenseCount = licenses.filter((l) => l.status === 'active').length;
    const royaltyIncome = licenses
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + (l.royaltyRate ?? 0) * (l.minimumRoyalty ?? 0), 0);

    return {
      assetCount: assets.length,
      licenseCount: licenses.length,
      disputeCount: disputes.length,
      trademarkCount: trademarks.length,
      tradeSecretCount: tradeSecrets.length,
      activeLicenseCount,
      pendingDisputeCount,
      portfolioValue,
      royaltyIncome,
      byAssetType,
      byAssetStatus,
      byDisputeStatus,
    };
  },
};
