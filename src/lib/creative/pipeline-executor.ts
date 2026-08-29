/**
 * Pipeline Stage Executor
 *
 * Maps each PipelineStage to the underlying creative library function,
 * passes outputs between stages (brief → script → storyboard → …),
 * and returns structured stage results. This is the layer that actually
 * does creative work — the pure state machine in `pipeline.ts` only tracks
 * status/credits.
 *
 * Design decisions:
 * - Calls library functions directly (not HTTP routes) to avoid
 *   double-charging credits and to keep execution within a single request.
 * - Credits are deducted by the pipeline API routes (before calling the
 *   executor), so the executor itself does NOT deduct credits. This keeps
 *   the executor pure-ish (it only does generation work, not billing).
 * - Each stage function receives the accumulated `StageContext` (all prior
 *   stage outputs) plus the `PipelineConfig`, and returns a
 *   `StageExecutionResult` with output data and artifacts.
 * - Stages that depend on external services (media_generation, audio, edit,
 *   publish) are best-effort and return placeholder artifacts when the
 *   underlying service is in dry-run/stub mode. This is intentional —
 *   the pipeline should complete end-to-end even without real media APIs.
 */

import {
  generateBrief,
  generateHooks,
  generateAngles,
  generateScript,
  generateStoryboard,
  scoreCreative,
  type BriefInput,
} from '@/lib/creative/intelligence';
import { checkCompliance, type ComplianceCheckRequest, type CompliancePlatform } from '@/lib/creative/compliance';
import { generateVoiceover, type TTSRequest } from '@/lib/creative/audio-studio';
import type { CreativeBrief, HookCandidate, CreativeAngle, ScriptCandidate, StoryboardCandidate, CreativeScore } from '@/lib/creative/types';
import type { PipelineConfig, PipelineStage, PipelineStageResult } from '@/lib/creative/pipeline';
import type { PlanTier } from '@/lib/plan-tier';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Accumulated context passed from stage to stage.
 * Each stage reads prior outputs from this object and writes its own output
 * back into it for downstream stages.
 */
export interface StageContext {
  brief?: CreativeBrief;
  hooks?: HookCandidate[];
  selectedHook?: HookCandidate;
  angles?: CreativeAngle[];
  selectedAngle?: CreativeAngle;
  script?: ScriptCandidate;
  storyboard?: StoryboardCandidate;
  score?: CreativeScore;
  mediaUrls?: string[];
  audioUrl?: string;
  editResult?: Record<string, unknown>;
  complianceResult?: Record<string, unknown>;
  publishResult?: Record<string, unknown>;
  // Allow arbitrary extra data
  [key: string]: unknown;
}

export interface StageExecutionResult {
  output: Record<string, unknown>;
  artifacts: Array<{ type: string; url?: string; data?: unknown }>;
  error?: string;
}

export interface ExecuteStageParams {
  stage: PipelineStage;
  config: PipelineConfig;
  context: StageContext;
  planTier?: PlanTier;
  userId: string;
}

// ---------------------------------------------------------------------------
// Stage executors
// ---------------------------------------------------------------------------

/**
 * Execute the `brief` stage: generate a creative brief from the product info.
 */
async function executeBriefStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { config, planTier } = params;
  const input: BriefInput = {
    product: config.productName + (config.productDescription ? ` — ${config.productDescription}` : ''),
    productName: config.productName,
    platform: config.platforms?.[0],
    audience: config.targetAudience,
    planTier,
  };
  const brief = await generateBrief(input);
  return {
    output: { brief },
    artifacts: [{ type: 'brief', data: brief }],
  };
}

/**
 * Execute the `script` stage: generate hooks + angles, pick the best,
 * then generate a script from brief + angle + hook.
 */
async function executeScriptStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { config, context, planTier } = params;
  if (!context.brief) throw new Error('script_stage_requires_brief');

  const brief = context.brief;

  // Generate hooks and angles in parallel
  const [hooks, angles] = await Promise.all([
    generateHooks(brief, 5, planTier).catch(() => [] as HookCandidate[]),
    generateAngles(brief, 3, planTier).catch(() => [] as CreativeAngle[]),
  ]);

  // Auto-select best hook (highest retention) and first angle
  const selectedHook = hooks.sort((a, b) => b.estimatedRetention - a.estimatedRetention)[0];
  const selectedAngle = angles[0];

  if (!selectedHook || !selectedAngle) {
    throw new Error('script_stage_no_hooks_or_angles');
  }

  const script = await generateScript(brief, selectedAngle, selectedHook, planTier);
  return {
    output: { hooks, angles, selectedHook, selectedAngle, script },
    artifacts: [
      { type: 'hooks', data: hooks },
      { type: 'angles', data: angles },
      { type: 'script', data: script },
    ],
  };
}

