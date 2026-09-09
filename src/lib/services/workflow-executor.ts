// ── Workflow Builder v2 — Execution Engine ──
// Loads a workflow definition from Memory, creates an execution Event,
// follows edges from the trigger node, executes each node by type,
// tracks results, and supports dry-runs, cancellation, and approval resume.

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { WorkflowService } from './workflow-service';
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  NodeExecution,
  ExecutionStatus,
  NodeExecutionStatus,
  ExecutionContext,
  ExecuteNodeResult,
  TestRunResult,
  ConditionConfig,
  ConditionOperator,
} from './workflow-types';

// ── Helpers ──

/** Get the outgoing edges from a node, optionally filtered by handle. */
function getOutgoingEdges(edges: WorkflowEdge[], nodeId: string, handle?: string): WorkflowEdge[] {
  return edges.filter((e) => e.source === nodeId && (!handle || e.sourceHandle === handle));
}

/** Find a node by id. */
function findNode(nodes: WorkflowNode[], id: string): WorkflowNode | undefined {
  return nodes.find((n) => n.id === id);
}

/** Generate a unique execution id. */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Serialize an execution into the JSON content stored in the Event table. */
function serializeExecution(exec: WorkflowExecution): string {
  return JSON.stringify(exec);
}

/** Parse an Event record (type='workflow_execution') back into a WorkflowExecution. */
function deserializeExecution(event: {
  id: string;
  metadata: string;
  createdAt: Date;
}): WorkflowExecution | null {
  try {
    const parsed = JSON.parse(event.metadata) as Omit<WorkflowExecution, 'id'>;
    return {
      ...parsed,
      id: event.id,
      nodeExecutions: parsed.nodeExecutions || [],
      variables: parsed.variables || {},
    };
  } catch {
    return null;
  }
}

// ── Variable resolution ──

/**
 * Resolve {{variable}} references inside a string, looking up values
 * from the execution context's variables and nodeOutputs maps.
 * Supports dot-path access: {{nodes.action1.output.title}} → context.nodeOutputs['action1']?.title
 */
export function resolveVariable(name: string, context: ExecutionContext): unknown {
  // Strip braces
  const key = name.replace(/[{}]/g, '').trim();
  if (!key) return undefined;

  // Direct variable lookup
  if (key in context.variables) {
    return context.variables[key];
  }

  // Dot-path: nodes.<nodeId>.output.<path>
  const parts = key.split('.');
  if (parts.length >= 3 && parts[0] === 'nodes') {
    const nodeId = parts[1];
    const rest = parts.slice(2);
    let val: unknown = context.nodeOutputs[nodeId];
    for (const p of rest) {
      if (p === 'output') continue;
      if (val && typeof val === 'object' && p in (val as Record<string, unknown>)) {
        val = (val as Record<string, unknown>)[p];
      } else {
        return undefined;
      }
    }
    return val;
  }

  // input.* references
  if (parts[0] === 'input') {
    return context.variables[parts.slice(1).join('.')];
  }

  return undefined;
}

/** Recursively resolve {{variables}} inside any value (string, object, array). */
function resolveValue(value: unknown, context: ExecutionContext): unknown {
  if (typeof value === 'string') {
    // Full-match: the entire string is a single {{var}} → return typed value
    const fullMatch = value.match(/^\{\{([^}]+)\}\}$/);
    if (fullMatch) {
      return resolveVariable(fullMatch[0], context);
    }
    // Partial: replace all occurrences with stringified values
    return value.replace(/\{\{([^}]+)\}\}/g, (_m, inner: string) => {
      const v = resolveVariable(`{{${inner}}}`, context);
      return v === undefined || v === null ? '' : String(v);
    });
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveValue(v, context));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveValue(v, context);
    }
    return out;
  }
  return value;
}

// ── Condition evaluation ──

/**
 * Evaluate a condition config against the execution context.
 * Supports all operators: eq, ne, gt, lt, gte, lte, contains,
 * startsWith, endsWith, in, notIn, empty, notEmpty.
 */
