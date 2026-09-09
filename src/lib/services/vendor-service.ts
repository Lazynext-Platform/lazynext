import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type VendorStatus = 'active' | 'inactive' | 'preferred' | 'blocked';

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

/** Parsed content payload for a vendor Memory. */
interface VendorContent {
  name: string;
  category: string;
  status: VendorStatus;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  taxId: string;
  paymentTerms: string;
  notes: string;
  tags: string[];
}

/** A structured vendor returned to callers. */
export interface Vendor {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: string;
  status: VendorStatus;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  taxId: string;
  paymentTerms: string;
  notes: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVendorInput {
  name: string;
  category?: string;
  status?: VendorStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  tags?: string[];
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateVendorInput {
  name?: string;
  category?: string;
  status?: VendorStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  tags?: string[];
}

export interface ListVendorOpts {
  category?: string;
  status?: VendorStatus;
  search?: string;
  tags?: string[];
}

export interface VendorStats {
  totalVendors: number;
  byCategory: Record<string, number>;
  byStatus: Record<VendorStatus, number>;
  activeContracts: number;
  totalSpend: number;
}

// ── Helpers ──

const fallbackContent: VendorContent = {
  name: '',
  category: 'general',
  status: 'active',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  taxId: '',
  paymentTerms: '',
  notes: '',
  tags: [],
};

function parseVendorContent(raw: string): VendorContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      category: parsed.category ?? 'general',
      status: (parsed.status as VendorStatus) ?? 'active',
      contactName: parsed.contactName ?? '',
      email: parsed.email ?? '',
      phone: parsed.phone ?? '',
      website: parsed.website ?? '',
      address: parsed.address ?? '',
      taxId: parsed.taxId ?? '',
      paymentTerms: parsed.paymentTerms ?? '',
      notes: parsed.notes ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return fallbackContent;
  }
}

function toVendor(row: MemoryRow): Vendor {
  const content = parseVendorContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    category: content.category,
    status: content.status,
    contactName: content.contactName,
    email: content.email,
    phone: content.phone,
    website: content.website,
    address: content.address,
    taxId: content.taxId,
    paymentTerms: content.paymentTerms,
    notes: content.notes,
    tags: content.tags,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Vendor Service ──

export const VendorService = {
  /**
   * Create a vendor. Stored as a Memory with type='vendor'.
   */
  async create(organizationId: string, input: CreateVendorInput): Promise<Vendor> {
    const name = input.name.trim();
    const tags = input.tags ?? [];
    const content: VendorContent = {
      name,
      category: input.category ?? 'general',
      status: input.status ?? 'active',
      contactName: input.contactName ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      website: input.website ?? '',
      address: input.address ?? '',
      taxId: input.taxId ?? '',
      paymentTerms: input.paymentTerms ?? '',
      notes: input.notes ?? '',
      tags,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'vendor',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['vendor', content.category, content.status]),
        createdBy: input.createdBy,
      },
    });

    return toVendor(row as MemoryRow);
  },

  /**
   * Get a single vendor by ID.
   */
  async get(id: string): Promise<Vendor | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toVendor(row as MemoryRow);
  },

  /**
   * List vendors for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListVendorOpts = {}): Promise<Vendor[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'vendor',
          organizationId,
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      [],
    );

    let vendors = rows.map((r) => toVendor(r as MemoryRow));

    if (opts.category) {
      vendors = vendors.filter((v) => v.category === opts.category);
    }
    if (opts.status) {
      vendors = vendors.filter((v) => v.status === opts.status);
    }
    if (opts.tags && opts.tags.length > 0) {
      vendors = vendors.filter((v) => opts.tags!.some((t) => v.tags.includes(t)));
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      vendors = vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.contactName.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.notes.toLowerCase().includes(q),
      );
    }

    return vendors;
  },

  /**
   * Update a vendor.
   */
  async update(id: string, input: UpdateVendorInput): Promise<Vendor | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseVendorContent(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.category !== undefined) content.category = input.category;
    if (input.status !== undefined) content.status = input.status;
    if (input.contactName !== undefined) content.contactName = input.contactName;
    if (input.email !== undefined) content.email = input.email;
    if (input.phone !== undefined) content.phone = input.phone;
    if (input.website !== undefined) content.website = input.website;
    if (input.address !== undefined) content.address = input.address;
    if (input.taxId !== undefined) content.taxId = input.taxId;
    if (input.paymentTerms !== undefined) content.paymentTerms = input.paymentTerms;
    if (input.notes !== undefined) content.notes = input.notes;
    if (input.tags !== undefined) content.tags = input.tags;

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
          tags: JSON.stringify(['vendor', content.category, content.status]),
        },
      }),
      null,
    );
    if (!row) return null;
    return toVendor(row as MemoryRow);
  },

  /**
   * Delete a vendor.
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
   * Get vendors grouped by category.
   */
  async getByCategory(organizationId: string): Promise<Record<string, Vendor[]>> {
    const vendors = await VendorService.list(organizationId);
    const grouped: Record<string, Vendor[]> = {};
    for (const v of vendors) {
      if (!grouped[v.category]) grouped[v.category] = [];
      grouped[v.category].push(v);
    }
    return grouped;
  },

  /**
   * Get vendor stats for an organization.
   */
  async getStats(organizationId: string): Promise<VendorStats> {
    const [vendors, contracts, spends] = await Promise.all([
      VendorService.list(organizationId),
      safePrisma(() =>
        prisma.memory.findMany({
          where: { type: 'vendor_contract', organizationId },
          take: 1000,
        }),
        [],
      ),
      safePrisma(() =>
        prisma.memory.findMany({
          where: { type: 'vendor_spend', organizationId },
          take: 1000,
        }),
        [],
      ),
    ]);

    const byCategory: Record<string, number> = {};
    const byStatus: Record<VendorStatus, number> = {
      active: 0,
      inactive: 0,
      preferred: 0,
      blocked: 0,
    };

    for (const v of vendors) {
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
    }

    let activeContracts = 0;
    for (const r of contracts) {
      try {
        const c = JSON.parse((r as MemoryRow).content);
        if (c.status === 'active') activeContracts += 1;
      } catch {
        // ignore
      }
    }

    let totalSpend = 0;
    for (const r of spends) {
      try {
        const s = JSON.parse((r as MemoryRow).content);
        totalSpend += Number(s.amount) || 0;
      } catch {
        // ignore
      }
    }

    return {
      totalVendors: vendors.length,
      byCategory,
      byStatus,
      activeContracts,
      totalSpend,
    };
  },
};
