import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ContractStatus = 'active' | 'expired' | 'pending' | 'terminated' | 'renewal';
export type ContractType = 'service' | 'subscription' | 'one_time' | 'master' | 'nda';

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

/** Parsed content payload for a vendor contract Memory. */
interface ContractContent {
  vendorId: string;
  title: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  status: ContractStatus;
  terms: string;
  renewalDate: string;
}

/** A structured vendor contract returned to callers. */
export interface VendorContract {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  title: string;
  contractType: ContractType;
  startDate: Date;
  endDate: Date;
  value: number;
  currency: string;
  status: ContractStatus;
  terms: string;
  renewalDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContractInput {
  vendorId: string;
  title: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  value: number;
  currency?: string;
  status?: ContractStatus;
  terms?: string;
  renewalDate?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateContractInput {
  title?: string;
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  value?: number;
  currency?: string;
  status?: ContractStatus;
  terms?: string;
  renewalDate?: string;
}

export interface ListContractOpts {
  vendorId?: string;
  status?: ContractStatus;
  type?: ContractType;
  dateRange?: { start?: string; end?: string };
}

export interface ContractStats {
  totalContracts: number;
  byStatus: Record<ContractStatus, number>;
  byType: Record<ContractType, number>;
  totalValue: number;
  expiringCount: number;
}

// ── Helpers ──

const fallbackContent: ContractContent = {
  vendorId: '',
  title: '',
  contractType: 'service',
  startDate: '',
  endDate: '',
  value: 0,
  currency: 'USD',
  status: 'active',
  terms: '',
  renewalDate: '',
};

function parseContractContent(raw: string): ContractContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      vendorId: parsed.vendorId ?? '',
      title: parsed.title ?? '',
      contractType: (parsed.contractType as ContractType) ?? 'service',
      startDate: parsed.startDate ?? '',
      endDate: parsed.endDate ?? '',
      value: Number(parsed.value) || 0,
      currency: parsed.currency ?? 'USD',
      status: (parsed.status as ContractStatus) ?? 'active',
      terms: parsed.terms ?? '',
      renewalDate: parsed.renewalDate ?? '',
    };
  } catch {
    return fallbackContent;
  }
}

function toContract(row: MemoryRow): VendorContract {
  const content = parseContractContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    vendorId: content.vendorId,
    title: content.title,
    contractType: content.contractType,
    startDate: content.startDate ? new Date(content.startDate) : new Date(0),
    endDate: content.endDate ? new Date(content.endDate) : new Date(0),
    value: content.value,
    currency: content.currency,
    status: content.status,
    terms: content.terms,
    renewalDate: content.renewalDate ? new Date(content.renewalDate) : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Vendor Contract Service ──

export const VendorContractService = {
  /**
   * Create a vendor contract. Stored as a Memory with type='vendor_contract'.
   */
  async create(organizationId: string, input: CreateContractInput): Promise<VendorContract> {
    const content: ContractContent = {
      vendorId: input.vendorId,
      title: input.title.trim(),
      contractType: input.contractType,
      startDate: input.startDate,
      endDate: input.endDate,
      value: input.value,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'active',
      terms: input.terms ?? '',
      renewalDate: input.renewalDate ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'vendor_contract',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.vendorId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['vendor_contract', content.contractType, content.status]),
        createdBy: input.createdBy,
      },
    });

    return toContract(row as MemoryRow);
  },

  /**
   * Get a single contract by ID.
   */
  async get(id: string): Promise<VendorContract | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toContract(row as MemoryRow);
  },

  /**
   * List contracts for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListContractOpts = {}): Promise<VendorContract[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'vendor_contract',
          organizationId,
          ...(opts.vendorId ? { sourceId: opts.vendorId } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      [],
    );

    let contracts = rows.map((r) => toContract(r as MemoryRow));

    if (opts.status) {
      contracts = contracts.filter((c) => c.status === opts.status);
    }
    if (opts.type) {
      contracts = contracts.filter((c) => c.contractType === opts.type);
    }
    if (opts.dateRange) {
      if (opts.dateRange.start) {
        const start = new Date(opts.dateRange.start);
        contracts = contracts.filter((c) => c.startDate >= start);
      }
      if (opts.dateRange.end) {
        const end = new Date(opts.dateRange.end);
        contracts = contracts.filter((c) => c.endDate <= end);
      }
    }

    return contracts;
  },

  /**
   * Update a contract.
   */
  async update(id: string, input: UpdateContractInput): Promise<VendorContract | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseContractContent(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.contractType !== undefined) content.contractType = input.contractType;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.value !== undefined) content.value = input.value;
    if (input.currency !== undefined) content.currency = input.currency;
    if (input.status !== undefined) content.status = input.status;
    if (input.terms !== undefined) content.terms = input.terms;
    if (input.renewalDate !== undefined) content.renewalDate = input.renewalDate;

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
          tags: JSON.stringify(['vendor_contract', content.contractType, content.status]),
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
   * Get contracts expiring within N days (default 30).
   */
  async getExpiring(organizationId: string, days = 30): Promise<VendorContract[]> {
    const contracts = await VendorContractService.list(organizationId);
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return contracts.filter(
      (c) => c.status === 'active' && c.endDate >= now && c.endDate <= threshold,
    );
  },

  /**
   * Get contracts needing renewal attention (expiring soon or in renewal status).
   */
  async getRenewalAlerts(organizationId: string): Promise<VendorContract[]> {
    const expiring = await VendorContractService.getExpiring(organizationId, 60);
    const renewalStatus = await VendorContractService.list(organizationId, { status: 'renewal' });
    const seen = new Set<string>();
    const result: VendorContract[] = [];
    for (const c of [...expiring, ...renewalStatus]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        result.push(c);
      }
    }
    return result;
  },

  /**
   * Get contract stats for an organization.
   */
  async getStats(organizationId: string): Promise<ContractStats> {
    const contracts = await VendorContractService.list(organizationId);
    const byStatus: Record<ContractStatus, number> = {
      active: 0,
      expired: 0,
      pending: 0,
      terminated: 0,
      renewal: 0,
    };
    const byType: Record<ContractType, number> = {
      service: 0,
      subscription: 0,
      one_time: 0,
      master: 0,
      nda: 0,
    };

    let totalValue = 0;
    for (const c of contracts) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byType[c.contractType] = (byType[c.contractType] || 0) + 1;
      totalValue += c.value;
    }

    const expiring = await VendorContractService.getExpiring(organizationId, 30);

    return {
      totalContracts: contracts.length,
      byStatus,
      byType,
      totalValue,
      expiringCount: expiring.length,
    };
  },
};