export function evaluateCondition(
  config: ConditionConfig,
  context: ExecutionContext,
): boolean {
  const rawField = config.field;
  const fieldValue = resolveVariable(`{{${rawField}}}`, context);
  const compareValue = resolveValue(config.value, context);

  const op: ConditionOperator = config.operator;

  switch (op) {
    case 'eq':
      return fieldValue === compareValue;
    case 'ne':
      return fieldValue !== compareValue;
    case 'gt':
      return typeof fieldValue === 'number' && typeof compareValue === 'number' && fieldValue > compareValue;
    case 'lt':
      return typeof fieldValue === 'number' && typeof compareValue === 'number' && fieldValue < compareValue;
    case 'gte':
      return typeof fieldValue === 'number' && typeof compareValue === 'number' && fieldValue >= compareValue;
    case 'lte':
      return typeof fieldValue === 'number' && typeof compareValue === 'number' && fieldValue <= compareValue;
    case 'contains':
      if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
        return fieldValue.includes(compareValue);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(compareValue);
      }
      return false;
    case 'startsWith':
      return typeof fieldValue === 'string' && typeof compareValue === 'string' && fieldValue.startsWith(compareValue);
    case 'endsWith':
      return typeof fieldValue === 'string' && typeof compareValue === 'string' && fieldValue.endsWith(compareValue);
    case 'in':
      return Array.isArray(compareValue) && compareValue.includes(fieldValue);
    case 'notIn':
      return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
    case 'empty':
      return fieldValue === undefined || fieldValue === null || fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0) ||
        (typeof fieldValue === 'object' && fieldValue !== null && Object.keys(fieldValue).length === 0);
    case 'notEmpty':
      return !(fieldValue === undefined || fieldValue === null || fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0) ||
        (typeof fieldValue === 'object' && fieldValue !== null && Object.keys(fieldValue).length === 0));
    default:
      return false;
  }
}

// ── Executor ──

export interface ExecuteOptions {
  dryRun?: boolean;
  startedBy?: string;
  organizationId?: string;
  maxSteps?: number;
}

