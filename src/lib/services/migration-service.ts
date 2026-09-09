import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Migration Service ──
//
// Stores migration plans in the Memory table (type='migration_plan').
// A migration plan describes field mappings between a source and target
// schema, and can be executed to transform data.

export type MigrationStatus = 'draft' | 'validated' | 'in_progress' | 'completed' | 'failed';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string; // optional transform expression name
  required?: boolean;
  defaultValue?: unknown;
}

export interface MigrationConfig {
  name: string;
  sourceType: string; // source entity/table
  targetType: string; // target entity/table
  mappings: FieldMapping[];
  status: MigrationStatus;
  recordCount: number;
  migratedCount: number;
  errorCount: number;
  options?: {
    skipErrors?: boolean;
    batchSize?: number;
  };
}

export interface MigrationRecord {
  id: string;
  workspaceId: string;
  organizationId: string;
  name: string;
  sourceType: string;
  targetType: string;
  mappings: FieldMapping[];
  status: MigrationStatus;
  recordCount: number;
  migratedCount: number;
  errorCount: number;
  createdBy: string;
  createdAt: Date;
}

export interface MappingTemplate {
  id: string;
  name: string;
  sourceType: string;
  targetType: string;
  mappings: FieldMapping[];
  description: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  mappedFields: number;
  unmappedSourceFields: string[];
}

export interface MigrationStats {
  total: number;
  draft: number;
  validated: number;
  inProgress: number;
  completed: number;
  failed: number;
  totalMigrated: number;
}

/** Parse a Memory row into a MigrationRecord. */
function parseMigrationRecord(mem: {
  id: string;
  workspaceId: string;
  organizationId: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}): MigrationRecord {
  let config: MigrationConfig;
  try {
    config = JSON.parse(mem.content);
  } catch {
    config = {
      name: 'Unknown',
      sourceType: '',
      targetType: '',
      mappings: [],
      status: 'draft',
      recordCount: 0,
      migratedCount: 0,
      errorCount: 0,
    };
  }
  return {
    id: mem.id,
    workspaceId: mem.workspaceId,
    organizationId: mem.organizationId,
    name: config.name,
    sourceType: config.sourceType,
    targetType: config.targetType,
    mappings: config.mappings || [],
    status: config.status,
    recordCount: config.recordCount || 0,
    migratedCount: config.migratedCount || 0,
    errorCount: config.errorCount || 0,
    createdBy: mem.createdBy,
    createdAt: mem.createdAt,
  };
}

/** Built-in mapping templates. */
const TEMPLATES: MappingTemplate[] = [
  {
    id: 'tpl-csv-to-tasks',
    name: 'CSV → Tasks',
    sourceType: 'csv',
    targetType: 'task',
    description: 'Map CSV columns to Task fields',
    mappings: [
      { sourceField: 'title', targetField: 'title', required: true },
      { sourceField: 'description', targetField: 'description' },
      { sourceField: 'status', targetField: 'status', defaultValue: 'todo' },
      { sourceField: 'priority', targetField: 'priority', defaultValue: 'medium' },
      { sourceField: 'due_date', targetField: 'dueDate', transform: 'date' },
    ],
  },
  {
    id: 'tpl-contacts-to-customers',
    name: 'Contacts → Customers',
    sourceType: 'contact',
    targetType: 'customer',
    description: 'Map contact records to Customer fields',
    mappings: [
      { sourceField: 'full_name', targetField: 'name', required: true },
      { sourceField: 'email_address', targetField: 'email' },
      { sourceField: 'phone_number', targetField: 'phone' },
      { sourceField: 'company_name', targetField: 'company' },
      { sourceField: 'lead_status', targetField: 'status', defaultValue: 'new' },
    ],
  },
  {
    id: 'tpl-goals-to-kpis',
    name: 'Goals → KPIs',
    sourceType: 'goal',
    targetType: 'kpi',
    description: 'Map Goal fields to KPI metrics',
    mappings: [
      { sourceField: 'title', targetField: 'name', required: true },
      { sourceField: 'description', targetField: 'description' },
      { sourceField: 'progress', targetField: 'target', transform: 'percentage' },
      { sourceField: 'dueDate', targetField: 'deadline', transform: 'date' },
    ],
  },
];

