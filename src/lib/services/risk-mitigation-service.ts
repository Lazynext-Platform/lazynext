import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type MitigationType =
  | 'preventive'
  | 'corrective'
  | 'detective'
  | 'compensating';

export type MitigationStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

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

/** Parsed content payload for a mitigation Memory. */
interface MitigationContent {
  riskId: string;
  action: string;
  type: MitigationType;
  owner: string | null;
  dueDate: string | null;
  status: MitigationStatus;
  cost: number | null;
  effectiveness: number | null;
}

/** A structured mitigation returned to callers. */
export interface RiskMitigation {
  id: string;
  organizationId: string;
  workspaceId: string;
  riskId: string;
  action: string;
  type: MitigationType;
  owner: string | null;
  dueDate: Date | null;
  status: MitigationStatus;
  cost: number | null;
  effectiveness: number | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMitigationInput {
  riskId: string;
  action: string;
  type: MitigationType;
  owner?: string;
  dueDate?: Date | string;
  status?: MitigationStatus;
  cost?: number;
  effectiveness?: number;
  workspaceId?: string;
  createdBy: string;
}

export interface ListMitigationOpts {
  riskId?: string;
  status?: MitigationStatus;
  type?: MitigationType;
  owner?: string;
}

export interface UpdateMitigationInput {
  action?: string;
  type?: MitigationType;
  owner?: string;
  dueDate?: Date | string | null;
  cost?: number;
  effectiveness?: number;
}

export interface MitigationStats {
  totalMitigations: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  overdueCount: number;
  avgEffectiveness: number;
}

// ── Helpers ──

const fallbackContent: MitigationContent = {
  riskId: '',
  action: '',
  type: 'preventive',
  owner: null,
  dueDate: null,
  status: 'planned',
  cost: null,
  effectiveness: null,
};

function parseMitigationContent(raw: string): MitigationContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      riskId: parsed.riskId ?? '',
      action: parsed.action ?? '',
      type: (parsed.type as MitigationType) ?? 'preventive',
      owner: parsed.owner ?? null,
      dueDate: parsed.dueDate ?? null,
      status: (parsed.status as MitigationStatus) ?? 'planned',
      cost: parsed.cost !== undefined && parsed.cost !== null ? Number(parsed.cost) : null,
      effectiveness:
        parsed.effectiveness !== undefined && parsed.effectiveness !== null
          ? Number(parsed.effectiveness)
          : null,
    };
  } catch {
    return fallbackContent;
  }
}

function toMitigation(row: MemoryRow): RiskMitigation {
  const content = parseMitigationContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    riskId: content.riskId,
    action: content.action,
    type: content.type,
    owner: content.owner,
    dueDate: content.dueDate ? new Date(content.dueDate) : null,
    status: content.status,
    cost: content.cost,
    effectiveness: content.effectiveness,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Risk Mitigation Service ──

export const RiskMitigationService = {
  /**
   * Create a mitigation action. Stored as a Memory with type='risk_mitigation'.
   */
  async create(organizationId: string, input: CreateMitigationInput): Promise<RiskMitigation> {
    const action = input.action.trim();
    const content: MitigationContent = {
      riskId: input.riskId,
      action,
      type: input.type,
      owner: input.owner ?? null,
      dueDate: input.dueDate
        ? input.dueDate instanceof Date
          ? input.dueDate.toISOString()
          : new Date(input.dueDate).toISOString()
        : null,
      status: input.status ?? 'planned',
      cost: input.cost ?? null,
      effectiveness: input.effectiveness ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'risk_mitigation',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.riskId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['risk_mitigation', input.type]),
        createdBy: input.createdBy,
      },
    });

    return toMitigation(row as MemoryRow);
  },

  /**
   * Get a single mitigation by ID.
   */
  async get(id: string): Promise<RiskMitigation | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toMitigation(row as MemoryRow);
  },

  /**
   * List mitigations for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListMitigationOpts = {}): Promise<RiskMitigation[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'risk_mitigation',
            organizationId,
            ...(opts.riskId ? { sourceId: opts.riskId } : {}),
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );

    let mitigations = rows.map((r) => toMitigation(r as MemoryRow));

    if (opts.status) {
      mitigations = mitigations.filter((m) => m.status === opts.status);
    }
    if (opts.type) {
      mitigations = mitigations.filter((m) => m.type === opts.type);
    }
    if (opts.owner) {
      mitigations = mitigations.filter((m) => m.owner === opts.owner);
    }

    return mitigations;
  },

  /**
   * Update a mitigation.
   */
  async update(id: string, input: UpdateMitigationInput): Promise<RiskMitigation | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseMitigationContent(existing.content);
    if (input.action !== undefined) content.action = input.action.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.cost !== undefined) content.cost = input.cost;
    if (input.effectiveness !== undefined) content.effectiveness = input.effectiveness;
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
            tags: JSON.stringify(['risk_mitigation', content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toMitigation(row as MemoryRow);
  },

  /**
   * Delete a mitigation.
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
   * Change the status of a mitigation.
   */
  async changeStatus(id: string, status: MitigationStatus): Promise<RiskMitigation | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseMitigationContent(existing.content);
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
    return toMitigation(row as MemoryRow);
  },

  /**
   * Get all mitigations for a risk.
   */
  async getByRisk(riskId: string): Promise<RiskMitigation[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'risk_mitigation',
            sourceId: riskId,
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );
    return rows.map((r) => toMitigation(r as MemoryRow));
  },

  /**
   * Get mitigations that are past their due date and not completed.
   */
  async getOverdue(organizationId: string): Promise<RiskMitigation[]> {
    const mitigations = await RiskMitigationService.list(organizationId);
    const now = new Date();
    return mitigations.filter(
      (m) =>
        m.dueDate !== null &&
        m.dueDate < now &&
        m.status !== 'completed' &&
        m.status !== 'cancelled',
    );
  },

  /**
   * Get mitigation stats for an organization.
   */
  async getStats(organizationId: string): Promise<MitigationStats> {
    const mitigations = await RiskMitigationService.list(organizationId);
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let overdueCount = 0;
    let effectivenessSum = 0;
    let effectivenessCount = 0;
    const now = new Date();

    for (const m of mitigations) {
      byStatus[m.status] = (byStatus[m.status] || 0) + 1;
      byType[m.type] = (byType[m.type] || 0) + 1;
      if (
        m.dueDate !== null &&
        m.dueDate < now &&
        m.status !== 'completed' &&
        m.status !== 'cancelled'
      ) {
        overdueCount += 1;
      }
      if (m.effectiveness !== null) {
        effectivenessSum += m.effectiveness;
        effectivenessCount += 1;
      }
    }

    return {
      totalMitigations: mitigations.length,
      byStatus,
      byType,
      overdueCount,
      avgEffectiveness: effectivenessCount > 0 ? effectivenessSum / effectivenessCount : 0,
    };
  },
};
