/**
 * Creative Pipeline Orchestrator
 *
 * End-to-end pipeline: brief → script → storyboard → image/video generation →
 * audio → edit → publish. Ties all existing tools into one automated workflow
 * with progress tracking and handoff between stages.
 *
 * This module is self-contained and pure: it produces/transforms PipelineState
 * objects without side effects. Persistence, credit deduction, and actual
 * generation work happen in the API routes that call these functions.
 */

export type PipelineStage =
  | 'brief'
  | 'script'
  | 'storyboard'
  | 'media_generation'
  | 'audio'
  | 'edit'
  | 'compliance'
  | 'score'
  | 'publish'
  | 'completed';

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export type PipelineStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed';

export interface PipelineStageConfig {
  stage: PipelineStage;
  enabled: boolean;
  autoAdvance: boolean;
  config: Record<string, unknown>; // stage-specific configuration
}

export interface PipelineStageResult {
  stage: PipelineStage;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  output: Record<string, unknown>; // stage output data
  error?: string;
  artifacts: Array<{ type: string; url?: string; data?: unknown }>;
  /** Whether credits have been deducted for this stage's current execution. Prevents double-charging on re-advance/retry. Reset to false by retryStage. */
  charged?: boolean;
}

export interface PipelineConfig {
  name: string;
  productName: string;
  productDescription?: string;
  brandName?: string;
  targetAudience?: string;
  platforms?: string[];
  stages: PipelineStageConfig[];
  onComplete?: 'publish' | 'review' | 'export';
}

export interface PipelineState {
  pipelineId: string;
  config: PipelineConfig;
  status: PipelineStatus;
  currentStage: PipelineStage | null;
  stageResults: PipelineStageResult[];
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  estimatedTimeRemaining?: number;
  totalCreditsUsed: number;
  /** Optimistic locking version — incremented on every state mutation.
   *  savePipeline uses this in a conditional update to prevent concurrent
   *  requests from clobbering each other's changes. */
  version: number;
}

export interface PipelineTemplate {
  templateId: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  defaultConfig: Partial<PipelineConfig>;
  estimatedCredits: number;
  estimatedDurationMin: number;
}

/**
 * Canonical order of pipeline stages (excluding the terminal 'completed' marker).
 * Stages may be reordered/skipped per-template, but this defines the base order
 * used for progress calculation and validation.
 */
export const STAGE_ORDER: PipelineStage[] = [
  'brief',
  'script',
  'storyboard',
  'media_generation',
  'audio',
  'edit',
  'compliance',
  'score',
  'publish',
];

/**
 * Credit cost per stage. 'completed' is a terminal marker and costs nothing.
 */
export const PIPELINE_COSTS: Record<PipelineStage, number> = {
  brief: 2,
  script: 3,
  storyboard: 3,
  media_generation: 5,
  audio: 3,
  edit: 2,
  compliance: 4,
  score: 2,
  publish: 3,
  completed: 0,
};

/**
 * Human-readable metadata for each stage.
 */
const STAGE_META: Record<PipelineStage, { name: string; description: string; estimatedDurationSec: number }> = {
  brief: {
    name: 'Brief',
    description: 'Generate a creative brief from the product description and target audience.',
    estimatedDurationSec: 15,
  },
  script: {
    name: 'Script',
    description: 'Produce a hook, angle, and full ad script from the brief.',
    estimatedDurationSec: 20,
  },
  storyboard: {
    name: 'Storyboard',
    description: 'Break the script into a shot-by-shot storyboard with visual direction.',
    estimatedDurationSec: 25,
  },
  media_generation: {
    name: 'Media Generation',
    description: 'Generate images and/or video for each storyboard shot.',
    estimatedDurationSec: 90,
  },
  audio: {
    name: 'Audio',
    description: 'Generate voiceover, music, and sound design for the ad.',
    estimatedDurationSec: 45,
  },
  edit: {
    name: 'Edit',
    description: 'Assemble media + audio into a rough cut and apply transitions.',
    estimatedDurationSec: 30,
  },
  compliance: {
    name: 'Compliance',
    description: 'Run brand-safety and platform compliance checks on the creative.',
    estimatedDurationSec: 20,
  },
  score: {
    name: 'Score',
    description: 'Evaluate creative quality with multi-dimensional scoring.',
    estimatedDurationSec: 15,
  },
  publish: {
    name: 'Publish',
    description: 'Publish the finished ad to the selected platforms.',
    estimatedDurationSec: 15,
  },
  completed: {
    name: 'Completed',
    description: 'Pipeline finished successfully.',
    estimatedDurationSec: 0,
  },
};

