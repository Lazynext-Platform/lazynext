import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ComplianceType = 'insurance' | 'certification' | 'security' | 'regulatory' | 'contractual';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending' | 'expired';

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

/** Parsed content payload for a vendor compliance Memory. */
interface ComplianceContent {
  vendorId: string;
  type: ComplianceType;
  name: string;
  status: ComplianceStatus;
  expiryDate: string;
  documentUrl: string;
  notes: string;
}

/** A structured vendor compliance record returned to callers. */
export interface VendorCompliance {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  type: ComplianceType;
  name: string;
  status: ComplianceStatus;
  expiryDate: Date | null;
  documentUrl: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComplianceInput {
  vendorId: string;
  type: ComplianceType;
  name: string;
  status: ComplianceStatus;
  expiryDate?: string;
  documentUrl?: string;
  notes?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateComplianceInput {
  type?: ComplianceType;
  name?: string;
  status?: ComplianceStatus;
  expiryDate?: string;
  documentUrl?: string;
  notes?: string;
}

export interface ListComplianceOpts {
  vendorId?: string;
  type?: ComplianceType;
  status?: ComplianceStatus;
}

export interface ComplianceStats {
  totalRecords: number;
  byType: Record<ComplianceType, number>;
  byStatus: Record<ComplianceStatus, number>;
  nonCompliantCount: number;
}

// ── Helpers ──

const fallbackContent: ComplianceContent = {
  vendorId: '',
  type: 'insurance',
  name: '',
  status: 'pending',
  expiryDate: '',
  documentUrl: '',
  notes: '',
};

function parseComplianceContent(raw: string): ComplianceContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      vendorId: parsed.vendorId ?? '',
      type: (parsed.type as ComplianceType) ?? 'insurance',
      name: parsed.name ?? '',
      status: (parsed.status as ComplianceStatus) ?? 'pending',
      expiryDate: parsed.expiryDate ?? '',
      documentUrl: parsed.documentUrl ?? '',
      notes: parsed.notes ?? '',
    };
  } catch {
    return fallbackContent;
  }
}

function toCompliance(row: MemoryRow): VendorCompliance {
  const content = parseComplianceContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    vendorId: content.vendorId,
    type: content.type,
    name: content.name,
    status: content.status,
    expiryDate: content.expiryDate ? new Date(content.expiryDate) : null,
    documentUrl: content.documentUrl,
    notes: content.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Vendor Compliance Service ──

export const VendorComplianceService = {
  /**
   * Create a compliance record. Stored as a Memory with type='vendor_compliance'.
   */
  async create(organizationId: string, input: CreateComplianceInput): Promise<VendorCompliance> {
    const content: ComplianceContent = {
      vendorId: input.vendorId,
      type: input.type,
      name: input.name.trim(),
      status: input.status,
      expiryDate: input.expiryDate ?? '',
      documentUrl: input.documentUrl ?? '',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'vendor_compliance',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.vendorId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['vendor_compliance', content.type, content.status]),
        createdBy: input.createdBy,
      },
    });

    return toCompliance(row as MemoryRow);
  },

  /**
   * Get a single compliance record by ID.
   */
  async get(id: string): Promise<VendorCompliance | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toCompliance(row as MemoryRow);
  },

  /**
   * List compliance records for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListComplianceOpts = {}): Promise<VendorCompliance[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'vendor_compliance',
          organizationId,
          ...(opts.vendorId ? { sourceId: opts.vendorId } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      [],
    );

    let records = rows.map((r) => toCompliance(r as MemoryRow));

    if (opts.type) {
      records = records.filter((c) => c.type === opts.type);
    }
    if (opts.status) {
      records = records.filter((c) => c.status === opts.status);
    }

    return records;
  },

  /**
   * Update a compliance record.
   */
  async update(id: string, input: UpdateComplianceInput): Promise<VendorCompliance | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseComplianceContent(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.status !== undefined) content.status = input.status;
    if (input.expiryDate !== undefined) content.expiryDate = input.expiryDate;
    if (input.documentUrl !== undefined) content.documentUrl = input.documentUrl;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
          tags: JSON.stringify(['vendor_compliance', content.type, content.status]),
        },
      }),
      null,
    );
    if (!row) return null;
    return toCompliance(row as MemoryRow);
  },

  /**
   * Delete a compliance record.
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
   * Get all compliance records for a vendor.
   */
  async getByVendor(vendorId: string): Promise<VendorCompliance[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'vendor_compliance',
          sourceId: vendorId,
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      [],
    );
    return rows.map((r) => toCompliance(r as MemoryRow));
  },

  /**
   * Get vendors with non-compliant or expired records.
   */
  async getNonCompliant(organizationId: string): Promise<VendorCompliance[]> {
    const records = await VendorComplianceService.list(organizationId);
    const now = new Date();
    return records.filter(
      (r) => r.status === 'non_compliant' || r.status === 'expired' ||
        (r.expiryDate && r.expiryDate < now && r.status !== 'compliant'),
    );
  },

  /**
   * Get compliance records expiring within N days (default 30).
   */
  async getExpiring(organizationId: string, days = 30): Promise<VendorCompliance[]> {
    const records = await VendorComplianceService.list(organizationId);
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return records.filter(
      (r) => r.expiryDate && r.expiryDate >= now && r.expiryDate <= threshold,
    );
  },

  /**
   * Get compliance stats for an organization.
   */
  async getStats(organizationId: string): Promise<ComplianceStats> {
    const records = await VendorComplianceService.list(organizationId);
    const byType: Record<ComplianceType, number> = {
      insurance: 0,
      certification: 0,
      security: 0,
      regulatory: 0,
      contractual: 0,
    };
    const byStatus: Record<ComplianceStatus, number> = {
      compliant: 0,
      non_compliant: 0,
      pending: 0,
      expired: 0,
    };

    let nonCompliantCount = 0;
    const now = new Date();
    for (const r of records) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === 'non_compliant' || r.status === 'expired' ||
        (r.expiryDate && r.expiryDate < now && r.status !== 'compliant')) {
        nonCompliantCount += 1;
      }
    }

    return {
      totalRecords: records.length,
      byType,
      byStatus,
      nonCompliantCount,
    };
  },
};
