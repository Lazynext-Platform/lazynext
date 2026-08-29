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
import { dispatchMediaService, type MediaCapability } from '@/lib/creative/media-service-boundary';
import { publishContent } from '@/lib/publishing/publisher';
import type { PublishRequest, PublishPlatform } from '@/lib/publishing/types';
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
  editResult?: import('./types').EditResult;
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
 * Calls `dispatchMediaService` with `video_gen` capability for each shot,
 * using the shot's prompt as the generation text. When Atlas Cloud is
 * configured, this produces real video/image URLs. In dry-run mode (local
 * dev), placeholder data URLs are returned.
 *
 * Shots are processed sequentially to avoid overwhelming the generation API.
 * Each shot's result includes the URL and whether it was a dry-run.
 */
async function executeMediaGenerationStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { context, planTier } = params;
  if (!context.storyboard) throw new Error('media_stage_requires_storyboard');

  const shots = context.storyboard.shots || [];
  const mediaUrls: string[] = [];
  const mediaResults: Array<{ shotIndex: number; url: string; dryRun: boolean; capability: string }> = [];

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    try {
      const output = await dispatchMediaService({
        capability: 'video_gen' as MediaCapability,
        input: {
          text: shot.prompt || shot.shot || `Shot ${i + 1}`,
          options: {
            duration: shot.durationSec || 4,
            resolution: '720p',
          },
        },
        planTier: planTier || 'free',
      });
      const url = (output.result.videoUrl as string) || (output.result.imageUrl as string) || '';
      mediaUrls.push(url);
      mediaResults.push({
        shotIndex: i,
        url,
        dryRun: output.dryRun,
        capability: output.capability,
      });
    } catch {
      // Best-effort: placeholder if generation fails
      const placeholderUrl = `placeholder://media/shot-${i + 1}-${shot.ratio || '9x16'}`;
      mediaUrls.push(placeholderUrl);
      mediaResults.push({
        shotIndex: i,
        url: placeholderUrl,
        dryRun: true,
        capability: 'video_gen',
      });
    }
  }

  return {
    output: { mediaUrls, shotCount: shots.length, mediaResults },
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
 * Builds an Edit Decision List (EDL) from the storyboard shots, script scenes,
 * generated media URLs, and voiceover audio. The EDL references the real
 * media URLs from the media_generation stage and the audio URL from the
 * audio stage. A future rendering service would consume this EDL to produce
 * the final video file.
 *
 * If media URLs are available, the first one is used as the `finalMediaUrl`
 * (representing the primary asset for publishing).
 */
async function executeEditStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { context } = params;
  if (!context.storyboard) throw new Error('edit_stage_requires_storyboard');

  const shots = context.storyboard.shots || [];
  const scenes = context.script?.scenes || [];
  const mediaUrls = context.mediaUrls || [];
  const audioUrl = context.audioUrl || null;

  // Build EDL with real media references
  const cutPlan = shots.map((shot, i) => ({
    shotIndex: i,
    shot: shot.shot,
    prompt: shot.prompt,
    durationSec: shot.durationSec || (scenes[i]?.durationSec ?? 3),
    mediaUrl: mediaUrls[i] || null,
    voiceover: scenes[i]?.voiceover || '',
    onScreenText: scenes[i]?.onScreenText || '',
    transition: i < shots.length - 1 ? 'cut' : 'fade_out',
  }));

  const totalDurationSec = cutPlan.reduce((sum, c) => sum + c.durationSec, 0);

  // Use the first real media URL as the final asset for publishing
  const finalMediaUrl = mediaUrls.find((url) => url && !url.startsWith('placeholder://')) || mediaUrls[0] || null;

  const editResult = {
    cutPlan,
    totalDurationSec,
    audioUrl,
    finalMediaUrl,
    format: 'vertical_9x16',
    hasAudio: !!audioUrl,
    hasMedia: mediaUrls.length > 0,
  };

  return {
    output: { editResult },
    artifacts: [{ type: 'edit_decision_list', data: editResult, url: finalMediaUrl || undefined }],
  };
}

/**
 * Execute the `score` stage: evaluate creative quality using the scoring
 * library. Calls `scoreCreative` with the brief, script, and storyboard
 * (if available) to produce a multi-dimensional quality score.
 *
 * The score can be used to gate bad creatives before media spend, rank A/B
 * variants, and track quality over time.
 */