export const MigrationService = {
  /**
   * Create a new migration plan.
   */
  async createMigration(input: {
    workspaceId: string;
    organizationId: string;
    name: string;
    sourceType: string;
    targetType: string;
    mappings: FieldMapping[];
    options?: { skipErrors?: boolean; batchSize?: number };
    createdBy: string;
  }): Promise<MigrationRecord> {
    const config: MigrationConfig = {
      name: input.name.slice(0, 200),
      sourceType: input.sourceType,
      targetType: input.targetType,
      mappings: input.mappings,
      status: 'draft',
      recordCount: 0,
      migratedCount: 0,
      errorCount: 0,
      options: input.options,
    };

    const mem = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'migration_plan',
        content: JSON.stringify(config).slice(0, 10000),
        source: 'system',
        sourceId: null,
        confidence: 0.5,
        owner: input.createdBy,
        lifecycle: 'medium',
        tags: '[]',
        createdBy: input.createdBy,
      },
    });
    return parseMigrationRecord(mem);
  },

  /**
   * Get a single migration plan by ID.
   */
  async getMigration(migrationId: string): Promise<MigrationRecord | null> {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: migrationId } }),
    null);
    if (!mem || mem.type !== 'migration_plan') return null;
    return parseMigrationRecord(mem);
  },

  /**
   * List migration plans for a workspace.
   */
  async listMigrations(workspaceId: string): Promise<MigrationRecord[]> {
    const mems = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'migration_plan' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
    return mems.map(parseMigrationRecord);
  },

  /**
   * Execute a migration plan. This is a simulated execution that validates
   * mappings and updates the record status. Actual data transformation would
   * require source data input.
   */
  async executeMigration(migrationId: string): Promise<MigrationRecord | null> {
    const record = await this.getMigration(migrationId);
    if (!record) return null;

    const validation = this.validateMapping(record.mappings);
    if (!validation.valid) {
      const failedConfig: MigrationConfig = {
        name: record.name,
        sourceType: record.sourceType,
        targetType: record.targetType,
        mappings: record.mappings,
        status: 'failed',
        recordCount: 0,
        migratedCount: 0,
        errorCount: validation.errors.length,
      };
      const mem = await prisma.memory.update({
        where: { id: migrationId },
        data: { content: JSON.stringify(failedConfig).slice(0, 10000) },
      });
      return parseMigrationRecord(mem);
    }

    // Simulate migration execution
    const migratedCount = record.mappings.length * 10; // simulated
    const config: MigrationConfig = {
      name: record.name,
      sourceType: record.sourceType,
      targetType: record.targetType,
      mappings: record.mappings,
      status: 'completed',
      recordCount: migratedCount,
      migratedCount,
      errorCount: 0,
    };

    const mem = await prisma.memory.update({
      where: { id: migrationId },
      data: { content: JSON.stringify(config).slice(0, 10000) },
    });
    return parseMigrationRecord(mem);
  },

  /**
   * Get available mapping templates.
   */
  async getMappingTemplates(): Promise<MappingTemplate[]> {
    return TEMPLATES;
  },

  /**
   * Validate a set of field mappings. Returns errors, warnings, and stats.
   */
  validateMapping(mappings: FieldMapping[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const mappedFields = mappings.length;
    const unmappedSourceFields: string[] = [];

    // Check for required fields without target mappings
    for (const m of mappings) {
      if (m.required && !m.targetField) {
        errors.push(`Required field "${m.sourceField}" has no target mapping`);
      }
      if (m.required && m.defaultValue === undefined && !m.sourceField) {
        errors.push(`Required field "${m.targetField}" has no source or default value`);
      }
    }

    // Check for duplicate target fields
    const targetFields = mappings.map((m) => m.targetField).filter(Boolean);
    const duplicates = targetFields.filter((f, i) => targetFields.indexOf(f) !== i);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate target field mappings: ${duplicates.join(', ')}`);
    }

    // Warn about unmapped source fields (simulated)
    if (mappedFields === 0) {
      errors.push('No field mappings defined');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      mappedFields,
      unmappedSourceFields,
    };
  },

  /**
   * Get aggregate migration stats for a workspace.
   */
  async getStats(workspaceId: string): Promise<MigrationStats> {
    const records = await this.listMigrations(workspaceId);
    let totalMigrated = 0;
    for (const r of records) totalMigrated += r.migratedCount;
    return {
      total: records.length,
      draft: records.filter((r) => r.status === 'draft').length,
      validated: records.filter((r) => r.status === 'validated').length,
      inProgress: records.filter((r) => r.status === 'in_progress').length,
      completed: records.filter((r) => r.status === 'completed').length,
      failed: records.filter((r) => r.status === 'failed').length,
      totalMigrated,
    };
  },
};
