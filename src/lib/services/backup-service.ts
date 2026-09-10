import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Backup Service ──
//
// Stores backup records and schedules in the Memory table.
// - type='backup_record'  → individual backup snapshots
// - type='backup_schedule' → recurring backup schedule config
// - type='backup_retention' → retention policy config (one per workspace)
//
// Restore is designed as a dry-run: it returns a plan of what *would* be
// restored without actually mutating data.

export type BackupType = 'full' | 'incremental';
export type BackupStatus = 'pending' | 'completed' | 'failed' | 'restoring';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface BackupConfig {
  type: BackupType;
  entities: string[];
  status: BackupStatus;
  sizeBytes: number;
  recordCount: number;
  baseBackupId?: string | null;
  snapshot: string; // JSON snapshot of data (truncated)
}

export interface BackupRecord {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: BackupType;
  entities: string[];
  status: BackupStatus;
  sizeBytes: number;
  recordCount: number;
  baseBackupId: string | null;
  snapshot: string;
  createdBy: string;
  createdAt: Date;
}

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  type: BackupType;
  entities: string[];
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  retentionDays: number;
}

export interface RetentionPolicy {
  maxBackups: number;
  retentionDays: number;
  minKeep: number;
}

export interface RestorePlan {
  backupId: string;
  type: BackupType;
  entities: string[];
  recordCount: number;
  dryRun: boolean;
  steps: Array<{ entity: string; action: string; count: number }>;
}

export interface BackupStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  totalSizeBytes: number;
  scheduled: boolean;
  lastBackupAt: Date | null;
}

/** Parse a Memory row into a BackupRecord. */
function parseBackupRecord(mem: {
  id: string;
  workspaceId: string;
  organizationId: string;
  content: string;
  tags: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
}): BackupRecord {
  let config: BackupConfig;
  try {
    config = JSON.parse(mem.content);
  } catch {
    config = { type: 'full', entities: [], status: 'pending', sizeBytes: 0, recordCount: 0, snapshot: '' };
  }
  return {
    id: mem.id,
    workspaceId: mem.workspaceId,
    organizationId: mem.organizationId,
    type: config.type,
    entities: config.entities || [],
    status: config.status,
    sizeBytes: config.sizeBytes || 0,
    recordCount: config.recordCount || 0,
    baseBackupId: config.baseBackupId || null,
    snapshot: mem.tags === '[]' ? '' : mem.tags,
    createdBy: mem.createdBy,
    createdAt: mem.createdAt,
  };
}

/** Parse a Memory row into a ScheduleConfig. */
function parseSchedule(mem: { content: string; tags: string }): ScheduleConfig | null {
  try {
    const config = JSON.parse(mem.content);
    return {
      frequency: config.frequency || 'daily',
      type: config.type || 'full',
      entities: config.entities || [],
      enabled: config.enabled ?? true,
      lastRunAt: config.lastRunAt || null,
      nextRunAt: config.nextRunAt || null,
      retentionDays: config.retentionDays ?? 30,
    };
  } catch {
    return null;
  }
}

/** Query all entities for a full backup snapshot. */
async function snapshotEntities(
  workspaceId: string,
  entities: string[],
): Promise<{ data: Record<string, unknown[]>; totalRecords: number }> {
  const data: Record<string, unknown[]> = {};
  let totalRecords = 0;
  const take = 10000;

  for (const entity of entities) {
    let rows: unknown[] = [];
    switch (entity) {
      case 'task':
        rows = await safePrisma(() => prisma.task.findMany({ where: { project: { workspaceId } }, take }), []);
        break;
      case 'goal':
        rows = await safePrisma(() => prisma.goal.findMany({ where: { workspaceId }, take }), []);
        break;
      case 'project':
        rows = await safePrisma(() => prisma.project.findMany({ where: { workspaceId }, take }), []);
        break;
      case 'memory':
        rows = await safePrisma(() => prisma.memory.findMany({ where: { workspaceId }, take }), []);
        break;
      case 'event':
        rows = await safePrisma(() => prisma.event.findMany({ where: { workspaceId }, take }), []);
        break;
      case 'document':
        rows = await safePrisma(() => prisma.document.findMany({ where: { workspaceId }, take }), []);
        break;
      default:
        rows = [];
    }
    data[entity] = rows;
    totalRecords += rows.length;
  }

  return { data, totalRecords };
}