/**
 * Built-in pipeline templates.
 */
export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    templateId: 'full-creative',
    name: 'Full Creative Pipeline',
    description:
      'The complete end-to-end workflow: brief, script, storyboard, media generation, audio, edit, compliance, scoring, and publish.',
    stages: ['brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'score', 'publish'],
    defaultConfig: {
      name: 'Full Creative Pipeline',
      onComplete: 'publish',
    },
    estimatedCredits: 27,
    estimatedDurationMin: 5,
  },
  {
    templateId: 'quick-ad',
    name: 'Quick Ad Generator',
    description:
      'Fast path from brief to a published ad. Skips audio, edit, and compliance for maximum speed. Includes quality scoring.',
    stages: ['brief', 'script', 'storyboard', 'media_generation', 'score', 'publish'],
    defaultConfig: {
      name: 'Quick Ad',
      onComplete: 'publish',
    },
    estimatedCredits: 18,
    estimatedDurationMin: 3,
  },
  {
    templateId: 'video-ad',
    name: 'Video Ad Pipeline',
    description:
      'Full video production: brief, script, storyboard, media, audio, edit, and publish. Ideal for short-form video ads.',
    stages: ['brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'score', 'publish'],
    defaultConfig: {
      name: 'Video Ad',
      onComplete: 'publish',
    },
    estimatedCredits: 23,
    estimatedDurationMin: 4,
  },
  {
    templateId: 'compliance-first',
    name: 'Compliance-First Pipeline',
    description:
      'Runs compliance checks both after scripting and before publishing, for regulated industries and brand-sensitive campaigns.',
    stages: [
      'brief',
      'script',
      'compliance',
      'storyboard',
      'media_generation',
      'compliance',
      'score',
      'publish',
    ],
    defaultConfig: {
      name: 'Compliance-First Ad',
      onComplete: 'review',
    },
    estimatedCredits: 26,
    estimatedDurationMin: 5,
  },
  {
    templateId: 'ugc',
    name: 'UGC Pipeline',
    description:
      'User-generated-content style pipeline: brief, script, media generation, audio, scoring, and publish. Lightweight and authentic.',
    stages: ['brief', 'script', 'media_generation', 'audio', 'score', 'publish'],
    defaultConfig: {
      name: 'UGC Ad',
      onComplete: 'publish',
    },
    estimatedCredits: 18,
    estimatedDurationMin: 3,
  },
  {
    templateId: 'creative-studio-chain',
    name: 'Creative Studio Chain',
    description:
      'Step-by-step creative chain: brief, script (hooks + angles + script), storyboard, and quality scoring. ' +
      'No media generation or publishing — ideal for ideation and creative strategy. ' +
      'Used by the Creative Studio chain mode for durable persistence and auto-advance.',
    stages: ['brief', 'script', 'storyboard', 'score'],
    defaultConfig: {
      name: 'Creative Studio Chain',
      onComplete: 'review',
    },
    estimatedCredits: 10,
    estimatedDurationMin: 2,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a reasonably-unique pipeline id without external deps. */
function generatePipelineId(): string {
  return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** All valid (non-terminal) stage identifiers. */
const VALID_STAGES = new Set<PipelineStage>(STAGE_ORDER);

function isValidStage(stage: unknown): stage is PipelineStage {
  return typeof stage === 'string' && VALID_STAGES.has(stage as PipelineStage);
}

/** Build a default stage config for a stage. */
function defaultStageConfig(stage: PipelineStage): PipelineStageConfig {
  return { stage, enabled: true, autoAdvance: true, config: {} };
}

/** Build the full default stage config list (all stages enabled). */
function defaultStageConfigs(): PipelineStageConfig[] {
  return STAGE_ORDER.map(defaultStageConfig);
}

/** Find a stage config by stage id. */
function findStageConfig(state: PipelineState, stage: PipelineStage): PipelineStageConfig | undefined {
  return state.config.stages.find((s) => s.stage === stage);
}

/** Find a stage result by stage id. */
function findStageResult(state: PipelineState, stage: PipelineStage): PipelineStageResult | undefined {
  return state.stageResults.find((r) => r.stage === stage);
}

/** The ordered list of enabled stages (respecting config order). */
export function enabledStages(state: PipelineState): PipelineStage[] {
  return state.config.stages.filter((s) => s.enabled).map((s) => s.stage);
}

/** Sum of costs for all enabled stages. */
export function totalEstimatedCredits(state: PipelineState): number {
  return enabledStages(state).reduce((sum, s) => sum + PIPELINE_COSTS[s], 0);
}

/** Sum of costs for all enabled stages excluding the publish stage.
 *  Since publish defaults to autoAdvance=false (user must approve), this
 *  represents the credits consumed before the user is asked to approve publishing.
 */
export function preApprovalEstimatedCredits(state: PipelineState): number {
  return enabledStages(state)
    .filter((s) => s !== 'publish')
    .reduce((sum, s) => sum + PIPELINE_COSTS[s], 0);
}

/** Pre-approval credits for a template (excludes publish cost). */
export function templatePreApprovalCredits(templateId: string): number {
  const tmpl = PIPELINE_TEMPLATES.find((t) => t.templateId === templateId);
  if (!tmpl) return 0;
  return tmpl.stages
    .filter((s) => s !== 'publish')
    .reduce((sum, s) => sum + (PIPELINE_COSTS[s as PipelineStage] ?? 0), 0);
}

/** Sum of estimated durations (seconds) for all enabled stages. */
function totalEstimatedDurationSec(state: PipelineState): number {
  return enabledStages(state).reduce((sum, s) => sum + STAGE_META[s].estimatedDurationSec, 0);
}

/** ISO timestamp helper. */
function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a pipeline config. Returns { valid, errors }.
 */
export function validatePipelineConfig(config: PipelineConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['config_required'] };
  }

  if (!config.name || typeof config.name !== 'string' || !config.name.trim()) {
    errors.push('name_required');
  } else if (config.name.trim().length > 200) {
    errors.push('name_too_long');
  }

  if (!config.productName || typeof config.productName !== 'string' || !config.productName.trim()) {
    errors.push('product_name_required');
  }

  if (!Array.isArray(config.stages) || config.stages.length === 0) {
    errors.push('stages_required');
  } else {
    const enabled = config.stages.filter((s) => s && s.enabled);
    if (enabled.length === 0) {
      errors.push('no_stages_enabled');
    }
    for (const s of config.stages) {
      if (!s || !isValidStage(s.stage)) {
        errors.push(`invalid_stage: ${String(s?.stage)}`);
      }
    }
  }

  if (config.onComplete && !['publish', 'review', 'export'].includes(config.onComplete)) {
    errors.push('invalid_on_complete');
  }

  if (config.platforms && !Array.isArray(config.platforms)) {
    errors.push('platforms_must_be_array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create a new pipeline state from a config.
 * Initializes all stages as 'pending', sets status to 'draft', and computes
 * initial progress (0).
 */
export function createPipeline(config: PipelineConfig): PipelineState {
  const ts = nowIso();
  const stageResults: PipelineStageResult[] = config.stages.map((s) => ({
    stage: s.stage,
    status: 'pending',
    output: {},
    artifacts: [],
    charged: false,
  }));

  const state: PipelineState = {
    pipelineId: generatePipelineId(),
    config,
    status: 'draft',
    currentStage: null,
    stageResults,
    progress: 0,
    createdAt: ts,
    updatedAt: ts,
    totalCreditsUsed: 0,
    version: 0,
  };

  state.estimatedTimeRemaining = totalEstimatedDurationSec(state);
  return state;
}

/**
 * Advance the pipeline by one step: move the current stage to 'completed'
 * (if any) and start the next enabled, non-skipped stage.
 *
 * If the current stage is 'in_progress', it is marked 'completed' and its
 * cost is added to totalCreditsUsed. The next pending enabled stage becomes
 * 'in_progress' and currentStage. If there is no next stage, the pipeline is
 * marked 'completed'.
 *
 * This function is pure: it returns a new state object and does not perform
 * any generation. The caller is responsible for actually running the stage
 * work and calling advancePipeline again when done.
 */
export function advancePipeline(state: PipelineState): PipelineState {
  const next: PipelineState = {
    ...state,
    stageResults: state.stageResults.map((r) => ({ ...r, artifacts: [...r.artifacts], output: { ...r.output } })),
    config: { ...state.config, stages: state.config.stages.map((s) => ({ ...s, config: { ...s.config } })) },
  };

  // Complete the current in-progress stage.
  if (next.currentStage) {
    const cur = findStageResult(next, next.currentStage);
    if (cur && cur.status === 'in_progress') {
      cur.status = 'completed';
      cur.completedAt = nowIso();
      if (cur.startedAt) {
        cur.duration = Math.round((Date.parse(cur.completedAt) - Date.parse(cur.startedAt)) / 1000);
      }
      next.totalCreditsUsed += PIPELINE_COSTS[next.currentStage] ?? 0;
    }
  }

  // Find the next stage to run: the first enabled stage whose result is 'pending'.
  const stages = next.config.stages.filter((s) => s.enabled);
  const nextStage = stages.find((s) => {
    const r = findStageResult(next, s.stage);
    return r?.status === 'pending';
  })?.stage;

  if (nextStage) {
    const r = findStageResult(next, nextStage);
    if (r) {
      r.status = 'in_progress';
      r.startedAt = nowIso();
    }
    next.currentStage = nextStage;
    next.status = 'running';
  } else {
    // No more pending stages — pipeline complete.
    next.currentStage = 'completed' as PipelineStage;
    next.status = 'completed';
  }

  next.progress = calculateProgress(next);
  next.updatedAt = nowIso();
  next.estimatedTimeRemaining = computeTimeRemaining(next);
  return next;
}

/**
 * Calculate progress (0-100) based on the ratio of completed/skipped stages
 * to total enabled stages.
 */
export function calculateProgress(state: PipelineState): number {
  const enabled = state.config.stages.filter((s) => s.enabled);
  if (enabled.length === 0) return 0;
  const done = enabled.filter((s) => {
    const r = findStageResult(state, s.stage);
    return r?.status === 'completed' || r?.status === 'skipped';
  }).length;
  return Math.round((done / enabled.length) * 100);
}

/** Estimate remaining seconds based on remaining pending/in-progress stages. */
function computeTimeRemaining(state: PipelineState): number {
  const enabled = state.config.stages.filter((s) => s.enabled);
  let remaining = 0;
  for (const s of enabled) {
    const r = findStageResult(state, s.stage);
    if (r && (r.status === 'pending' || r.status === 'in_progress')) {
      remaining += STAGE_META[s.stage].estimatedDurationSec;
    }
  }
  return remaining;
}

/**
 * Return the list of built-in pipeline templates.
 */
export function getPipelineTemplates(): PipelineTemplate[] {
  return PIPELINE_TEMPLATES;
}

/**
 * Return the canonical stage order.
 */
export function getStageOrder(): PipelineStage[] {
  return [...STAGE_ORDER];
}

/**
 * Return metadata (name, description, cost, estimated duration) for a stage.
 */
export function getStageConfig(stage: PipelineStage): {
  name: string;
  description: string;
  cost: number;
  estimatedDurationSec: number;
} {
  const meta = STAGE_META[stage];
  return {
    name: meta.name,
    description: meta.description,
    cost: PIPELINE_COSTS[stage] ?? 0,
    estimatedDurationSec: meta.estimatedDurationSec,
  };
}

/**
 * Whether a stage can be skipped. A stage can be skipped if it is currently
 * pending or failed (not yet completed/skipped) and it is enabled. The
 * terminal 'completed' marker can never be skipped.
 */
export function canSkipStage(stage: PipelineStage, state: PipelineState): boolean {
  if (stage === 'completed') return false;
  const cfg = findStageConfig(state, stage);
  if (!cfg || !cfg.enabled) return false;
  const r = findStageResult(state, stage);
  if (!r) return false;
  return r.status === 'pending' || r.status === 'failed' || r.status === 'in_progress';
}

/**
 * Mark a stage as skipped. Returns a new state. If the skipped stage was the
 * current stage, the pipeline advances to the next pending enabled stage.
 */
export function skipStage(state: PipelineState, stage: PipelineStage): PipelineState {
  if (!canSkipStage(stage, state)) return state;

  const next: PipelineState = {
    ...state,
    stageResults: state.stageResults.map((r) =>
      r.stage === stage
        ? { ...r, status: 'skipped' as StageStatus, completedAt: nowIso(), artifacts: [...r.artifacts], output: { ...r.output } }
        : { ...r, artifacts: [...r.artifacts], output: { ...r.output } },
    ),
    config: { ...state.config, stages: state.config.stages.map((s) => ({ ...s, config: { ...s.config } })) },
  };

  // If we skipped the current stage, advance to the next pending one.
  if (next.currentStage === stage) {
    const stages = next.config.stages.filter((s) => s.enabled);
    const nextStage = stages.find((s) => {
      const r = findStageResult(next, s.stage);
      return r?.status === 'pending';
    })?.stage;

    if (nextStage) {
      const r = findStageResult(next, nextStage);
      if (r) {
        r.status = 'in_progress';
        r.startedAt = nowIso();
      }
      next.currentStage = nextStage;
      next.status = 'running';
    } else {
      next.currentStage = 'completed' as PipelineStage;
      next.status = 'completed';
    }
  }

  next.progress = calculateProgress(next);
  next.updatedAt = nowIso();
  next.estimatedTimeRemaining = computeTimeRemaining(next);
  return next;
}

/**
 * Retry a failed stage: reset it to 'in_progress' and clear its error.
 * Returns a new state. Only stages that are currently 'failed' can be retried.
 */
export function retryStage(state: PipelineState, stage: PipelineStage): PipelineState {
  const r = findStageResult(state, stage);
  if (!r || r.status !== 'failed') return state;

  const next: PipelineState = {
    ...state,
    stageResults: state.stageResults.map((res) =>
      res.stage === stage
        ? {
            ...res,
            status: 'in_progress' as StageStatus,
            startedAt: nowIso(),
            completedAt: undefined,
            duration: undefined,
            error: undefined,
            charged: false, // Reset charged flag so retry can re-charge
            artifacts: [...res.artifacts],
            output: { ...res.output },
          }
        : { ...res, artifacts: [...res.artifacts], output: { ...res.output } },
    ),
    config: { ...state.config, stages: state.config.stages.map((s) => ({ ...s, config: { ...s.config } })) },
  };

  next.currentStage = stage;
  next.status = 'running';
  next.progress = calculateProgress(next);
  next.updatedAt = nowIso();
  next.estimatedTimeRemaining = computeTimeRemaining(next);
  return next;
}

/**
 * Mark a stage as failed (used by API routes when a stage's work throws).
 * Returns a new state with the stage status set to 'failed' and the pipeline
 * status set to 'paused' (so the user can retry or skip).
 */
export function failStage(state: PipelineState, stage: PipelineStage, error: string): PipelineState {
  const next: PipelineState = {
    ...state,
    stageResults: state.stageResults.map((res) =>
      res.stage === stage
        ? {
            ...res,
            status: 'failed' as StageStatus,
            completedAt: nowIso(),
            error,
            artifacts: [...res.artifacts],
            output: { ...res.output },
          }
        : { ...res, artifacts: [...res.artifacts], output: { ...res.output } },
    ),
    config: { ...state.config, stages: state.config.stages.map((s) => ({ ...s, config: { ...s.config } })) },
  };

  next.status = 'paused';
  next.progress = calculateProgress(next);
  next.updatedAt = nowIso();
  next.estimatedTimeRemaining = computeTimeRemaining(next);
  return next;
}

/**
 * Mark a single stage as completed without advancing the pipeline.
 * Used when a parallel wave has partial success: successful stages are
 * marked completed individually before failStage is called for the failed one.
 * This prevents the next advance from re-executing and re-charging them.
 */
export function completeStage(state: PipelineState, stage: PipelineStage): PipelineState {
  const next: PipelineState = {
    ...state,
    stageResults: state.stageResults.map((res) =>
      res.stage === stage
        ? {
            ...res,
            status: 'completed' as StageStatus,
            completedAt: nowIso(),
            charged: false,
            artifacts: [...res.artifacts],
            output: { ...res.output },
          }
        : { ...res, artifacts: [...res.artifacts], output: { ...res.output } },
    ),
    config: { ...state.config, stages: state.config.stages.map((s) => ({ ...s, config: { ...s.config } })) },
  };
  next.totalCreditsUsed += PIPELINE_COSTS[stage] ?? 0;
  next.progress = calculateProgress(next);
  next.updatedAt = nowIso();
  next.estimatedTimeRemaining = computeTimeRemaining(next);
  return next;
}

/**
 * Pause a running pipeline. Returns a new state with status 'paused'.
 */
export function pausePipeline(state: PipelineState): PipelineState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused', updatedAt: nowIso() };
}

/**
 * Resume a paused pipeline. Returns a new state with status 'running'.
 */
export function resumePipeline(state: PipelineState): PipelineState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'running', updatedAt: nowIso() };
}

/**
 * Cancel a pipeline. Returns a new state with status 'failed' and a terminal
 * marker. No further stages will run.
 */
export function cancelPipeline(state: PipelineState): PipelineState {
  return {
    ...state,
    status: 'failed',
    updatedAt: nowIso(),
    estimatedTimeRemaining: 0,
  };
}

/**
 * Build a PipelineConfig from a template id, merging in user overrides.
 */
export function configFromTemplate(templateId: string, overrides: Partial<PipelineConfig> = {}): PipelineConfig | null {
  const tmpl = PIPELINE_TEMPLATES.find((t) => t.templateId === templateId);
  if (!tmpl) return null;

  const onComplete = tmpl.defaultConfig.onComplete ?? 'publish';
  const stages: PipelineStageConfig[] = tmpl.stages.map((stage) => ({
    stage,
    enabled: true,
    // Never auto-advance past the publish stage — user must explicitly approve
    // publishing to avoid accidental live posts. This applies regardless of
    // whether onComplete is 'publish' or 'review'.
    autoAdvance: stage === 'publish' ? false : true,
    config: {},
  }));

  const base: PipelineConfig = {
    name: tmpl.defaultConfig.name ?? tmpl.name,
    productName: '',
    productDescription: undefined,
    brandName: undefined,
    targetAudience: undefined,
    platforms: undefined,
    onComplete,
    stages,
  };

  const { stages: _omit, ...baseWithoutStages } = base;
  return { ...baseWithoutStages, ...overrides, stages: overrides.stages ?? stages };
}

// ---------------------------------------------------------------------------
// Workflow Definition Integration (v2)
// ---------------------------------------------------------------------------

/**
 * Build a PipelineConfig from a WorkflowDefinition + execution context.
 *
 * This is the bridge between the Workflow Builder v2 UI (which produces
 * conditional/parallel stage configs) and the pipeline executor (which
 * consumes PipelineConfig). Stages whose conditions don't pass are set
 * to enabled=false so the executor skips them. Parallel groups are
 * preserved via the `parallelWith` field on PipelineStageConfig.
 */
export function configFromWorkflow(
  workflow: { stages: Array<{ stage: string; enabled: boolean; condition?: { field: string; operator: string; value?: string }; parallelWith?: string[] }> },
  ctx: { platform?: string; contentType?: string; hasVoiceover?: boolean; hasMusic?: boolean; complianceRequired?: boolean; budgetTier?: string },
  base: Partial<PipelineConfig> = {},
): PipelineConfig | null {
  if (!workflow || !Array.isArray(workflow.stages) || workflow.stages.length === 0) {
    return null;
  }

  // Evaluate conditions to determine which stages are enabled
  const wfOnComplete = base.onComplete || 'publish';

  const stages: PipelineStageConfig[] = workflow.stages.map((s) => {
    const stageId = s.stage as PipelineStage;
    let enabled = s.enabled !== false;
    if (enabled && s.condition) {
      enabled = evaluateWorkflowCondition(s.condition, ctx);
    }

    return {
      stage: stageId,
      enabled,
      // Never auto-advance past the publish stage — user must explicitly approve
      // publishing to avoid accidental live posts. This applies regardless of
      // whether onComplete is 'publish' or 'review'.
      autoAdvance: stageId === 'publish' ? false : true,
      config: {},
      parallelWith: s.parallelWith as PipelineStage[] | undefined,
    } as PipelineStageConfig & { parallelWith?: PipelineStage[] };
  });

  return {
    name: base.name || 'Workflow Pipeline',
    productName: base.productName || '',
    productDescription: base.productDescription,
    brandName: base.brandName,
    targetAudience: base.targetAudience,
    platforms: base.platforms,
    stages,
    onComplete: wfOnComplete,
  };
}

/**
 * Evaluate a workflow condition against an execution context.
 * Extracted here to avoid importing the full workflow-conditions module
 * (keeps the pipeline module self-contained).
 */
function evaluateWorkflowCondition(
  condition: { field: string; operator: string; value?: string },
  ctx: { platform?: string; contentType?: string; hasVoiceover?: boolean; hasMusic?: boolean; complianceRequired?: boolean; budgetTier?: string },
): boolean {
  let fieldValue: string | boolean | undefined;
  switch (condition.field) {
    case 'platform': fieldValue = ctx.platform; break;
    case 'contentType': fieldValue = ctx.contentType; break;
    case 'hasVoiceover': fieldValue = ctx.hasVoiceover; break;
    case 'hasMusic': fieldValue = ctx.hasMusic; break;
    case 'complianceRequired': fieldValue = ctx.complianceRequired; break;
    case 'budgetTier': fieldValue = ctx.budgetTier; break;
  }

  switch (condition.operator) {
    case 'exists': return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists': return fieldValue === undefined || fieldValue === null;
    case 'equals': return String(fieldValue) === String(condition.value);
    case 'not_equals': return String(fieldValue) !== String(condition.value);
    case 'contains': return typeof fieldValue === 'string' && fieldValue.includes(String(condition.value || ''));
    case 'not_contains': return typeof fieldValue === 'string' && !fieldValue.includes(String(condition.value || ''));
    default: return true;
  }
}

/**
 * Advance the pipeline, supporting parallel wave execution.
 *
 * When the current stage has `parallelWith` partners, all parallel stages
 * in the wave are marked 'in_progress' simultaneously. The pipeline only
 * advances to the next wave when ALL stages in the current wave complete.
 *
 * For non-parallel stages, behavior is identical to advancePipeline.
 */
export function advancePipelineWithWaves(state: PipelineState): PipelineState {
  const next: PipelineState = {
    ...state,
    stageResults: state.stageResults.map((r) => ({ ...r, artifacts: [...r.artifacts], output: { ...r.output } })),
    config: { ...state.config, stages: state.config.stages.map((s) => ({ ...s, config: { ...s.config } })) },
  };

  // Complete all in-progress stages
  const inProgressStages = next.stageResults.filter((r) => r.status === 'in_progress');
  for (const cur of inProgressStages) {
    cur.status = 'completed';
    cur.completedAt = nowIso();
    if (cur.startedAt) {
      cur.duration = Math.round((Date.parse(cur.completedAt) - Date.parse(cur.startedAt)) / 1000);
    }
    next.totalCreditsUsed += PIPELINE_COSTS[cur.stage] ?? 0;
  }

  // Check if all stages in the current wave are done
  const allWaveDone = inProgressStages.every((r) => r.status === 'completed');
  if (!allWaveDone) {
    // Some parallel stages still running — don't advance yet
    next.progress = calculateProgress(next);
    next.updatedAt = nowIso();
    return next;
  }

  // Find the next stage(s) to run
  const enabledStages = next.config.stages.filter((s) => s.enabled);
  const nextStage = enabledStages.find((s) => {
    const r = findStageResult(next, s.stage);
    return r?.status === 'pending';
  });

  if (nextStage) {
    // Check for parallel partners
    const stageConfig = next.config.stages.find((s) => s.stage === nextStage.stage);
    const parallelPartners = (stageConfig as PipelineStageConfig & { parallelWith?: PipelineStage[] })?.parallelWith;

    const wave: PipelineStage[] = [nextStage.stage];
    if (parallelPartners && parallelPartners.length > 0) {
      for (const partner of parallelPartners) {
        const partnerResult = findStageResult(next, partner);
        if (partnerResult && partnerResult.status === 'pending') {
          wave.push(partner);
        }
      }
    }

    // Start all stages in the wave
    for (const stage of wave) {
      const r = findStageResult(next, stage);
      if (r) {
        r.status = 'in_progress';
        r.startedAt = nowIso();
      }
    }
    next.currentStage = wave[0]; // Primary stage for compatibility
    next.status = 'running';
  } else {
    next.currentStage = 'completed' as PipelineStage;
    next.status = 'completed';
  }

  next.progress = calculateProgress(next);
  next.updatedAt = nowIso();
  next.estimatedTimeRemaining = computeTimeRemaining(next);
  return next;
}
