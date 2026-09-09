import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Data Lineage Service ──
//
// Stores data lineage records in the Memory table (type='data_lineage').
// Lineage tracks how data flows between entities — source → transformation → target.

export interface LineageRecord {
  id: string;
  workspaceId: string;
  organizationId: string;
  sourceEntity: string;
  sourceId: string;
  targetEntity: string;
  targetId: string;
  transformation: string;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

export interface LineageConfig {
  sourceEntity: string;
  sourceId: string;
  targetEntity: string;
  targetId: string;
  transformation: string;
  metadata: Record<string, unknown>;
}

export interface LineageNode {
  entity: string;
  id: string;
}

export interface LineageEdge {
  source: LineageNode;
  target: LineageNode;
  transformation: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  depth: number;
}

export interface LineageStats {
  totalRecords: number;
  bySourceEntity: Record<string, number>;
  byTargetEntity: Record<string, number>;
  byTransformation: Record<string, number>;
}

/** Parse a Memory row into a LineageRecord. */
function parseLineageRecord(mem: {
  id: string;
  workspaceId: string;
  organizationId: string;
  content: string;
  tags: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
}): LineageRecord {
  let config: LineageConfig;
  try {
    config = JSON.parse(mem.content);
  } catch {
    config = {
      sourceEntity: '',
      sourceId: '',
      targetEntity: '',
      targetId: '',
      transformation: 'unknown',
      metadata: {},
    };
  }
  let metadata: Record<string, unknown> = {};
  try {
    metadata = config.metadata ? JSON.parse(JSON.stringify(config.metadata)) : {};
  } catch {
    metadata = {};
  }
  return {
    id: mem.id,
    workspaceId: mem.workspaceId,
    organizationId: mem.organizationId,
    sourceEntity: config.sourceEntity,
    sourceId: config.sourceId,
    targetEntity: config.targetEntity,
    targetId: config.targetId,
    transformation: config.transformation,
    metadata,
    createdBy: mem.createdBy,
    createdAt: mem.createdAt,
  };
}

export const DataLineageService = {
  /**
   * Record a new lineage entry linking a source entity to a target entity.
   */
  async recordLineage(input: {
    workspaceId: string;
    organizationId: string;
    sourceEntity: string;
    sourceId: string;
    targetEntity: string;
    targetId: string;
    transformation: string;
    metadata?: Record<string, unknown>;
    createdBy: string;
  }): Promise<LineageRecord> {
    const config: LineageConfig = {
      sourceEntity: input.sourceEntity,
      sourceId: input.sourceId,
      targetEntity: input.targetEntity,
      targetId: input.targetId,
      transformation: input.transformation,
      metadata: input.metadata || {},
    };

    const mem = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'data_lineage',
        content: JSON.stringify(config).slice(0, 10000),
        source: 'system',
        sourceId: input.sourceId,
        confidence: 0.5,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(input.metadata || {}),
        createdBy: input.createdBy,
      },
    });
    return parseLineageRecord(mem);
  },

  /**
   * Get a single lineage record by ID.
   */
  async getLineage(lineageId: string): Promise<LineageRecord | null> {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: lineageId } }),
    null);
    if (!mem || mem.type !== 'data_lineage') return null;
    return parseLineageRecord(mem);
  },

  /**
   * Get all lineage records for a specific entity (both as source and target).
   */
  async getEntityLineage(
    workspaceId: string,
    entity: string,
    entityId: string,
  ): Promise<LineageRecord[]> {
    const mems = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'data_lineage',
          OR: [
            { sourceId: entityId },
            { tags: { contains: entityId } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    []);
    // Filter to only records involving this entity type
    return mems
      .map(parseLineageRecord)
      .filter(
        (r) =>
          (r.sourceEntity === entity && r.sourceId === entityId) ||
          (r.targetEntity === entity && r.targetId === entityId),
      );
  },

  /**
   * Build a lineage graph starting from a given entity, traversing up to
   * the specified depth.
   */
  async getLineageGraph(
    workspaceId: string,
    entity: string,
    entityId: string,
    maxDepth: number = 5,
  ): Promise<LineageGraph> {
    const allRecords = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'data_lineage' },
        take: 1000,
      }),
    []);
    const records = allRecords.map(parseLineageRecord);

    const nodes = new Map<string, LineageNode>();
    const edges: LineageEdge[] = [];
    const visited = new Set<string>();

    function nodeKey(entity: string, id: string): string {
      return `${entity}:${id}`;
    }

    function traverse(curEntity: string, curId: string, depth: number) {
      const key = nodeKey(curEntity, curId);
      if (visited.has(key) || depth > maxDepth) return;
      visited.add(key);
      nodes.set(key, { entity: curEntity, id: curId });

      for (const r of records) {
        // Forward: this entity is the source
        if (r.sourceEntity === curEntity && r.sourceId === curId) {
          const targetKey = nodeKey(r.targetEntity, r.targetId);
          nodes.set(targetKey, { entity: r.targetEntity, id: r.targetId });
          edges.push({
            source: { entity: r.sourceEntity, id: r.sourceId },
            target: { entity: r.targetEntity, id: r.targetId },
            transformation: r.transformation,
          });
          traverse(r.targetEntity, r.targetId, depth + 1);
        }
        // Backward: this entity is the target
        if (r.targetEntity === curEntity && r.targetId === curId) {
          const sourceKey = nodeKey(r.sourceEntity, r.sourceId);
          nodes.set(sourceKey, { entity: r.sourceEntity, id: r.sourceId });
          edges.push({
            source: { entity: r.sourceEntity, id: r.sourceId },
            target: { entity: r.targetEntity, id: r.targetId },
            transformation: r.transformation,
          });
          traverse(r.sourceEntity, r.sourceId, depth + 1);
        }
      }
    }

    traverse(entity, entityId, 0);

    return {
      nodes: [...nodes.values()],
      edges,
      depth: maxDepth,
    };
  },

  /**
   * Get aggregate lineage stats for a workspace.
   */
  async getStats(workspaceId: string): Promise<LineageStats> {
    const mems = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'data_lineage' },
        take: 1000,
      }),
    []);
    const records = mems.map(parseLineageRecord);

    const bySourceEntity: Record<string, number> = {};
    const byTargetEntity: Record<string, number> = {};
    const byTransformation: Record<string, number> = {};

    for (const r of records) {
      bySourceEntity[r.sourceEntity] = (bySourceEntity[r.sourceEntity] || 0) + 1;
      byTargetEntity[r.targetEntity] = (byTargetEntity[r.targetEntity] || 0) + 1;
      byTransformation[r.transformation] = (byTransformation[r.transformation] || 0) + 1;
    }

    return {
      totalRecords: records.length,
      bySourceEntity,
      byTargetEntity,
      byTransformation,
    };
  },
};