async function executeScoreStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { context, planTier } = params;
  if (!context.brief) throw new Error('score_stage_requires_brief');
  if (!context.script) throw new Error('score_stage_requires_script');

  const score = await scoreCreative({
    brief: context.brief,
    script: context.script,
    storyboard: context.storyboard || null,
    planTier,
  });

  return {
    output: { score },
    artifacts: [{ type: 'creative_score', data: score }],
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
 * Calls `publishContent` from the publishing library with `dryRun` safety.
 * The publisher automatically returns a dry-run result when no real
 * credentials are configured, and returns `pending_approval` in real mode
 * without credentials — so there is no risk of accidental live publishing.
 *
 * The media URL is sourced from the edit stage's `finalMediaUrl` if available,
 * falling back to the first media generation URL. If no media is available,
 * the stage returns a `pending_review` plan without calling the publisher.
 *
 * The `onComplete` config field controls behavior:
 * - 'review' (default): returns a publish plan without calling publishContent
 * - 'publish': calls publishContent with dryRun safety
 * - 'schedule': returns a scheduled plan (future)
 */
async function executePublishStage(params: ExecuteStageParams): Promise<StageExecutionResult> {
  const { config, context } = params;
  const platforms = config.platforms || [];
  const onComplete = config.onComplete || 'review';

  // Source the final media URL from the edit stage or media generation
  const editResult = context.editResult as { finalMediaUrl?: string } | undefined;
  const finalMediaUrl = editResult?.finalMediaUrl || context.mediaUrls?.[0] || null;
  const caption = context_brief_to_caption(params);
  const hashtags = context.brief?.product ? [`#${context.brief.product.replace(/\s+/g, '').toLowerCase()}`] : [];

  // If onComplete is 'review' or no media URL, return a plan without publishing
  if (onComplete === 'review' || !finalMediaUrl) {
    const publishResult = {
      platforms,
      status: 'pending_review' as const,
      onComplete,
      mediaUrl: finalMediaUrl,
      caption,
      scheduledAt: null,
    };
    return {
      output: { publishResult },
      artifacts: [{ type: 'publish_plan', data: publishResult }],
    };
  }

  // Map pipeline platforms to publish platforms
  const publishPlatforms: PublishPlatform[] = platforms
    .map((p) => {
      if (p === 'tiktok') return 'tiktok' as PublishPlatform;
      if (p === 'youtube') return 'youtube_shorts' as PublishPlatform;
      if (p === 'meta' || p === 'instagram') return 'instagram_reels' as PublishPlatform;
      if (p === 'facebook') return 'facebook' as PublishPlatform;
      if (p === 'twitter') return 'twitter' as PublishPlatform;
      if (p === 'linkedin') return 'linkedin' as PublishPlatform;
      return null;
    })
    .filter((p): p is PublishPlatform => p !== null);

  // If no valid publish platforms, return a plan
  if (publishPlatforms.length === 0) {
    const publishResult = {
      platforms,
      status: 'pending_review' as const,
      onComplete,
      mediaUrl: finalMediaUrl,
      caption,
      scheduledAt: null,
    };
    return {
      output: { publishResult },
      artifacts: [{ type: 'publish_plan', data: publishResult }],
    };
  }

  // Call publishContent for each platform (dry-run safe — publisher returns
  // dry-run results when no credentials are configured, or pending_approval
  // in real mode without credentials)
  const results: Array<{ platform: string; status: string; postId?: string; postUrl?: string; error?: string }> = [];
  for (const platform of publishPlatforms) {
    try {
      const request: PublishRequest = {
        platform,
        mediaUrl: finalMediaUrl,
        caption,
        hashtags,
      };
      const result = await publishContent(request);
      results.push({
        platform: result.platform,
        status: result.status,
        postId: result.postId,
        postUrl: result.postUrl,
        error: result.error,
      });
    } catch (e) {
      results.push({
        platform: String(platform),
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const overallStatus = results.every((r) => r.status === 'published') ? 'published'
    : results.every((r) => r.status === 'failed') ? 'failed'
    : 'partial';

  const publishResult = {
    platforms,
    status: overallStatus as 'published' | 'failed' | 'partial',
    onComplete,
    mediaUrl: finalMediaUrl,
    caption,
    results,
    scheduledAt: null,
  };

  return {
    output: { publishResult },
    artifacts: [{ type: 'publish_result', data: publishResult }],
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
  score: executeScoreStage,
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
      next.editResult = result.output.editResult as import('./types').EditResult;
      break;
    case 'compliance':
      next.complianceResult = result.output.complianceResult as Record<string, unknown>;
      break;
    case 'score':
      next.score = result.output.score as CreativeScore;
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
