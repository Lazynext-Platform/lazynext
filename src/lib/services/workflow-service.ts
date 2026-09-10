import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import type {
  WorkflowDefinition,
  WorkflowCreateInput,
  WorkflowUpdateInput,
  WorkflowListOptions,
  WorkflowValidationResult,
  WorkflowStats,
  WorkflowNode,
  WorkflowEdge,
} from './workflow-types';

// ── Helpers ──

/**
 * Serialize a workflow definition into the JSON content string stored
 * in the Memory table.
 */
function serializeWorkflow(wf: Omit<WorkflowDefinition, 'id'>): string {
  return JSON.stringify(wf);
}

/**
 * Parse a Memory record (type='workflow_definition') back into a
 * WorkflowDefinition, merging the Memory id as the workflow id.
 */
function deserializeWorkflow(memory: {
  id: string;
  content: string;
  updatedAt: Date;
  createdAt: Date;
}): WorkflowDefinition | null {
  try {
    const parsed = JSON.parse(memory.content) as Omit<WorkflowDefinition, 'id'>;
    return {
      ...parsed,
      id: memory.id,
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
      variables: parsed.variables || [],
      config: parsed.config || {},
      version: parsed.version || 1,
      status: parsed.status || 'draft',
    };
  } catch {
    return null;
  }
}

/**
 * Detect the trigger type from the workflow's trigger node config.
 */
function detectTriggerType(nodes: WorkflowNode[]): string {
  const trigger = nodes.find((n) => n.type === 'trigger');
  if (!trigger) return 'unknown';
  return (trigger.config?.type as string) || 'manual';
}

// ── Cycle detection (DFS) ──

function hasCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
      adj.get(e.source)!.push(e.target);
    }
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const n of nodes) color.set(n.id, WHITE);

  function dfs(u: string): boolean {
    color.set(u, GRAY);
    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      const c = color.get(v);
      if (c === GRAY) return true; // back edge → cycle
      if (c === WHITE && dfs(v)) return true;
    }
    color.set(u, BLACK);
    return false;
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE) {
      if (dfs(n.id)) return true;
    }
  }
  return false;
}

// ── Workflow Service ──

