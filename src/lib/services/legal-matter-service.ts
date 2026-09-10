import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type MatterType =
  | 'litigation'
  | 'transaction'
  | 'compliance'
  | 'ip'
  | 'employment'
  | 'regulatory'
  | 'other';

export type MatterStatus = 'open' | 'in_progress' | 'closed' | 'on_hold';
export type MatterPriority = 'low' | 'medium' | 'high' | 'urgent';

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

/** Parsed content payload for a matter Memory. */
interface MatterContent {
  title: string;
  description: string;
  type: MatterType;
  status: MatterStatus;
  priority: MatterPriority;
  assignedTo: string | null;
  opposingParty: string;
  caseNumber: string;
  court: string;
  filedDate: string | null;
  closedDate: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  tags: string[];
}

/** A structured matter returned to callers. */
export interface LegalMatter {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  type: MatterType;
  status: MatterStatus;
  priority: MatterPriority;
  assignedTo: string | null;
  opposingParty: string;
  caseNumber: string;
  court: string;
  filedDate: Date | null;
  closedDate: Date | null;
  estimatedCost: number | null;
  actualCost: number | null;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMatterInput {
  title: string;
  description?: string;
  type: MatterType;
  status?: MatterStatus;
  priority: MatterPriority;
  assignedTo?: string;
  opposingParty?: string;
  caseNumber?: string;
  court?: string;
  filedDate?: Date | string;
  closedDate?: Date | string;
  estimatedCost?: number;
  actualCost?: number;
  tags?: string[];
  workspaceId?: string;
  createdBy: string;
}

export interface ListMatterOpts {
  type?: MatterType;
  status?: MatterStatus;
  priority?: MatterPriority;
  assignedTo?: string;
  search?: string;
}

export interface UpdateMatterInput {
  title?: string;
  description?: string;
  type?: MatterType;
  priority?: MatterPriority;
  assignedTo?: string;
  opposingParty?: string;
  caseNumber?: string;
  court?: string;
  filedDate?: Date | string | null;
  closedDate?: Date | string | null;
  estimatedCost?: number;
  actualCost?: number;
  tags?: string[];
}

export interface MatterStats {
  totalMatters: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  openCount: number;
  totalEstimatedCost: number;
  totalActualCost: number;
}

// ── Helpers ──

const fallbackContent: MatterContent = {
  title: '',
  description: '',
  type: 'other',
  status: 'open',
  priority: 'medium',
  assignedTo: null,
  opposingParty: '',
  caseNumber: '',
  court: '',
  filedDate: null,
  closedDate: null,
  estimatedCost: null,
  actualCost: null,
  tags: [],
};

function parseMatterContent(raw: string): MatterContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      type: (parsed.type as MatterType) ?? 'other',
      status: (parsed.status as MatterStatus) ?? 'open',
      priority: (parsed.priority as MatterPriority) ?? 'medium',
      assignedTo: parsed.assignedTo ?? null,
      opposingParty: parsed.opposingParty ?? '',
      caseNumber: parsed.caseNumber ?? '',
      court: parsed.court ?? '',
      filedDate: parsed.filedDate ?? null,
      closedDate: parsed.closedDate ?? null,
      estimatedCost:
        parsed.estimatedCost !== undefined && parsed.estimatedCost !== null
          ? Number(parsed.estimatedCost)
          : null,
      actualCost:
        parsed.actualCost !== undefined && parsed.actualCost !== null
          ? Number(parsed.actualCost)
          : null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return fallbackContent;
  }
}

