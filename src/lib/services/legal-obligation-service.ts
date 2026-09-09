import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ObligationType =
  | 'payment'
  | 'delivery'
  | 'reporting'
  | 'compliance'
  | 'confidentiality'
  | 'non_compete'
  | 'other';

export type ObligationStatus = 'pending' | 'fulfilled' | 'breached' | 'waived';

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

/** Parsed content payload for an obligation Memory. */
interface ObligationContent {
  contractId: string | null;
  matterId: string | null;
  title: string;
  description: string;
  type: ObligationType;
  dueDate: string | null;
  status: ObligationStatus;
  responsibleParty: string;
  notes: string;
}

/** A structured obligation returned to callers. */
export interface LegalObligation {
  id: string;
  organizationId: string;
  workspaceId: string;
  contractId: string | null;
  matterId: string | null;
  title: string;
  description: string;
  type: ObligationType;
  dueDate: Date | null;
  status: ObligationStatus;
  responsibleParty: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateObligationInput {
  contractId?: string;
  matterId?: string;
  title: string;
  description?: string;
  type: ObligationType;
  dueDate?: Date | string;
  status?: ObligationStatus;
  responsibleParty?: string;
  notes?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface ListObligationOpts {
  contractId?: string;
  matterId?: string;
  type?: ObligationType;
  status?: ObligationStatus;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

export interface UpdateObligationInput {
  title?: string;
  description?: string;
  type?: ObligationType;
  dueDate?: Date | string | null;
  responsibleParty?: string;
  notes?: string;
}

export interface ObligationStats {
  totalObligations: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  overdueCount: number;
  upcomingCount: number;
}

// ── Helpers ──

const fallbackContent: ObligationContent = {
  contractId: null,
  matterId: null,
  title: '',
  description: '',
  type: 'other',
  dueDate: null,
  status: 'pending',
  responsibleParty: '',
  notes: '',
};

function parseObligationContent(raw: string): ObligationContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      contractId: parsed.contractId ?? null,
      matterId: parsed.matterId ?? null,
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      type: (parsed.type as ObligationType) ?? 'other',
      dueDate: parsed.dueDate ?? null,
      status: (parsed.status as ObligationStatus) ?? 'pending',
      responsibleParty: parsed.responsibleParty ?? '',
      notes: parsed.notes ?? '',
    };
  } catch {
    return fallbackContent;
  }
}