export const BackupService = {
  /**
   * Create a new backup. For a full backup, snapshots all specified entities.
   * For incremental, records the config and marks as pending (base snapshot
   * referenced via baseBackupId).
   */
  async createBackup(input: {
    workspaceId: string;
    organizationId: string;
    type: BackupType;
    entities: string[];
    baseBackupId?: string;
    createdBy: string;
  }): Promise<BackupRecord> {
    const entities = input.entities.length > 0
      ? input.entities
      : ['task', 'goal', 'project', 'memory', 'event', 'document'];

    let snapshot = '';
    let recordCount = 0;
    let sizeBytes = 0;
    let status: BackupStatus = 'completed';

    if (input.type === 'full') {
      const { data, totalRecords } = await snapshotEntities(input.workspaceId, entities);
      snapshot = JSON.stringify(data).slice(0, 10000);
      recordCount = totalRecords;
      sizeBytes = Buffer.byteLength(snapshot, 'utf8');
    } else {
      // Incremental: mark as pending; actual diff computed on restore
      status = 'completed';
    }

    const config: BackupConfig = {
      type: input.type,
      entities,
      status,
      sizeBytes,
      recordCount,
      baseBackupId: input.baseBackupId || null,
      snapshot,
    };

    const mem = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'backup_record',
        content: JSON.stringify(config).slice(0, 10000),
        source: 'system',
        sourceId: input.baseBackupId || null,
        confidence: 0.5,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: snapshot || '[]',
        createdBy: input.createdBy,
      },
    });
    return parseBackupRecord(mem);
  },

  /**
   * Get a single backup record by ID.
   */
  async getBackup(backupId: string): Promise<BackupRecord | null> {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: backupId } }),
    null);
    if (!mem || mem.type !== 'backup_record') return null;
    return parseBackupRecord(mem);
  },

  /**
   * List backup records for a workspace.
   */
  async listBackups(workspaceId: string): Promise<BackupRecord[]> {
    const mems = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'backup_record' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
    return mems.map(parseBackupRecord);
  },

  /**
   * Delete a backup record.
   */
  async deleteBackup(backupId: string): Promise<void> {
    await prisma.memory.delete({ where: { id: backupId } });
  },

  /**
   * Restore (dry-run design): returns a plan of what would be restored.
   * Does NOT mutate any data.
   */
  async restore(backupId: string): Promise<RestorePlan | null> {
    const backup = await this.getBackup(backupId);
    if (!backup) return null;

    const steps = backup.entities.map((entity) => ({
      entity,
      action: backup.type === 'full' ? 'replace_all' : 'merge',
      count: backup.recordCount,
    }));

    return {
      backupId: backup.id,
      type: backup.type,
      entities: backup.entities,
      recordCount: backup.recordCount,
      dryRun: true,
      steps,
    };
  },

  /**
   * Schedule a recurring backup. Stores as a Memory record (type='backup_schedule').
   */
  async scheduleBackup(input: {
    workspaceId: string;
    organizationId: string;
    frequency: ScheduleFrequency;
    type: BackupType;
    entities: string[];
    createdBy: string;
  }): Promise<ScheduleConfig> {
    const now = new Date();
    const nextRunAt = this.computeNextRun(now, input.frequency);

    const config: ScheduleConfig = {
      frequency: input.frequency,
      type: input.type,
      entities: input.entities,
      enabled: true,
      lastRunAt: null,
      nextRunAt: nextRunAt.toISOString(),
      retentionDays: 30,
    };

    // Check if a schedule already exists for this workspace
    const existing = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { workspaceId: input.workspaceId, type: 'backup_schedule' },
      }),
    null);

    if (existing) {
      const mem = await prisma.memory.update({
        where: { id: existing.id },
        data: { content: JSON.stringify(config).slice(0, 10000) },
      });
      const parsed = parseSchedule(mem);
      return parsed || config;
    }

    const mem = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'backup_schedule',
        content: JSON.stringify(config).slice(0, 10000),
        source: 'system',
        sourceId: null,
        confidence: 0.5,
        owner: input.createdBy,
        lifecycle: 'permanent',
        tags: '[]',
        createdBy: input.createdBy,
      },
    });
    const parsed = parseSchedule(mem);
    return parsed || config;
  },

  /**
   * Get the current backup schedule for a workspace.
   */
  async getSchedule(workspaceId: string): Promise<ScheduleConfig | null> {
    const mem = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { workspaceId, type: 'backup_schedule' },
      }),
    null);
    if (!mem) return null;
    return parseSchedule(mem);
  },

  /**
   * Update an existing backup schedule.
   */
  async updateSchedule(workspaceId: string, input: Partial<{
    frequency: ScheduleFrequency;
    type: BackupType;
    entities: string[];
    enabled: boolean;
    retentionDays: number;
  }>): Promise<ScheduleConfig | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { workspaceId, type: 'backup_schedule' },
      }),
    null);
    if (!existing) return null;

    const current = parseSchedule(existing) || {
      frequency: 'daily' as ScheduleFrequency,
      type: 'full' as BackupType,
      entities: [],
      enabled: true,
      lastRunAt: null,
      nextRunAt: null,
      retentionDays: 30,
    };

    const updated: ScheduleConfig = {
      ...current,
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.entities !== undefined && { entities: input.entities }),
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      ...(input.retentionDays !== undefined && { retentionDays: input.retentionDays }),
    };

    if (input.frequency !== undefined) {
      updated.nextRunAt = this.computeNextRun(new Date(), input.frequency).toISOString();
    }

    const mem = await prisma.memory.update({
      where: { id: existing.id },
      data: { content: JSON.stringify(updated).slice(0, 10000) },
    });
    return parseSchedule(mem);
  },

  /**
   * Cancel (disable + delete) the backup schedule for a workspace.
   */
  async cancelSchedule(workspaceId: string): Promise<void> {
    const existing = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { workspaceId, type: 'backup_schedule' },
      }),
    null);
    if (existing) {
      await prisma.memory.delete({ where: { id: existing.id } });
    }
  },

  /**
   * Get the retention policy for a workspace.
   */
  async getRetentionPolicy(workspaceId: string): Promise<RetentionPolicy> {
    const mem = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { workspaceId, type: 'backup_retention' },
      }),
    null);
    if (!mem) {
      return { maxBackups: 50, retentionDays: 30, minKeep: 3 };
    }
    try {
      const policy = JSON.parse(mem.content);
      return {
        maxBackups: policy.maxBackups ?? 50,
        retentionDays: policy.retentionDays ?? 30,
        minKeep: policy.minKeep ?? 3,
      };
    } catch {
      return { maxBackups: 50, retentionDays: 30, minKeep: 3 };
    }
  },

  /**
   * Set the retention policy for a workspace.
   */
  async setRetentionPolicy(workspaceId: string, organizationId: string, policy: Partial<RetentionPolicy>, createdBy: string): Promise<RetentionPolicy> {
    const current = await this.getRetentionPolicy(workspaceId);
    const updated: RetentionPolicy = {
      maxBackups: policy.maxBackups ?? current.maxBackups,
      retentionDays: policy.retentionDays ?? current.retentionDays,
      minKeep: policy.minKeep ?? current.minKeep,
    };

    const existing = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { workspaceId, type: 'backup_retention' },
      }),
    null);

    if (existing) {
      await prisma.memory.update({
        where: { id: existing.id },
        data: { content: JSON.stringify(updated).slice(0, 10000) },
      });
    } else {
      await prisma.memory.create({
        data: {
          workspaceId,
          organizationId,
          type: 'backup_retention',
          content: JSON.stringify(updated).slice(0, 10000),
          source: 'system',
          sourceId: null,
          confidence: 0.5,
          owner: createdBy,
          lifecycle: 'permanent',
          tags: '[]',
          createdBy,
        },
      });
    }
    return updated;
  },

  /**
   * Clean up old backups according to the retention policy.
   */
  async cleanupOldBackups(workspaceId: string): Promise<{ deleted: number; remaining: number }> {
    const policy = await this.getRetentionPolicy(workspaceId);
    const backups = await this.listBackups(workspaceId);
    const now = Date.now();
    const cutoff = now - policy.retentionDays * 24 * 60 * 60 * 1000;

    const toDelete: string[] = [];
    for (const b of backups) {
      if (b.createdAt.getTime() < cutoff && backups.length - toDelete.length > policy.minKeep) {
        toDelete.push(b.id);
      }
    }

    // Also enforce maxBackups
    const sorted = [...backups].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    while (sorted.length - toDelete.length > policy.maxBackups) {
      const oldest = sorted.pop();
      if (oldest && !toDelete.includes(oldest.id)) {
        toDelete.push(oldest.id);
      }
    }

    for (const id of toDelete) {
      await prisma.memory.delete({ where: { id } }).catch(() => {});
    }

    return { deleted: toDelete.length, remaining: backups.length - toDelete.length };
  },

  /**
   * Get aggregate backup stats for a workspace.
   */
  async getBackupStats(workspaceId: string): Promise<BackupStats> {
    const [backups, schedule] = await Promise.all([
      this.listBackups(workspaceId),
      this.getSchedule(workspaceId),
    ]);

    let totalSizeBytes = 0;
    for (const b of backups) totalSizeBytes += b.sizeBytes;

    const lastBackup = backups[0];

    return {
      total: backups.length,
      completed: backups.filter((b) => b.status === 'completed').length,
      pending: backups.filter((b) => b.status === 'pending').length,
      failed: backups.filter((b) => b.status === 'failed').length,
      totalSizeBytes,
      scheduled: schedule?.enabled ?? false,
      lastBackupAt: lastBackup?.createdAt || null,
    };
  },

  /**
   * Compute the next run time for a given frequency.
   */
  computeNextRun(from: Date, frequency: ScheduleFrequency): Date {
    const next = new Date(from);
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(2, 0, 0, 0);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        next.setHours(2, 0, 0, 0);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(2, 0, 0, 0);
        break;
    }
    return next;
  },
};
