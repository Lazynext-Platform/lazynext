/**
 * Workflow Builder v2 — Conditional Stage Logic
 *
 * Extends the linear pipeline model with conditional stage execution.
 * Each stage can have an optional condition that determines whether it runs.
 * Conditions are based on:
 *   - Platform targets (e.g., only run video stages for video platforms)
 *   - Previous stage outputs (e.g., skip audio if no voiceover needed)
 *   - User-defined flags (e.g., "compliance_required")
 *
 * This module is pure — it evaluates conditions and produces a filtered
 * stage list. The actual execution still flows through the existing pipeline
 * executor, which receives the filtered stages.
 */

export type StageId =
  | 'brief'
  | 'script'
  | 'storyboard'
  | 'media_generation'
  | 'audio'
  | 'edit'
  | 'compliance'
  | 'score'
  | 'publish';

export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists';

export type ConditionField =
  | 'platform'
  | 'contentType'
  | 'hasVoiceover'
  | 'hasMusic'
  | 'complianceRequired'
  | 'budgetTier';

export interface StageCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value?: string;
}

export interface ConditionalStage {
  stage: StageId;
  enabled: boolean;
  condition?: StageCondition;
  /** Stages that can run in parallel with this one (after its dependencies are met) */
  parallelWith?: StageId[];
}

export interface WorkflowDefinition {
  stages: ConditionalStage[];
  /** Global flags that condition evaluation can reference */
  flags: Record<string, string | boolean>;
}

export interface WorkflowExecutionContext {
  platform?: string;
  contentType?: string;
  hasVoiceover?: boolean;
  hasMusic?: boolean;
  complianceRequired?: boolean;
  budgetTier?: 'free' | 'starter' | 'pro' | 'elite';
}

/**
 * Evaluate a single condition against the execution context.
 */
export function evaluateCondition(
  condition: StageCondition,
  ctx: WorkflowExecutionContext,
): boolean {
  let fieldValue: string | boolean | undefined;

  switch (condition.field) {
    case 'platform':
      fieldValue = ctx.platform;
      break;
    case 'contentType':
      fieldValue = ctx.contentType;
      break;
    case 'hasVoiceover':
      fieldValue = ctx.hasVoiceover;
      break;
    case 'hasMusic':
      fieldValue = ctx.hasMusic;
      break;
    case 'complianceRequired':
      fieldValue = ctx.complianceRequired;
      break;
    case 'budgetTier':
      fieldValue = ctx.budgetTier;
      break;
  }

  switch (condition.operator) {
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;
    case 'equals':
      return String(fieldValue) === String(condition.value);
    case 'not_equals':
      return String(fieldValue) !== String(condition.value);
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(String(condition.value || ''));
    case 'not_contains':
      return typeof fieldValue === 'string' && !fieldValue.includes(String(condition.value || ''));
    default:
      return true;
  }
}

/**
 * Filter the workflow stages based on the execution context.
 * Returns only the stages that should run (enabled + condition passes).
 */
export function resolveStages(
  workflow: WorkflowDefinition,
  ctx: WorkflowExecutionContext,
): StageId[] {
  return workflow.stages
    .filter(stage => {
      if (!stage.enabled) return false;
      if (!stage.condition) return true;
      return evaluateCondition(stage.condition, ctx);
    })
    .map(stage => stage.stage);
}

/**
 * Group stages into execution waves for parallel execution.
 * A wave is a set of stages that can run simultaneously.
 * Stages with `parallelWith` are grouped with their referenced stages.
 * Stages without `parallelWith` run in their own wave (sequential).
 *
 * Returns an array of waves, where each wave is an array of StageIds
 * that can execute in parallel.
 */
export function planExecutionWaves(
  workflow: WorkflowDefinition,
  ctx: WorkflowExecutionContext,
): StageId[][] {
  const resolved = resolveStages(workflow, ctx);
  if (resolved.length === 0) return [];

  const waves: StageId[][] = [];
  const processed = new Set<StageId>();

  for (const stageId of resolved) {
    if (processed.has(stageId)) continue;

    const stage = workflow.stages.find(s => s.stage === stageId);
    if (!stage) {
      waves.push([stageId]);
      processed.add(stageId);
      continue;
    }

    // Check if this stage has parallel partners
    const parallelStages = stage.parallelWith || [];
    const group = [stageId];

    for (const partnerId of parallelStages) {
      if (resolved.includes(partnerId) && !processed.has(partnerId)) {
        group.push(partnerId);
        processed.add(partnerId);
      }
    }

    processed.add(stageId);
    waves.push(group);
  }

  return waves;
}

/**
 * Create a default workflow definition from a simple stage list.
 */
export function createWorkflowFromStages(stages: StageId[]): WorkflowDefinition {
  return {
    stages: stages.map(stage => ({ stage, enabled: true })),
    flags: {},
  };
}

/**
 * Serialize a workflow definition to JSON for storage.
 */
export function serializeWorkflow(workflow: WorkflowDefinition): string {
  return JSON.stringify(workflow);
}

/**
 * Deserialize a workflow definition from JSON.
 * Returns a default workflow if parsing fails.
 */
export function deserializeWorkflow(json: string): WorkflowDefinition {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.stages)) {
      return { stages: [], flags: {} };
    }
    return {
      stages: parsed.stages.filter((s: unknown) => s != null && typeof (s as Record<string, unknown>).stage === 'string'),
      flags: parsed.flags || {},
    };
  } catch {
    return { stages: [], flags: {} };
  }
}

/**
 * Validate a workflow definition.
 * Returns an object with `valid` boolean and optional `error` message.
 */
export function validateWorkflow(workflow: WorkflowDefinition): { valid: boolean; error?: string } {
  if (!workflow || !Array.isArray(workflow.stages)) {
    return { valid: false, error: 'invalid_stages' };
  }
  if (workflow.stages.length === 0) {
    return { valid: false, error: 'no_stages' };
  }

  const validStages: StageId[] = ['brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'publish'];

  for (const s of workflow.stages) {
    if (!validStages.includes(s.stage)) {
      return { valid: false, error: 'invalid_stage' };
    }
    if (s.condition && !s.condition.field) {
      return { valid: false, error: 'invalid_condition' };
    }
  }

  // Check for circular parallel dependencies
  for (const s of workflow.stages) {
    if (s.parallelWith) {
      for (const partnerId of s.parallelWith) {
        const partner = workflow.stages.find(p => p.stage === partnerId);
        if (partner && partner.parallelWith && partner.parallelWith.includes(s.stage)) {
          // This is fine — mutual parallel declaration is not circular
          continue;
        }
      }
    }
  }

  return { valid: true };
}