function toMatter(row: MemoryRow): LegalMatter {
  const content = parseMatterContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    title: content.title,
    description: content.description,
    type: content.type,
    status: content.status,
    priority: content.priority,
    assignedTo: content.assignedTo,
    opposingParty: content.opposingParty,
    caseNumber: content.caseNumber,
    court: content.court,
    filedDate: content.filedDate ? new Date(content.filedDate) : null,
    closedDate: content.closedDate ? new Date(content.closedDate) : null,
    estimatedCost: content.estimatedCost,
    actualCost: content.actualCost,
    tags: content.tags,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Legal Matter Service ──

export const LegalMatterService = {
  /**
   * Create a legal matter. Stored as a Memory with type='legal_matter'.
   */
  async create(organizationId: string, input: CreateMatterInput): Promise<LegalMatter> {
    const title = input.title.trim();
    const content: MatterContent = {
      title,
      description: input.description ?? '',
      type: input.type,
      status: input.status ?? 'open',
      priority: input.priority,
      assignedTo: input.assignedTo ?? null,
      opposingParty: input.opposingParty ?? '',
      caseNumber: input.caseNumber ?? '',
      court: input.court ?? '',
      filedDate: input.filedDate
        ? input.filedDate instanceof Date
          ? input.filedDate.toISOString()
          : new Date(input.filedDate).toISOString()
        : null,
      closedDate: input.closedDate
        ? input.closedDate instanceof Date
          ? input.closedDate.toISOString()
          : new Date(input.closedDate).toISOString()
        : null,
      estimatedCost: input.estimatedCost ?? null,
      actualCost: input.actualCost ?? null,
      tags: input.tags ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'legal_matter',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['legal_matter', input.type, input.priority]),
        createdBy: input.createdBy,
      },
    });

    return toMatter(row as MemoryRow);
  },

  /**
   * Get a single matter by ID.
   */
  async get(id: string): Promise<LegalMatter | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toMatter(row as MemoryRow);
  },

  /**
   * List matters for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListMatterOpts = {}): Promise<LegalMatter[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'legal_matter',
            organizationId,
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );

    let matters = rows.map((r) => toMatter(r as MemoryRow));

    if (opts.type) {
      matters = matters.filter((m) => m.type === opts.type);
    }
    if (opts.status) {
      matters = matters.filter((m) => m.status === opts.status);
    }
    if (opts.priority) {
      matters = matters.filter((m) => m.priority === opts.priority);
    }
    if (opts.assignedTo) {
      matters = matters.filter((m) => m.assignedTo === opts.assignedTo);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      matters = matters.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.caseNumber.toLowerCase().includes(q) ||
          m.opposingParty.toLowerCase().includes(q),
      );
    }

    return matters;
  },

  /**
   * Update a matter.
   */
  async update(id: string, input: UpdateMatterInput): Promise<LegalMatter | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseMatterContent(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.priority !== undefined) content.priority = input.priority;
    if (input.assignedTo !== undefined) content.assignedTo = input.assignedTo;
    if (input.opposingParty !== undefined) content.opposingParty = input.opposingParty;
    if (input.caseNumber !== undefined) content.caseNumber = input.caseNumber;
    if (input.court !== undefined) content.court = input.court;
    if (input.estimatedCost !== undefined) content.estimatedCost = input.estimatedCost;
    if (input.actualCost !== undefined) content.actualCost = input.actualCost;
    if (input.tags !== undefined) content.tags = input.tags;
    if (input.filedDate !== undefined) {
      content.filedDate = input.filedDate
        ? input.filedDate instanceof Date
          ? input.filedDate.toISOString()
          : new Date(input.filedDate).toISOString()
        : null;
    }
    if (input.closedDate !== undefined) {
      content.closedDate = input.closedDate
        ? input.closedDate instanceof Date
          ? input.closedDate.toISOString()
          : new Date(input.closedDate).toISOString()
        : null;
    }

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['legal_matter', content.type, content.priority]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toMatter(row as MemoryRow);
  },

  /**
   * Delete a matter.
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
   * Change the status of a matter.
   */
  async changeStatus(id: string, status: MatterStatus): Promise<LegalMatter | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseMatterContent(existing.content);
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
    return toMatter(row as MemoryRow);
  },

  /**
   * Assign a matter to someone.
   */
  async assign(id: string, assignedTo: string): Promise<LegalMatter | null> {
    return LegalMatterService.update(id, { assignedTo });
  },

  /**
   * Get open matters (status open or in_progress).
   */
  async getOpen(organizationId: string): Promise<LegalMatter[]> {
    const matters = await LegalMatterService.list(organizationId);
    return matters.filter((m) => m.status === 'open' || m.status === 'in_progress');
  },

  /**
   * Get matters grouped by type.
   */
  async getByType(organizationId: string): Promise<Record<string, LegalMatter[]>> {
    const matters = await LegalMatterService.list(organizationId);
    const grouped: Record<string, LegalMatter[]> = {};
    for (const m of matters) {
      if (!grouped[m.type]) grouped[m.type] = [];
      grouped[m.type].push(m);
    }
    return grouped;
  },

  /**
   * Get matters grouped by status.
   */
  async getByStatus(organizationId: string): Promise<Record<string, LegalMatter[]>> {
    const matters = await LegalMatterService.list(organizationId);
    const grouped: Record<string, LegalMatter[]> = {};
    for (const m of matters) {
      if (!grouped[m.status]) grouped[m.status] = [];
      grouped[m.status].push(m);
    }
    return grouped;
  },

  /**
   * Get matter stats for an organization.
   */
  async getStats(organizationId: string): Promise<MatterStats> {
    const matters = await LegalMatterService.list(organizationId);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let openCount = 0;
    let totalEstimatedCost = 0;
    let totalActualCost = 0;

    for (const m of matters) {
      byType[m.type] = (byType[m.type] || 0) + 1;
      byStatus[m.status] = (byStatus[m.status] || 0) + 1;
      byPriority[m.priority] = (byPriority[m.priority] || 0) + 1;
      if (m.status === 'open' || m.status === 'in_progress') openCount += 1;
      if (m.estimatedCost !== null) totalEstimatedCost += m.estimatedCost;
      if (m.actualCost !== null) totalActualCost += m.actualCost;
    }

    return {
      totalMatters: matters.length,
      byType,
      byStatus,
      byPriority,
      openCount,
      totalEstimatedCost,
      totalActualCost,
    };
  },
};