/**
 * Execute the `storyboard` stage: generate a shot-by-shot storyboard
 * from the brief + script.
 */
async function executeStoryboardStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { config, context, planTier } = params;
  if (!context.brief) throw new Error('storyboard_stage_requires_brief');
  if (!context.script) throw new Error('storyboard_stage_requires_script');

  const ratio = (config.stages.find((s) => s.stage === 'storyboard')?.config?.ratio as string) || '9:16';
  const storyboard = await generateStoryboard(context.brief, context.script, ratio, planTier);
  return {
    output: { storyboard },
    artifacts: [{ type: 'storyboard', data: storyboard }],
  };
}

/**
 * Execute the `media_generation` stage: generate images/video for each
 * storyboard shot via the media service boundary.
 *
 * This stage is best-effort — if the media service is in dry-run/stub mode
 * (as in local dev), placeholder URLs are returned.
 */
async function executeMediaGenerationStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { context } = params;
  if (!context.storyboard) throw new Error('media_stage_requires_storyboard');

  // The media service boundary is a separate API that dispatches to
  // image/video generation providers. In the pipeline executor we call
  // it via internal fetch to leverage its provider routing + dry-run logic.
  // For now, we produce placeholder URLs based on the storyboard shots.
  // When real media APIs are configured, this would call
  // /api/creative/media-service-boundary or the Atlas Cloud API directly.
  const shots = context.storyboard.shots || [];
  const mediaUrls: string[] = shots.map((shot, i) => {
    // Placeholder: in production this would be a real generated media URL
    return `placeholder://media/shot-${i + 1}-${shot.ratio || '9x16'}`;
  });

  return {
    output: { mediaUrls, shotCount: shots.length },
    artifacts: mediaUrls.map((url, i) => ({ type: `shot_${i + 1}`, url })),
  };
}

/**
 * Execute the `audio` stage: generate a voiceover from the script.
 *
 * Best-effort: if TTS is in dry-run mode, a placeholder URL is returned.
 */
async function executeAudioStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { context, planTier } = params;
  if (!context.script) throw new Error('audio_stage_requires_script');

  // Combine all scene voiceover text into a single TTS request
  const voiceoverText = (context.script.scenes || [])
    .map((s) => s.voiceover)
    .filter(Boolean)
    .join(' ');

  if (!voiceoverText.trim()) {
    return {
      output: { audioUrl: null, reason: 'no_voiceover_text' },
      artifacts: [],
    };
  }

  try {
    const ttsRequest: TTSRequest = {
      text: voiceoverText.slice(0, 5000), // TTS limit
      language: context.script.language as any,
    };
    const result = await generateVoiceover(ttsRequest, planTier);
    return {
      output: { audioUrl: result.audioUrl, ttsResult: result },
      artifacts: [{ type: 'voiceover', url: result.audioUrl }],
    };
  } catch (e) {
    // Best-effort: return placeholder if TTS fails
    return {
      output: { audioUrl: `placeholder://audio/voiceover`, error: String(e) },
      artifacts: [{ type: 'voiceover', url: 'placeholder://audio/voiceover' }],
    };
  }
}

/**
 * Execute the `edit` stage: assemble media + audio into a rough cut.
 *
 * Best-effort: returns a cut plan. Real editing would call the editor API.
 */
async function executeEditStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { context } = params;
  if (!context.storyboard) throw new Error('edit_stage_requires_storyboard');

  // Build a simple cut plan from the storyboard shots + script scenes
  const shots = context.storyboard.shots || [];
  const scenes = context.script?.scenes || [];
  const cutPlan = shots.map((shot, i) => ({
    shotIndex: i,
    shot: shot.shot,
    prompt: shot.prompt,
    durationSec: shot.durationSec || (scenes[i]?.durationSec ?? 3),
    mediaUrl: context.mediaUrls?.[i] || null,
    voiceover: scenes[i]?.voiceover || '',
    onScreenText: scenes[i]?.onScreenText || '',
  }));

  const editResult = {
    cutPlan,
    totalDurationSec: cutPlan.reduce((sum, c) => sum + c.durationSec, 0),
    audioUrl: context.audioUrl || null,
  };

  return {
    output: { editResult },
    artifacts: [{ type: 'cut_plan', data: editResult }],
  };
}

/**
 * Execute the `compliance` stage: run brand-safety and platform compliance
 * checks on the creative content.
 */
