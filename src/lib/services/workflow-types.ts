// ── Workflow Builder v2 — Type Definitions ──
// These types define the shape of a visual workflow: nodes, edges,
// variables, execution state, and per-node configuration objects.

// ── Node types ──

export type WorkflowNodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'parallel'
  | 'loop'
  | 'delay'
  | 'integration'
  | 'approval'
  | 'notification'
  | 'transform'
  | 'http'
  | 'ai'
  | 'database';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
  position: WorkflowNodePosition;
}

// ── Edge types ──

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
}

// ── Variables ──

export type WorkflowVariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'date';

export interface WorkflowVariable {
  name: string;
  type: WorkflowVariableType;
  defaultValue?: unknown;
  description?: string;
}

// ── Workflow definition ──

export type WorkflowStatus = 'draft' | 'published' | 'archived';

export interface WorkflowConfig {
  maxConcurrentExecutions?: number;
  timeoutSec?: number;
  retryPolicy?: { maxRetries: number; backoffMs: number };
  onError?: 'stop' | 'continue' | 'notify';
  tags?: string[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  config: WorkflowConfig;
  version: number;
  status: WorkflowStatus;
}

// ── Execution ──

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'waiting_approval';

export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting';

export interface NodeExecution {
  nodeId: string;
  status: NodeExecutionStatus;
  startedAt: string;
  completedAt?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  variables: Record<string, unknown>;
  nodeExecutions: NodeExecution[];
  result?: unknown;
}

// ── Trigger ──

export type WorkflowTriggerType =
  | 'manual'
  | 'schedule'
  | 'event'
  | 'webhook'
  | 'condition';

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  config: Record<string, unknown>;
}

// ── Condition config ──

export type ConditionOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'empty'
  | 'notEmpty';

export interface ConditionConfig {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
  branches: { true: string; false: string };
}

// ── Parallel config ──

export interface ParallelBranch {
  id: string;
  nodes: WorkflowNode[];
}

export interface ParallelConfig {
  branches: ParallelBranch[];
}

// ── Loop config ──

export type LoopType = 'for' | 'while' | 'forEach';

export interface LoopConfig {
  type: LoopType;
  items?: string; // variable reference or literal array
  condition?: string; // for while loops
  maxIterations?: number;
}

// ── Service input types ──

export interface WorkflowCreateInput {
  name: string;
  description?: string;
  workspaceId?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
  config?: WorkflowConfig;
  createdBy: string;
}

export type WorkflowUpdateInput = Partial<Omit<WorkflowCreateInput, 'createdBy'>> & {
  status?: WorkflowStatus;
};

export interface WorkflowListOptions {
  workspaceId?: string;
  status?: WorkflowStatus;
  search?: string;
  take?: number;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

export interface WorkflowStats {
  total: number;
  byStatus: Record<string, number>;
  byTriggerType: Record<string, number>;
  executionCount: number;
}

// ── Execution context ──

export interface ExecutionContext {
  workflow: WorkflowDefinition;
  variables: Record<string, unknown>;
  nodeExecutions: NodeExecution[];
  nodeOutputs: Record<string, unknown>;
  path: string[];
  dryRun: boolean;
}

export interface ExecuteNodeResult {
  output: unknown;
  nextNodes: string[];
  status: NodeExecutionStatus;
}

export interface TestRunResult {
  nodes: NodeExecution[];
  path: string[];
  duration: number;
}