export const WorkflowService = {
  /**
   * Create a new workflow definition stored as a Memory record with
   * type='workflow_definition'.
   */
  async create(organizationId: string, input: WorkflowCreateInput): Promise<WorkflowDefinition> {
    const name = input.name.trim();
    if (!name) throw new Error('name_required');

    // Resolve workspaceId — required by Memory model.
    let workspaceId = input.workspaceId;
    if (!workspaceId) {
      const ws = await safePrisma(
        () => prisma.workspace.findFirst({ where: { organizationId }, select: { id: true } }),
        null,
      );
      if (!ws) throw new Error('no_workspace');
      workspaceId = ws.id;
    }

    const workflowData: Omit<WorkflowDefinition, 'id'> = {
      name: name.slice(0, 200),
      description: input.description?.slice(0, 2000),
      nodes: input.nodes || [],
      edges: input.edges || [],
      variables: input.variables || [],
      config: input.config || {},
      version: 1,
      status: 'draft',
    };

    const memory = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'workflow_definition',
        content: serializeWorkflow(workflowData).slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 1.0,
        owner: input.createdBy,
        lifecycle: 'permanent',
        tags: JSON.stringify(['workflow', workflowData.status, detectTriggerType(workflowData.nodes)]),
        createdBy: input.createdBy,
      },
    });

    return { ...workflowData, id: memory.id };
  },

  /**
   * Get a single workflow by id (Memory record).
   */
  async get(id: string): Promise<WorkflowDefinition | null> {
    const memory = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!memory || memory.type !== 'workflow_definition') return null;
    return deserializeWorkflow(memory);
  },

  /**
   * List workflows for an organization with optional filters.
   */
  async list(organizationId: string, opts?: WorkflowListOptions): Promise<WorkflowDefinition[]> {
    const take = Math.min(opts?.take || 100, 500);
    const memories = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            organizationId,
            type: 'workflow_definition',
            ...(opts?.workspaceId && { workspaceId: opts.workspaceId }),
          },
          orderBy: { updatedAt: 'desc' },
          take,
        }),
      [],
    );

    let workflows = memories
      .map((m) => deserializeWorkflow(m))
      .filter((w): w is WorkflowDefinition => w !== null);

    // Filter by status (stored in content JSON)
    if (opts?.status) {
      workflows = workflows.filter((w) => w.status === opts.status);
    }

    // Filter by search term
    if (opts?.search) {
      const q = opts.search.toLowerCase();
      workflows = workflows.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.description?.toLowerCase().includes(q) ?? false),
      );
    }

    return workflows;
  },

  /**
   * Update a workflow definition. Increments the version.
   */
  async update(id: string, input: WorkflowUpdateInput): Promise<WorkflowDefinition | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated: Omit<WorkflowDefinition, 'id'> = {
      name: input.name?.trim().slice(0, 200) || existing.name,
      description: input.description !== undefined ? input.description?.slice(0, 2000) : existing.description,
      nodes: input.nodes !== undefined ? input.nodes : existing.nodes,
      edges: input.edges !== undefined ? input.edges : existing.edges,
      variables: input.variables !== undefined ? input.variables : existing.variables,
      config: input.config !== undefined ? input.config : existing.config,
      version: existing.version + 1,
      status: input.status !== undefined ? input.status : existing.status,
    };

    await prisma.memory.update({
      where: { id },
      data: {
        content: serializeWorkflow(updated).slice(0, 10000),
        tags: JSON.stringify(['workflow', updated.status, detectTriggerType(updated.nodes)]),
      },
    });

    return { ...updated, id };
  },

  /**
   * Delete a workflow definition.
   */
  async delete(id: string): Promise<{ ok: boolean }> {
    await prisma.memory.delete({ where: { id } });
    return { ok: true };
  },

  /**
   * Duplicate a workflow with a new name.
   */
  async duplicate(id: string, newName: string, createdBy: string): Promise<WorkflowDefinition | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    // Get the original's org/workspace from the Memory record
    const memory = await prisma.memory.findUnique({ where: { id } });
    if (!memory) return null;

    return this.create(memory.organizationId, {
      name: newName.trim() || `${existing.name} (Copy)`,
      description: existing.description,
      workspaceId: memory.workspaceId,
      nodes: existing.nodes,
      edges: existing.edges,
      variables: existing.variables,
      config: existing.config,
      createdBy,
    });
  },

  /**
   * Publish (activate) a workflow.
   */
  async publish(id: string): Promise<WorkflowDefinition | null> {
    return this.update(id, { status: 'published' });
  },

  /**
   * Unpublish (revert to draft) a workflow.
   */
  async unpublish(id: string): Promise<WorkflowDefinition | null> {
    return this.update(id, { status: 'draft' });
  },

  /**
   * Validate a workflow definition:
   *  - Must have exactly one trigger node
   *  - No cycles (except loops)
   *  - All edges connect to existing nodes
   *  - Required configs present per node type
   */
  validate(workflow: WorkflowDefinition): WorkflowValidationResult {
    const errors: string[] = [];

    // Must have nodes
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('workflow_must_have_nodes');
      return { valid: false, errors };
    }

    // Must have a trigger node
    const triggers = workflow.nodes.filter((n) => n.type === 'trigger');
    if (triggers.length === 0) {
      errors.push('missing_trigger_node');
    }
    if (triggers.length > 1) {
      errors.push('multiple_trigger_nodes');
    }

    // All edges connect to existing nodes
    const nodeIds = new Set(workflow.nodes.map((n) => n.id));
    for (const edge of workflow.edges || []) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`edge_${edge.id}_source_not_found`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`edge_${edge.id}_target_not_found`);
      }
    }

    // No cycles (loop nodes are allowed to have back-edges within their scope,
    // but we still detect global cycles)
    if (hasCycle(workflow.nodes, workflow.edges || [])) {
      errors.push('cycle_detected');
    }

    // Required configs per node type
    for (const node of workflow.nodes) {
      if (node.type === 'trigger' && !node.config?.type) {
        errors.push(`node_${node.id}_missing_trigger_type`);
      }
      if (node.type === 'condition' && !node.config?.field) {
        errors.push(`node_${node.id}_missing_condition_field`);
      }
      if (node.type === 'loop' && !node.config?.type) {
        errors.push(`node_${node.id}_missing_loop_type`);
      }
      if (node.type === 'action' && !node.config?.action) {
        errors.push(`node_${node.id}_missing_action`);
      }
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Get version history for a workflow.
   * Since we store only the current version, we return a single entry.
   * In a full implementation, prior versions would be stored as separate
   * Memory records with a shared correlationId.
   */
  async getVersions(id: string): Promise<Array<{ version: number; updatedAt: string; status: string }>> {
    const wf = await this.get(id);
    if (!wf) return [];
    return [{ version: wf.version, updatedAt: new Date().toISOString(), status: wf.status }];
  },

  /**
   * Get aggregate stats for workflows in an organization.
   */
  async getStats(organizationId: string): Promise<WorkflowStats> {
    const workflows = await this.list(organizationId, { take: 500 });

    const byStatus: Record<string, number> = {};
    const byTriggerType: Record<string, number> = {};

    for (const wf of workflows) {
      byStatus[wf.status] = (byStatus[wf.status] || 0) + 1;
      const trigger = detectTriggerType(wf.nodes);
      byTriggerType[trigger] = (byTriggerType[trigger] || 0) + 1;
    }

    // Count executions (Events with type='workflow_execution')
    const executionCount = await safePrisma(
      () =>
        prisma.event.count({
          where: { organizationId, type: 'workflow_execution' },
        }),
      0,
    );

    return {
      total: workflows.length,
      byStatus,
      byTriggerType,
      executionCount,
    };
  },
};