function toObligation(row: MemoryRow): LegalObligation {
  const content = parseObligationContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    contractId: content.contractId,
    matterId: content.matterId,
    title: content.title,
    description: content.description,
    type: content.type,
    dueDate: content.dueDate ? new Date(content.dueDate) : null,
    status: content.status,
    responsibleParty: content.responsibleParty,
    notes: content.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Legal Obligation Service ──

export const LegalObligationService = {
  /**
   * Create a legal obligation. Stored as a Memory with type='legal_obligation'.
   */
  async create(organizationId: string, input: CreateObligationInput): Promise<LegalObligation> {
    const title = input.title.trim();
    const content: ObligationContent = {
      contractId: input.contractId ?? null,
      matterId: input.matterId ?? null,
      title,
      description: input.description ?? '',
      type: input.type,
      dueDate: input.dueDate
        ? input.dueDate instanceof Date
          ? input.dueDate.toISOString()
          : new Date(input.dueDate).toISOString()
        : null,
      status: input.status ?? 'pending',
      responsibleParty: input.responsibleParty ?? '',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'legal_obligation',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.contractId ?? input.matterId ?? null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['legal_obligation', input.type]),
        createdBy: input.createdBy,
      },
    });

    return toObligation(row as MemoryRow);
  },

  /**
   * Get a single obligation by ID.
   */
  async get(id: string): Promise<LegalObligation | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toObligation(row as MemoryRow);
  },

  /**
   * List obligations for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListObligationOpts = {}): Promise<LegalObligation[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'legal_obligation',
            organizationId,
            ...(opts.contractId ? { sourceId: opts.contractId } : {}),
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );

    let obligations = rows.map((r) => toObligation(r as MemoryRow));

    if (opts.matterId) {
      obligations = obligations.filter((o) => o.matterId === opts.matterId);
    }
    if (opts.type) {
      obligations = obligations.filter((o) => o.type === opts.type);
    }
    if (opts.status) {
      obligations = obligations.filter((o) => o.status === opts.status);
    }
    if (opts.dateFrom) {
      const from = new Date(opts.dateFrom);
      obligations = obligations.filter((o) => o.dueDate !== null && o.dueDate >= from);
    }
    if (opts.dateTo) {
      const to = new Date(opts.dateTo);
      obligations = obligations.filter((o) => o.dueDate !== null && o.dueDate <= to);
    }

    return obligations;
  },

  /**
   * Update an obligation.
   */
  async update(id: string, input: UpdateObligationInput): Promise<LegalObligation | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseObligationContent(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.responsibleParty !== undefined) content.responsibleParty = input.responsibleParty;
    if (input.notes !== undefined) content.notes = input.notes;
    if (input.dueDate !== undefined) {
      content.dueDate = input.dueDate
        ? input.dueDate instanceof Date
          ? input.dueDate.toISOString()
          : new Date(input.dueDate).toISOString()
        : null;
    }

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['legal_obligation', content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toObligation(row as MemoryRow);
  },

  /**
   * Delete an obligation.
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
   * Change the status of an obligation.
   */
  async changeStatus(id: string, status: ObligationStatus): Promise<LegalObligation | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseObligationContent(existing.content);
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
    return toObligation(row as MemoryRow);
  },

  /**
   * Get obligations for a contract.
   */
  async getByContract(contractId: string): Promise<LegalObligation[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'legal_obligation',
            sourceId: contractId,
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );
    return rows.map((r) => toObligation(r as MemoryRow));
  },

  /**
   * Get obligations for a matter.
   */
  async getByMatter(matterId: string): Promise<LegalObligation[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'legal_obligation',
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );
    return rows
      .map((r) => toObligation(r as MemoryRow))
      .filter((o) => o.matterId === matterId);
  },

  /**
   * Get obligations due within N days (default 30).
   */
  async getUpcoming(organizationId: string, days = 30): Promise<LegalObligation[]> {
    const obligations = await LegalObligationService.list(organizationId, { status: 'pending' });
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return obligations.filter(
      (o) => o.dueDate !== null && o.dueDate >= now && o.dueDate <= threshold,
    );
  },

  /**
   * Get overdue obligations (past due date and not fulfilled).
   */
  async getOverdue(organizationId: string): Promise<LegalObligation[]> {
    const obligations = await LegalObligationService.list(organizationId);
    const now = new Date();
    return obligations.filter(
      (o) =>
        o.dueDate !== null &&
        o.dueDate < now &&
        o.status !== 'fulfilled' &&
        o.status !== 'waived',
    );
  },

  /**
   * Get breached obligations.
   */
  async getBreached(organizationId: string): Promise<LegalObligation[]> {
    const obligations = await LegalObligationService.list(organizationId);
    return obligations.filter((o) => o.status === 'breached');
  },

  /**
   * Get obligation stats for an organization.
   */
  async getStats(organizationId: string): Promise<ObligationStats> {
    const obligations = await LegalObligationService.list(organizationId);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let overdueCount = 0;
    let upcomingCount = 0;
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const o of obligations) {
      byType[o.type] = (byType[o.type] || 0) + 1;
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (
        o.dueDate !== null &&
        o.dueDate < now &&
        o.status !== 'fulfilled' &&
        o.status !== 'waived'
      ) {
        overdueCount += 1;
      }
      if (
        o.status === 'pending' &&
        o.dueDate !== null &&
        o.dueDate >= now &&
        o.dueDate <= thirtyDays
      ) {
        upcomingCount += 1;
      }
    }

    return {
      totalObligations: obligations.length,
      byType,
      byStatus,
      overdueCount,
      upcomingCount,
    };
  },
};