export const WorkflowExecutor = {
  /**
   * Execute a workflow by id. Loads the definition from Memory, creates
   * an execution Event, follows edges from the trigger node, and executes
   * each node in sequence (or parallel where specified).
   */
  async execute(
    workflowId: string,
    input?: Record<string, unknown>,
    opts?: ExecuteOptions,
  ): Promise<WorkflowExecution> {
    const workflow = await WorkflowService.get(workflowId);
    if (!workflow) throw new Error('workflow_not_found');

    const dryRun = opts?.dryRun ?? false;
    const maxSteps = opts?.maxSteps ?? 1000;

    // Resolve organizationId from the Memory record
    let organizationId = opts?.organizationId;
    if (!organizationId) {
      const memory = await safePrisma(
        () => prisma.memory.findUnique({ where: { id: workflowId }, select: { organizationId: true } }),
        null,
      );
      if (!memory) throw new Error('workflow_not_found');
      organizationId = memory.organizationId;
    }

    // Find the trigger node
    const trigger = workflow.nodes.find((n) => n.type === 'trigger');
    if (!trigger) throw new Error('missing_trigger_node');

    const executionId = generateId('exec');
    const startedAt = new Date().toISOString();

    const context: ExecutionContext = {
      workflow,
      variables: { ...(input || {}) },
      nodeExecutions: [],
      nodeOutputs: {},
      path: [],
      dryRun,
    };

    // Seed workflow variables with defaults
    for (const v of workflow.variables) {
      if (v.defaultValue !== undefined && !(v.name in context.variables)) {
        context.variables[v.name] = v.defaultValue;
      }
    }

    let status: ExecutionStatus = 'running';
    let result: unknown = undefined;

    try {
      // Start from the trigger's outgoing edges
      let currentEdges = getOutgoingEdges(workflow.edges, trigger.id);

      let steps = 0;
      while (currentEdges.length > 0 && steps < maxSteps) {
        steps++;

        // Execute all nodes reachable from the current edges
        // (for parallel branches, execute all; otherwise take the first)
        const nextEdges: WorkflowEdge[] = [];

        for (const edge of currentEdges) {
          const node = findNode(workflow.nodes, edge.target);
          if (!node) continue;

          context.path.push(node.id);

          const nodeResult = await this.executeNode(node, context);

          const nodeExec: NodeExecution = {
            nodeId: node.id,
            status: nodeResult.status,
            startedAt: startedAt,
            completedAt: new Date().toISOString(),
            input: context.variables,
            output: nodeResult.output,
            error: nodeResult.status === 'failed' ? String(nodeResult.output) : undefined,
          };
          context.nodeExecutions.push(nodeExec);
          context.nodeOutputs[node.id] = nodeResult.output;

          if (nodeResult.status === 'failed') {
            status = 'failed';
            result = nodeResult.output;
            break;
          }

          if (nodeResult.status === 'waiting') {
            status = 'waiting_approval';
            break;
          }

          // Collect next nodes
          for (const nextNodeId of nodeResult.nextNodes) {
            const outEdges = getOutgoingEdges(workflow.edges, nextNodeId);
            nextEdges.push(...outEdges);
          }
        }

        if (status === 'failed' || status === 'waiting_approval') break;
        currentEdges = nextEdges;
      }

      if (status === 'running') {
        status = 'completed';
      }
    } catch (e) {
      status = 'failed';
      result = e instanceof Error ? e.message : String(e);
    }

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status,
      startedAt,
      completedAt: status === 'completed' || status === 'failed' ? new Date().toISOString() : undefined,
      variables: context.variables,
      nodeExecutions: context.nodeExecutions,
      result,
    };

    // Persist the execution as an Event (skip in dry-run)
    if (!dryRun && organizationId) {
      const memory = await safePrisma(
        () => prisma.memory.findUnique({ where: { id: workflowId }, select: { workspaceId: true } }),
        null,
      );
      await safePrisma(
        () =>
          prisma.event.create({
            data: {
              id: executionId,
              type: 'workflow_execution',
              source: 'workflow_executor',
              sourceId: workflowId,
              organizationId,
              workspaceId: memory?.workspaceId || organizationId,
              metadata: serializeExecution(execution).slice(0, 10000),
            },
          }),
        null,
      );
    }

    return execution;
  },

  /**
   * Execute a single node by type. Returns the output, next node ids,
   * and the node execution status.
   */
  async executeNode(node: WorkflowNode, context: ExecutionContext): Promise<ExecuteNodeResult> {
    const now = new Date().toISOString();

    switch (node.type) {
      case 'trigger': {
        const nextEdges = getOutgoingEdges(context.workflow.edges, node.id);
        return {
          output: { triggered: true, type: node.config?.type || 'manual' },
          nextNodes: nextEdges.map((e) => e.target),
          status: 'completed',
        };
      }

      case 'action': {
        const action = node.config?.action as string;
        const resolvedConfig = resolveValue(node.config, context);
        if (context.dryRun) {
          return {
            output: { action, dryRun: true, config: resolvedConfig },
            nextNodes: this.getNextNodeIds(node, context),
            status: 'completed',
          };
        }
        // In production, dispatch to the appropriate service.
        // For now, return a structured result.
        return {
          output: { action, executed: true, config: resolvedConfig, timestamp: now },
          nextNodes: this.getNextNodeIds(node, context),
          status: 'completed',
        };
      }

      case 'condition': {
        const config = node.config as unknown as ConditionConfig;
        if (!config?.field) {
          return { output: 'missing_condition_field', nextNodes: [], status: 'failed' };
        }
        const result = evaluateCondition(config, context);
        const handle = result ? 'true' : 'false';
        const nextEdges = getOutgoingEdges(context.workflow.edges, node.id, handle);
        // Fallback: if no handle-specific edge, take any outgoing edge
        const fallbackEdges = nextEdges.length > 0 ? nextEdges : getOutgoingEdges(context.workflow.edges, node.id);
        return {
          output: { condition: result, field: config.field, operator: config.operator },
          nextNodes: fallbackEdges.map((e) => e.target),
          status: 'completed',
        };
      }

      case 'parallel': {
        const branches = (node.config?.branches as Array<{ id: string; nodes: WorkflowNode[] }>) || [];
        const outputs: Record<string, unknown> = {};
        if (context.dryRun) {
          for (const branch of branches) {
            outputs[branch.id] = { dryRun: true, nodeCount: branch.nodes?.length || 0 };
          }
        } else {
          // Execute branches concurrently
          const results = await Promise.all(
            branches.map(async (branch) => {
              let lastOutput: unknown = undefined;
              for (const subNode of branch.nodes || []) {
                const r = await this.executeNode(subNode, context);
                context.nodeOutputs[subNode.id] = r.output;
                lastOutput = r.output;
              }
              return { id: branch.id, output: lastOutput };
            }),
          );
          for (const r of results) outputs[r.id] = r.output;
        }
        return {
          output: { branches: outputs },
          nextNodes: this.getNextNodeIds(node, context),
          status: 'completed',
        };
      }

      case 'loop': {
        const loopType = node.config?.type as string;
        const maxIter = (node.config?.maxIterations as number) || 100;
        const iterations: unknown[] = [];

        if (loopType === 'forEach' || loopType === 'for') {
          const itemsRef = node.config?.items as string;
          let items: unknown[] = [];
          if (itemsRef) {
            const resolved = resolveVariable(`{{${itemsRef}}}`, context);
            if (Array.isArray(resolved)) items = resolved;
          }
          for (let i = 0; i < Math.min(items.length, maxIter); i++) {
            context.variables['__index'] = i;
            context.variables['__item'] = items[i];
            iterations.push({ index: i, item: items[i] });
          }
        } else if (loopType === 'while') {
          const condStr = node.config?.condition as string;
          let i = 0;
          while (i < maxIter) {
            // Simple truthy check on the variable
            const val = condStr ? resolveVariable(`{{${condStr}}}`, context) : undefined;
            if (!val) break;
            iterations.push({ index: i });
            i++;
          }
        }

        return {
          output: { loopType, iterations: iterations.length, items: iterations },
          nextNodes: this.getNextNodeIds(node, context),
          status: 'completed',
        };
      }

      case 'delay': {
        const duration = (node.config?.duration as number) || 0;
        const unit = (node.config?.unit as string) || 'seconds';
        const multipliers: Record<string, number> = {
          seconds: 1000,
          minutes: 60_000,
          hours: 3_600_000,
          days: 86_400_000,
        };
        const ms = duration * (multipliers[unit] || 1000);
        if (!context.dryRun && ms > 0 && ms < 60_000) {
          await new Promise((r) => setTimeout(r, ms));
        }
        return {
          output: { delayed: true, duration, unit, ms },
          nextNodes: this.getNextNodeIds(node, context),
          status: 'completed',
        };
      }

      case 'integration':
      case 'http': {
        const method = (node.config?.method as string) || 'GET';
        const url = resolveValue(node.config?.url, context) as string;
        if (context.dryRun) {
          return {
            output: { integration: true, dryRun: true, method, url },
            nextNodes: this.getNextNodeIds(node, context),
            status: 'completed',
          };
        }
        // In production, make the actual HTTP call.
        return {
          output: { method, url, status: 200, executed: true, timestamp: now },
          nextNodes: this.getNextNodeIds(node, context),
          status: 'completed',
        };
      }

      case 'ai': {
        const prompt = resolveValue(node.config?.prompt, context) as string;
        if (context.dryRun) {
          return {
            output: { ai: true, dryRun: true, prompt: prompt?.slice(0, 200) },
            nextNodes: this.getNextNodeIds(node, context),
            status: 'completed',
          };
        }
        return {
          output: { generated: true, prompt: prompt?.slice(0, 200), model: node.config?.model, timestamp: now },
          nextNodes: this.getNextNodeIds(node, context),
          status: 'completed',
        };
      }

      case 'database': {
        const model = node.config?.model as string;
        const operation = node.config?.operation as string;
        if (context.dryRun) {
          return {
            output: { database: true, dryRun: true, model, operation },
            nextNodes: this.getNextNodeIds(node, context),
            status: 'completed',
          };
        }
        return {
          output: { model, operation, executed: true, timestamp: now },
          nextNodes: this.getNextNodeIds(node, context),
          status: 'completed',
        };
      }

      case 'approval': {
        if (context.dryRun) {
          return {
            output: { approval: true, dryRun: true, approverId: node.config?.approverId },
            nextNodes: this.getNextNodeIds(node, context),
            status: 'completed',
          };
        }
        // Pause execution and wait for approval
        return {
          output: { approval: 'waiting', approverId: node.config?.approverId, message: node.config?.message },
          nextNodes: [],
          status: 'waiting',
        };
      }

      case 'notification': {
        const userId = resolveValue(node.config?.userId, context);
        if (context.dryRun) {
          return {
            output: { notification: true, dryRun: true, userId },
            nextNodes: this.getNextNodeIds(node, context),
            status: 'completed',
          };
        }
        return {
          output: { sent: true, userId, channel: node.config?.channel || 'in_app', timestamp: now },
          nextNodes: this.getNextNodeIds(node, context),
          status: 'completed',
        };
      }

      case 'transform': {
        const expression = node.config?.expression as string;
        const inputVar = node.config?.input as string;
        let inputValue: unknown = undefined;
        if (inputVar) {
          inputValue = resolveVariable(`{{${inputVar}}}`, context);
        }
        // Simple transform: if expression is a JSON mapping, resolve it
        let output: unknown = expression;
        try {
          const parsed = JSON.parse(expression);
          output = resolveValue(parsed, context);
        } catch {
          // Not JSON — treat as a template string
          output = resolveValue(expression, context);
        }
        return {
          output: { transformed: true, input: inputValue, output },
          nextNodes: this.getNextNodeIds(node, context),
          status: 'completed',
        };
      }

      default:
        return {
          output: `unknown_node_type:${node.type}`,
          nextNodes: [],
          status: 'failed',
        };
    }
  },

  /** Get the target node ids from the outgoing edges of a node. */
  getNextNodeIds(node: WorkflowNode, context: ExecutionContext): string[] {
    return getOutgoingEdges(context.workflow.edges, node.id).map((e) => e.target);
  },

  /**
   * Dry-run a workflow without side effects. Returns the expected
   * execution path and per-node outputs.
   */
  async testRun(workflowId: string, testInput?: Record<string, unknown>): Promise<TestRunResult> {
    const start = Date.now();
    const execution = await this.execute(workflowId, testInput, { dryRun: true });
    return {
      nodes: execution.nodeExecutions,
      path: execution.nodeExecutions.map((n) => n.nodeId),
      duration: Date.now() - start,
    };
  },

  /** Get a single execution by id (from the Event table). */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    const event = await safePrisma(
      () => prisma.event.findUnique({ where: { id: executionId } }),
      null,
    );
    if (!event || event.type !== 'workflow_execution') return null;
    return deserializeExecution(event);
  },

  /** List executions for a workflow. */
  async getExecutions(
    workflowId: string,
    opts?: { take?: number; status?: ExecutionStatus },
  ): Promise<WorkflowExecution[]> {
    const take = Math.min(opts?.take || 50, 200);
    const events = await safePrisma(
      () =>
        prisma.event.findMany({
          where: {
            type: 'workflow_execution',
            sourceId: workflowId,
            ...(opts?.status && {
              metadata: { contains: `"status":"${opts.status}"` },
            }),
          },
          orderBy: { createdAt: 'desc' },
          take,
        }),
      [],
    );
    return events
      .map((e) => deserializeExecution(e))
      .filter((e): e is WorkflowExecution => e !== null);
  },

  /** Cancel a running or paused execution. */
  async cancelExecution(executionId: string): Promise<WorkflowExecution | null> {
    const exec = await this.getExecution(executionId);
    if (!exec) return null;
    if (exec.status === 'completed' || exec.status === 'failed' || exec.status === 'cancelled') {
      return exec;
    }
    const updated: WorkflowExecution = {
      ...exec,
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    };
    await safePrisma(
      () =>
        prisma.event.update({
          where: { id: executionId },
          data: {
            content: serializeExecution(updated).slice(0, 10000),
            metadata: JSON.stringify({ workflowId: exec.workflowId, status: 'cancelled' }),
          },
        }),
      null,
    );
    return updated;
  },

  /** Resume an execution that was paused for approval. */
  async resumeExecution(
    executionId: string,
    approvalResult: { approved: boolean; approverId?: string; comment?: string },
  ): Promise<WorkflowExecution | null> {
    const exec = await this.getExecution(executionId);
    if (!exec) return null;
    if (exec.status !== 'waiting_approval' && exec.status !== 'paused') {
      return exec;
    }

    const updated: WorkflowExecution = {
      ...exec,
      status: approvalResult.approved ? 'running' : 'failed',
      completedAt: approvalResult.approved ? undefined : new Date().toISOString(),
      result: approvalResult.approved
        ? { resumed: true, approverId: approvalResult.approverId }
        : { rejected: true, approverId: approvalResult.approverId, comment: approvalResult.comment },
      variables: {
        ...exec.variables,
        __approval: approvalResult,
      },
    };

    // If approved, mark as completed (the rest of the workflow would
    // continue in a full async implementation).
    if (approvalResult.approved) {
      updated.status = 'completed';
      updated.completedAt = new Date().toISOString();
    }

    await safePrisma(
      () =>
        prisma.event.update({
          where: { id: executionId },
          data: {
            content: serializeExecution(updated).slice(0, 10000),
            metadata: JSON.stringify({
              workflowId: exec.workflowId,
              status: updated.status,
              approved: approvalResult.approved,
            }),
          },
        }),
      null,
    );
    return updated;
  },
};