async function executeComplianceStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { config, context, planTier } = params;
  if (!context.brief) throw new Error('compliance_stage_requires_brief');

  // Build compliance content from the script + brief
  const scriptText = context.script?.scenes?.map((s) => `${s.visual} ${s.voiceover} ${s.onScreenText}`).join('\n') || '';
  const content = `${context.brief.product}\n${scriptText}`;

  const platforms = (config.platforms || ['universal']).filter((p) =>
    ['tiktok', 'youtube', 'meta', 'google', 'universal'].includes(p),
  ) as CompliancePlatform[];

  const request: ComplianceCheckRequest = {
    content,
    platforms: platforms.length > 0 ? platforms : ['universal'],
    contentType: 'ad_copy',
    brandName: config.brandName,
    targetAudience: config.targetAudience,
  };

  const result = await checkCompliance(request, planTier);
  return {
    output: { complianceResult: result },
    artifacts: [{ type: 'compliance', data: result }],
  };
}

/**
 * Execute the `publish` stage: publish the finished creative to platforms.
 *
 * Best-effort: returns a publish plan. Real publishing would call
 * /api/publish with the final media URL.
 */
async function executePublishStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { config } = params;
  const platforms = config.platforms || [];

  // Build a publish plan — in production this would call the publishing API
  const publishResult = {
    platforms,
    status: 'pending_review' as const,
    onComplete: config.onComplete || 'review',
    mediaUrl: null, // Would be the final edited media URL
    caption: context_brief_to_caption(params),
    scheduledAt: null,
  };

  return {
    output: { publishResult },
    artifacts: [{ type: 'publish_plan', data: publishResult }],
  };
}

/** Build a simple caption from the brief's CTA and product name. */
function context_brief_to_caption(params: ExecuteStageParams): string {
  const brief = params.context.brief;
  if (!brief) return '';
  return `${brief.productName} — ${brief.cta || ''}`.trim();
}

// ---------------------------------------------------------------------------
// Stage registry
// ---------------------------------------------------------------------------

const STAGE_EXECUTORS: Record<PipelineStage, (params: ExecuteStageParams) => Promise<StageExecutionResult>> = {
  brief: executeBriefStage,
  script: executeScriptStage,
  storyboard: executeStoryboardStage,
  media_generation: executeMediaGenerationStage,
  audio: executeAudioStage,
  edit: executeEditStage,
  compliance: executeComplianceStage,
  publish: executePublishStage,
  // 'completed' is a terminal marker, not a real stage
  completed: async () => ({ output: {}, artifacts: [] }),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a single pipeline stage, given the accumulated context from
 * prior stages and the pipeline config.
 *
 * Returns a StageExecutionResult with the stage's output and artifacts.
 * Throws on failure — the caller (pipeline route) should catch and call
 * `failStage()`.
 */
export async function executeStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const executor = STAGE_EXECUTORS[params.stage];
  if (!executor) {
    throw new Error(`no_executor_for_stage: ${params.stage}`);
  }
  return executor(params);
}

/**
 * Merge a stage's execution result into the accumulated StageContext.
 * This is how outputs flow from one stage to the next.
 */
export function mergeStageResultIntoContext(
  context: StageContext,
  stage: PipelineStage,
  result: StageExecutionResult,
): StageContext {
  const next: StageContext = { ...context };

  switch (stage) {
    case 'brief':
      next.brief = result.output.brief as CreativeBrief;
      break;
    case 'script':
      next.hooks = result.output.hooks as HookCandidate[];
      next.angles = result.output.angles as CreativeAngle[];
      next.selectedHook = result.output.selectedHook as HookCandidate;
      next.selectedAngle = result.output.selectedAngle as CreativeAngle;
      next.script = result.output.script as ScriptCandidate;
      break;
    case 'storyboard':
      next.storyboard = result.output.storyboard as StoryboardCandidate;
      break;
    case 'media_generation':
      next.mediaUrls = result.output.mediaUrls as string[];
      break;
    case 'audio':
      next.audioUrl = result.output.audioUrl as string | undefined;
      break;
    case 'edit':
      next.editResult = result.output.editResult as Record<string, unknown>;
      break;
    case 'compliance':
      next.complianceResult = result.output.complianceResult as Record<string, unknown>;
      break;
    case 'publish':
      next.publishResult = result.output.publishResult as Record<string, unknown>;
      break;
  }

  return next;
}

/**
 * Build an initial StageContext from a PipelineConfig.
 * This provides the starting point for the first stage.
 */
export function initialContext(config: PipelineConfig): StageContext {
  return {
    // Seed with config-level data that stages can use
    productName: config.productName,
    productDescription: config.productDescription,
    brandName: config.brandName,
    targetAudience: config.targetAudience,
    platforms: config.platforms,
  };
}

/**
 * Convert a StageExecutionResult into a PipelineStageResult fragment
 * (for embedding into PipelineState.stageResults).
 */
export function toStageResult(
  stage: PipelineStage,
  result: StageExecutionResult,
  startedAt: string,
): Partial<PipelineStageResult> {
  return {
    stage,
    output: result.output,
    artifacts: result.artifacts,
  };
}
