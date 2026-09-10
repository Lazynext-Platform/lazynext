import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ContractType =
  | 'nda'
  | 'employment'
  | 'vendor'
  | 'client'
  | 'partnership'
  | 'license'
  | 'lease'
  | 'service_agreement'
  | 'other';

export type ContractStatus =
  | 'draft'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'under_review';

export type PartyType = 'individual' | 'company';

/** Raw Memory row as stored in the database. */
interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Parsed content payload for a contract Memory. */
interface ContractContent {
  title: string;
  type: ContractType;
  partyName: string;
  partyType: PartyType;
  effectiveDate: string;
  endDate: string | null;
  value: number | null;
  currency: string;
  status: ContractStatus;
  jurisdiction: string;
  tags: string[];
}

/** A structured contract returned to callers. */
export interface LegalContract {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ContractType;
  partyName: string;
  partyType: PartyType;
  effectiveDate: Date;
  endDate: Date | null;
  value: number | null;
  currency: string;
  status: ContractStatus;
  jurisdiction: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContractInput {
  title: string;
  type: ContractType;
  partyName: string;
  partyType?: PartyType;
  effectiveDate: Date | string;
  endDate?: Date | string;
  value?: number;
  currency?: string;
  status?: ContractStatus;
  jurisdiction?: string;
  tags?: string[];
  workspaceId?: string;
  createdBy: string;
}

export interface ListContractOpts {
  type?: ContractType;
  status?: ContractStatus;
  partyName?: string;
  search?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

export interface UpdateContractInput {
  title?: string;
  type?: ContractType;
  partyName?: string;
  partyType?: PartyType;
  effectiveDate?: Date | string;
  endDate?: Date | string;
  value?: number;
  currency?: string;
  jurisdiction?: string;
  tags?: string[];
}

export interface ContractStats {
  totalContracts: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  activeCount: number;
  expiringCount: number;
  totalValue: number;
}

// ── Helpers ──

const fallbackContent: ContractContent = {
  title: '',
  type: 'other',
  partyName: '',
  partyType: 'company',
  effectiveDate: new Date().toISOString(),
  endDate: null,
  value: null,
  currency: 'USD',
  status: 'draft',
  jurisdiction: '',
  tags: [],
};

function parseContractContent(raw: string): ContractContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title ?? '',
      type: (parsed.type as ContractType) ?? 'other',
      partyName: parsed.partyName ?? '',
      partyType: (parsed.partyType as PartyType) ?? 'company',
      effectiveDate: parsed.effectiveDate ?? new Date().toISOString(),
      endDate: parsed.endDate ?? null,
      value: parsed.value !== undefined && parsed.value !== null ? Number(parsed.value) : null,
      currency: parsed.currency ?? 'USD',
      status: (parsed.status as ContractStatus) ?? 'draft',
      jurisdiction: parsed.jurisdiction ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return fallbackContent;
  }
}

function toContract(row: MemoryRow): LegalContract {
  const content = parseContractContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    title: content.title,
    type: content.type,
    partyName: content.partyName,
    partyType: content.partyType,
    effectiveDate: new Date(content.effectiveDate),
    endDate: content.endDate ? new Date(content.endDate) : null,
    value: content.value,
    currency: content.currency,
    status: content.status,
    jurisdiction: content.jurisdiction,
    tags: content.tags,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Legal Contract Service ──

export const LegalContractService = {
  /**
   * Create a legal contract. Stored as a Memory with type='legal_contract'.
   */
  async create(organizationId: string, input: CreateContractInput): Promise<LegalContract> {
    const title = input.title.trim();
    const content: ContractContent = {
      title,
      type: input.type,
      partyName: input.partyName,
      partyType: input.partyType ?? 'company',
      effectiveDate:
        input.effectiveDate instanceof Date
          ? input.effectiveDate.toISOString()
          : new Date(input.effectiveDate).toISOString(),
      endDate: input.endDate
        ? input.endDate instanceof Date
          ? input.endDate.toISOString()
          : new Date(input.endDate).toISOString()
        : null,
      value: input.value ?? null,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'draft',
      jurisdiction: input.jurisdiction ?? '',
      tags: input.tags ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'legal_contract',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['legal_contract', input.type]),
        createdBy: input.createdBy,
      },
    });

    return toContract(row as MemoryRow);
  },

  /**
   * Get a single contract by ID.
   */
  async get(id: string): Promise<LegalContract | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toContract(row as MemoryRow);
  },

  /**
   * List contracts for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListContractOpts = {}): Promise<LegalContract[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'legal_contract',
            organizationId,
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );

    let contracts = rows.map((r) => toContract(r as MemoryRow));

    if (opts.type) {
      contracts = contracts.filter((c) => c.type === opts.type);
    }
    if (opts.status) {
      contracts = contracts.filter((c) => c.status === opts.status);
    }
    if (opts.partyName) {
      const q = opts.partyName.toLowerCase();
      contracts = contracts.filter((c) => c.partyName.toLowerCase().includes(q));
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      contracts = contracts.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.partyName.toLowerCase().includes(q),
      );
    }
    if (opts.dateFrom) {
      const from = new Date(opts.dateFrom);
      contracts = contracts.filter((c) => c.effectiveDate >= from);
    }
    if (opts.dateTo) {
      const to = new Date(opts.dateTo);
      contracts = contracts.filter((c) => c.effectiveDate <= to);
    }

    return contracts;
  },

  /**
   * Update a contract.
   */
  async update(id: string, input: UpdateContractInput): Promise<LegalContract | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseContractContent(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.partyName !== undefined) content.partyName = input.partyName;
    if (input.partyType !== undefined) content.partyType = input.partyType;
    if (input.value !== undefined) content.value = input.value;
    if (input.currency !== undefined) content.currency = input.currency;
    if (input.jurisdiction !== undefined) content.jurisdiction = input.jurisdiction;
    if (input.tags !== undefined) content.tags = input.tags;
    if (input.effectiveDate !== undefined) {
      content.effectiveDate =
        input.effectiveDate instanceof Date
          ? input.effectiveDate.toISOString()
          : new Date(input.effectiveDate).toISOString();
    }
    if (input.endDate !== undefined) {
      content.endDate = input.endDate
        ? input.endDate instanceof Date
          ? input.endDate.toISOString()
          : new Date(input.endDate).toISOString()
        : null;
    }

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['legal_contract', content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toContract(row as MemoryRow);
  },

  /**
   * Delete a contract.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Change the status of a contract.
   */
  async changeStatus(id: string, status: ContractStatus): Promise<LegalContract | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseContractContent(existing.content);
    content.status = status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
          },
        }),
      null,
    );
    if (!row) return null;
    return toContract(row as MemoryRow);
  },

  /**
   * Get contracts expiring within N days (default 30).
   */
  async getExpiring(organizationId: string, days = 30): Promise<LegalContract[]> {
    const contracts = await LegalContractService.list(organizationId, { status: 'active' });
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return contracts.filter(
      (c) => c.endDate !== null && c.endDate <= threshold && c.endDate >= now,
    );
  },

  /**
   * Get expired contracts.
   */
  async getExpired(organizationId: string): Promise<LegalContract[]> {
    const contracts = await LegalContractService.list(organizationId);
    const now = new Date();
    return contracts.filter(
      (c) => c.endDate !== null && c.endDate < now && c.status !== 'terminated',
    );
  },

  /**
   * Get contracts grouped by type.
   */
  async getByType(organizationId: string): Promise<Record<string, LegalContract[]>> {
    const contracts = await LegalContractService.list(organizationId);
    const grouped: Record<string, LegalContract[]> = {};
    for (const c of contracts) {
      if (!grouped[c.type]) grouped[c.type] = [];
      grouped[c.type].push(c);
    }
    return grouped;
  },

  /**
   * Get contracts grouped by status.
   */
  async getByStatus(organizationId: string): Promise<Record<string, LegalContract[]>> {
    const contracts = await LegalContractService.list(organizationId);
    const grouped: Record<string, LegalContract[]> = {};
    for (const c of contracts) {
      if (!grouped[c.status]) grouped[c.status] = [];
      grouped[c.status].push(c);
    }
    return grouped;
  },

  /**
   * Get contract stats for an organization.
   */
  async getStats(organizationId: string): Promise<ContractStats> {
    const contracts = await LegalContractService.list(organizationId);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let activeCount = 0;
    let totalValue = 0;

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let expiringCount = 0;

    for (const c of contracts) {
      byType[c.type] = (byType[c.type] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (c.status === 'active') activeCount += 1;
      if (c.value !== null) totalValue += c.value;
      if (
        c.status === 'active' &&
        c.endDate !== null &&
        c.endDate <= thirtyDays &&
        c.endDate >= now
      ) {
        expiringCount += 1;
      }
    }

    return {
      totalContracts: contracts.length,
      byType,
      byStatus,
      activeCount,
      expiringCount,
      totalValue,
    };
  },
};
