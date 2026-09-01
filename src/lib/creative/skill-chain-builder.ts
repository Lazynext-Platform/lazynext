/**
 * Agent Skill Chains — enhanced skill chaining with conditional branching.
 *
 * Extends the base SkillChain model (src/lib/creative/skill-library.ts) with
 * per-step conditional branches. After each step completes, its declared
 * branches are evaluated against the accumulated step outputs and chain-level
 * inputs; the first matching branch is taken, executing either a branched
 * skill or a branched chain, and the resulting outputs are merged back into
 * the store for downstream steps.
 *
 * Execution uses the existing atlasChat() from src/lib/atlas.ts — no new LLM
 * dependency. The model is resolved per plan-tier via getLLMModel() (imported
 * dynamically inside the execute functions so this module stays importable in
 * the Node test runner without triggering the provider router chain).
 *
 * Patterns mirror src/lib/creative/multi-concept.ts: isDryRun(), resolveModel(),
 * deterministic placeholder content in dry-run mode, and a credit-cost constant.
 */
import { isDryRun } from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';
import {
  type SkillChain,
  type SkillChainStep,
  type CreativeSkill,
  type SkillExecutionResult,
  listSkills,
  listChains,
  getChain,
  getSkill,
  validateChain,
  estimateChainCredits,
  executeChain,
  executeSkill,
  ChainStepError,
} from '@/lib/creative/skill-library';

// ── Credit cost ──

export const SKILL_CHAIN_BUILDER_CREDIT_COST = 8;

// ── Types ──

export type ChainCondition =
  | { type: 'output_contains'; stepIndex: number; outputKey: string; value: string }
  | { type: 'output_gt'; stepIndex: number; outputKey: string; value: number }
  | { type: 'output_lt'; stepIndex: number; outputKey: string; value: number }
  | { type: 'output_equals'; stepIndex: number; outputKey: string; value: string }
  | { type: 'platform_is'; value: string };

export interface BranchStep {
  condition: ChainCondition;
  /** Chain ID to execute if condition is met */
  branchToChainId?: string;
  /** Skill ID to execute if condition is met */
  branchToSkillId?: string;
  /** Inputs for the branched skill/chain */
  branchInputs?: Record<string, string>;
  /** Label for this branch */
  label: string;
}

export interface EnhancedChainStep extends SkillChainStep {
  /** Optional branches evaluated after this step completes */
  branches?: BranchStep[];
}

export interface EnhancedSkillChain {
  id: string;
  name: string;
  description: string;
  steps: EnhancedChainStep[];
  /** Chain-level inputs */
  inputs: Record<string, string>;
  /** Estimated total credits */
  estimatedCredits: number;
}

export interface ChainExecutionResult {
  chainId: string;
  steps: Array<{
    stepIndex: number;
    skillId: string;
    success: boolean;
    outputs: Record<string, unknown>;
    duration: number;
    branchesTaken?: string[];
  }>;
  totalDuration: number;
  totalCreditsUsed: number;
  finalOutputs: Record<string, unknown>;
  branchPaths: string[];
}

// ── Helpers ──

/** Coerce an arbitrary value to a number for numeric comparisons. */
function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

/** Coerce an arbitrary value to a string for string comparisons. */
function toStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v === undefined || v === null) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Resolve a nested output value from the accumulated step outputs store.
 * `outputKey` may be a simple key ("hooks") or a dotted path ("hooks.hookStrength").
 */
function resolveOutputValue(
  stepOutputs: Record<string, unknown>,
  outputKey: string,
): unknown {
  if (outputKey in stepOutputs) return stepOutputs[outputKey];
  // Dotted path lookup
  const parts = outputKey.split('.');
  let cur: unknown = stepOutputs;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

// ── Condition evaluation ──

/**
 * Evaluate a ChainCondition against accumulated step outputs and chain-level
 * inputs. Returns true when the condition is satisfied.
 *
 * - output_contains: the referenced output value (as a string) contains `value`.
 * - output_gt / output_lt: the referenced output value (as a number) is
 *   greater-than / less-than `value`.
 * - output_equals: the referenced output value (as a string) equals `value`.
 * - platform_is: the chain input "platform" equals `value`.
 */
export function evaluateCondition(
  condition: ChainCondition,
  stepOutputs: Record<string, unknown>,
  chainInputs: Record<string, unknown>,
): boolean {
  switch (condition.type) {
    case 'output_contains': {
      const v = resolveOutputValue(stepOutputs, condition.outputKey);
      return toStr(v).includes(condition.value);
    }
    case 'output_gt': {
      const v = resolveOutputValue(stepOutputs, condition.outputKey);
      const n = toNumber(v);
      return Number.isFinite(n) && n > condition.value;
    }
    case 'output_lt': {
      const v = resolveOutputValue(stepOutputs, condition.outputKey);
      const n = toNumber(v);
      return Number.isFinite(n) && n < condition.value;
    }
    case 'output_equals': {
      const v = resolveOutputValue(stepOutputs, condition.outputKey);
      return toStr(v) === condition.value;
    }
    case 'platform_is': {
      return toStr(chainInputs.platform) === condition.value;
    }
    default:
      return false;
  }
}

// ── Chain building & validation ──

/** Estimate total credits for an enhanced chain by summing its steps' skill costs. */
export function estimateEnhancedChainCredits(chain: EnhancedSkillChain): number {
  return chain.steps.reduce((sum, step) => {
    const skill = getSkill(step.skillId);
    return sum + (skill?.estimatedCredits ?? 0);
  }, 0);
}

/**
 * Build an enhanced skill chain from raw step definitions, computing the
 * estimated total credits from the referenced skills.
 */
export function buildEnhancedChain(
  name: string,
  description: string,
  steps: EnhancedChainStep[],
  inputs: Record<string, string> = {},
): EnhancedSkillChain {
  const id = `enhanced-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const chain: EnhancedSkillChain = {
    id,
    name,
    description,
    steps,
    inputs,
    estimatedCredits: 0,
  };
  chain.estimatedCredits = estimateEnhancedChainCredits(chain);
  return chain;
}

/**
 * Validate an enhanced skill chain: base chain validation plus branch
 * reference validation (branched skill/chain ids must exist).
 */
export function validateEnhancedChain(
  chain: EnhancedSkillChain,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!chain.id || !chain.id.trim()) errors.push('chain_missing_id');
  if (!chain.name || !chain.name.trim()) errors.push('chain_missing_name');
  if (!Array.isArray(chain.steps) || chain.steps.length === 0) {
    errors.push('chain_no_steps');
    return { valid: false, errors };
  }

  // Reuse the base validator by projecting to a SkillChain shape.
  const baseChain: SkillChain = {
    id: chain.id,
    name: chain.name,
    description: chain.description,
    steps: chain.steps,
    totalCredits: chain.estimatedCredits,
  };
  const baseResult = validateChain(baseChain);
  errors.push(...baseResult.errors);

  // Validate branch references.
  const allSkillIds = new Set(listSkills().map((s) => s.id));
  const allChainIds = new Set(listChains().map((c) => c.id));

  for (let i = 0; i < chain.steps.length; i += 1) {
    const step = chain.steps[i];
    if (!step.branches) continue;
    for (let b = 0; b < step.branches.length; b += 1) {
      const branch = step.branches[b];
      if (!branch.label || !branch.label.trim()) {
        errors.push(`step_${i}_branch_${b}_missing_label`);
      }
      if (!branch.branchToChainId && !branch.branchToSkillId) {
        errors.push(`step_${i}_branch_${b}_no_target`);
      }
      if (branch.branchToSkillId && !allSkillIds.has(branch.branchToSkillId)) {
        errors.push(`step_${i}_branch_${b}_unknown_skill:${branch.branchToSkillId}`);
      }
      if (branch.branchToChainId && !allChainIds.has(branch.branchToChainId)) {
        errors.push(`step_${i}_branch_${b}_unknown_chain:${branch.branchToChainId}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Dry-run placeholder generation ──

/**
 * Build deterministic placeholder outputs for a skill in dry-run mode so the
 * UI can render without a real LLM call. The shape mirrors each skill's
 * declared outputs.
 */
function dryRunSkillOutputs(skillId: string, inputs: Record<string, unknown>): Record<string, unknown> {
  const skill = getSkill(skillId);
  if (!skill) return { text: `[dry-run] unknown skill ${skillId}` };
  const product = toStr(inputs.product) || 'your product';
  const audience = toStr(inputs.audience) || 'your audience';
  const platform = toStr(inputs.platform) || 'tiktok';

  switch (skillId) {
    case 'hook-generator':
      return {
        hooks: [
          { type: 'curiosity', text: `What if ${product} could change everything?`, rationale: 'Curiosity-driven opener.' },
          { type: 'shock', text: `Stop scrolling — ${product} is not what you think.`, rationale: 'Pattern interrupt.' },
          { type: 'stat', text: `90% of ${audience} ignore this about ${product}.`, rationale: 'Stat-backed hook.' },
        ],
        hookStrength: 8,
      };
    case 'hook-tester':
      return {
        ranking: [
          { hook: `What if ${product} could change everything?`, retention: 8, engagement: 7 },
          { hook: `Stop scrolling — ${product} is not what you think.`, retention: 7, engagement: 9 },
        ],
        recommended: `What if ${product} could change everything?`,
      };
    case 'script-writer':
      return {
        title: `${product} Ad`,
        scenes: [
          { i: 1, durationSec: 3, visual: 'Hook shot', voiceover: `Discover ${product}.`, onScreenText: product },
          { i: 2, durationSec: 5, visual: 'Benefit demo', voiceover: 'See the difference.', onScreenText: '' },
          { i: 3, durationSec: 2, visual: 'CTA', voiceover: 'Try it today.', onScreenText: 'Shop Now' },
        ],
        totalDurationSec: 10,
        cta: 'Shop Now',
      };
    case 'angle-explorer':
      return {
        angles: [
          { name: 'Problem-Solution', description: `Frame ${product} as the fix for ${audience}'s pain.`, emotionalTrigger: 'relief', targetAudience: audience },
          { name: 'Aspiration', description: `Position ${product} as the path to a better self.`, emotionalTrigger: 'desire', targetAudience: audience },
        ],
      };
    case 'variant-generator':
      return {
        variants: [
          { label: 'Variant A', content: `${product} — now faster.`, angle: 'speed' },
          { label: 'Variant B', content: `${product} — now cheaper.`, angle: 'price' },
          { label: 'Variant C', content: `${product} — now smarter.`, angle: 'intelligence' },
        ],
      };
    case 'platform-adapter':
      return {
        platform,
        format: '9:16 vertical',
        durationSec: 15,
        tone: 'energetic',
        caption: `${product} on ${platform}`,
        cta: 'Shop Now',
        notes: `Adapted for ${platform} conventions (mock).`,
      };
    case 'performance-predictor':
      return {
        hookStrength: 7,
        storyFlow: 7,
        ctaClarity: 8,
        brandAlignment: 7,
        overallScore: 82,
        rationale: `Solid hook and clear CTA for ${audience} (mock).`,
      };
    default:
      return { text: `[dry-run] ${skill.name} output for ${product} (${audience}, ${platform}).` };
  }
}

// ── Execution ──

/**
 * Execute a single branched skill in dry-run mode, returning placeholder
 * outputs that satisfy the skill's declared output shape.
 */
async function dryRunExecuteSkill(
  skillId: string,
  inputs: Record<string, unknown>,
): Promise<SkillExecutionResult> {
  const start = Date.now();
  const skill = getSkill(skillId);
  const outputs = dryRunSkillOutputs(skillId, inputs);
  return {
    skillId,
    outputs,
    creditsUsed: skill?.estimatedCredits ?? 0,
    duration: Date.now() - start,
  };
}

/**
 * Execute an enhanced skill chain with branching support.
 *
 * Runs each step sequentially, passing prior step outputs (by outputKey) and
 * chain-level inputs forward via each step's inputMappings. After each step
 * completes, its declared branches are evaluated in order; the first matching
 * branch is taken — executing either a branched skill or a branched chain —
 * and the resulting outputs are merged into the store.
 *
 * In dry-run mode (local mock / no API key), deterministic placeholder outputs
 * are returned without any LLM calls.
 */
export async function executeEnhancedChain(
  chain: EnhancedSkillChain,
  inputs: Record<string, unknown>,
  planTier?: PlanTier,
): Promise<ChainExecutionResult> {
  const validation = validateEnhancedChain(chain);
  if (!validation.valid) {
    throw new Error(`invalid_enhanced_chain:${validation.errors.join(',')}`);
  }

  const dry = isDryRun();
  const store: Record<string, unknown> = { ...chain.inputs, ...inputs };
  const stepResults: ChainExecutionResult['steps'] = [];
  const branchPaths: string[] = [];
  const chainStart = Date.now();
  let totalCredits = 0;

  for (let stepIndex = 0; stepIndex < chain.steps.length; stepIndex += 1) {
    const step = chain.steps[stepIndex];

    // Resolve this step's inputs from the store using its inputMappings.
    const stepInputs: Record<string, unknown> = {};
    for (const [sourceKey, skillInputName] of Object.entries(step.inputMappings)) {
      if (sourceKey in store) {
        stepInputs[skillInputName] = store[sourceKey];
      }
    }

    let result: SkillExecutionResult;
    try {
      result = dry
        ? await dryRunExecuteSkill(step.skillId, stepInputs)
        : await executeSkill(step.skillId, stepInputs, planTier);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new ChainStepError(
        `enhanced_chain_step_failed:${chain.id}:step${stepIndex}:${step.skillId}:${msg}`,
        stepIndex,
        step.skillId,
        [],
        0,
      );
    }

    totalCredits += result.creditsUsed;
    store[step.outputKey] = result.outputs;

    const branchesTaken: string[] = [];

    // Evaluate branches after this step completes.
    if (step.branches && step.branches.length > 0) {
      for (const branch of step.branches) {
        if (!evaluateCondition(branch.condition, store, inputs)) continue;

        // Branch taken — execute the branched skill or chain.
        const branchLabel = branch.label;
        branchesTaken.push(branchLabel);
        branchPaths.push(`step${stepIndex}→${branchLabel}`);

        const branchInputs: Record<string, unknown> = { ...branch.branchInputs };
        // Resolve branchInputs values from the store if they reference existing keys.
        for (const [k, v] of Object.entries(branchInputs)) {
          if (typeof v === 'string' && v in store) {
            branchInputs[k] = store[v];
          }
        }

        if (branch.branchToSkillId) {
          let branchResult: SkillExecutionResult;
          try {
            branchResult = dry
              ? await dryRunExecuteSkill(branch.branchToSkillId, branchInputs)
              : await executeSkill(branch.branchToSkillId, branchInputs, planTier);
          } catch (e) {
            // Branch failure is non-fatal — log and continue the main chain.
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[skill-chain-builder] branch ${branchLabel} failed: ${msg}`);
            continue;
          }
          totalCredits += branchResult.creditsUsed;
          store[`branch_${stepIndex}_${branch.branchToSkillId}`] = branchResult.outputs;
        } else if (branch.branchToChainId) {
          try {
            const chainResult = dry
              ? await dryRunExecuteChain(branch.branchToChainId, branchInputs)
              : await executeChain(branch.branchToChainId, branchInputs, planTier);
            store[`branch_${stepIndex}_${branch.branchToChainId}`] = chainResult.finalOutput;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[skill-chain-builder] branch chain ${branchLabel} failed: ${msg}`);
          }
        }

        // Only the first matching branch is taken per step.
        break;
      }
    }

    stepResults.push({
      stepIndex,
      skillId: step.skillId,
      success: true,
      outputs: result.outputs,
      duration: result.duration,
      branchesTaken: branchesTaken.length > 0 ? branchesTaken : undefined,
    });
  }

  // The final outputs are all step outputs by key, plus branch outputs.
  const finalOutputs: Record<string, unknown> = {};
  for (const step of chain.steps) {
    if (step.outputKey in store) finalOutputs[step.outputKey] = store[step.outputKey];
  }
  for (const k of Object.keys(store)) {
    if (k.startsWith('branch_')) finalOutputs[k] = store[k];
  }

  return {
    chainId: chain.id,
    steps: stepResults,
    totalDuration: Date.now() - chainStart,
    totalCreditsUsed: totalCredits,
    finalOutputs,
    branchPaths,
  };
}

/**
 * Dry-run execution of a built-in chain: runs each step through
 * dryRunExecuteSkill and returns a result compatible with executeChain.
 */
async function dryRunExecuteChain(
  chainId: string,
  inputs: Record<string, unknown>,
): Promise<{ results: SkillExecutionResult[]; finalOutput: Record<string, unknown> }> {
  const chain = getChain(chainId);
  if (!chain) throw new Error(`unknown_chain:${chainId}`);
  const store: Record<string, unknown> = { ...inputs };
  const results: SkillExecutionResult[] = [];
  for (const step of chain.steps) {
    const stepInputs: Record<string, unknown> = {};
    for (const [sourceKey, skillInputName] of Object.entries(step.inputMappings)) {
      if (sourceKey in store) stepInputs[skillInputName] = store[sourceKey];
    }
    const result = await dryRunExecuteSkill(step.skillId, stepInputs);
    results.push(result);
    store[step.outputKey] = result.outputs;
  }
  const finalOutput: Record<string, unknown> = {};
  for (const step of chain.steps) {
    if (step.outputKey in store) finalOutput[step.outputKey] = store[step.outputKey];
  }
  return { results, finalOutput };
}

// ── Built-in enhanced chains (3) ──

export const BUILTIN_ENHANCED_CHAINS: EnhancedSkillChain[] = [
  {
    id: 'adaptive-hook-chain',
    name: 'Adaptive Hook Chain',
    description:
      'Generate hooks → if hook strength > 7, branch to script-writer; else branch to hook-tester.',
    steps: [
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience', count: 'count' },
        outputKey: 'hooks',
        branches: [
          {
            label: 'Strong hook → write script',
            condition: { type: 'output_gt', stepIndex: 0, outputKey: 'hooks.hookStrength', value: 7 },
            branchToSkillId: 'script-writer',
            branchInputs: { product: 'product', hook: 'hooks', cta: 'cta' },
          },
          {
            label: 'Weak hook → A/B test',
            condition: { type: 'output_lt', stepIndex: 0, outputKey: 'hooks.hookStrength', value: 7 },
            branchToSkillId: 'hook-tester',
            branchInputs: { hooks: 'hooks', audience: 'audience' },
          },
        ],
      },
    ],
    inputs: { product: '', audience: '', count: '5', cta: 'Shop Now' },
    estimatedCredits: 6,
  },
  {
    id: 'platform-optimized-chain',
    name: 'Platform-Optimized Chain',
    description:
      'Generate creative → if platform is tiktok, branch to platform-adapter for tiktok; else branch to variant-generator.',
    steps: [
      {
        skillId: 'angle-explorer',
        inputMappings: { product: 'product', audience: 'audience' },
        outputKey: 'angles',
        branches: [
          {
            label: 'TikTok → platform-adapter',
            condition: { type: 'platform_is', value: 'tiktok' },
            branchToSkillId: 'platform-adapter',
            branchInputs: { content: 'angles', platform: 'platform' },
          },
          {
            label: 'Other platform → variants',
            condition: { type: 'output_contains', stepIndex: 0, outputKey: 'angles', value: 'angle' },
            branchToSkillId: 'variant-generator',
            branchInputs: { base: 'angles' },
          },
        ],
      },
    ],
    inputs: { product: '', audience: '', platform: 'tiktok' },
    estimatedCredits: 6,
  },
  {
    id: 'performance-driven-chain',
    name: 'Performance-Driven Chain',
    description:
      'Generate creative → if predicted performance > 8, branch to variant-generator; else branch to angle-explorer.',
    steps: [
      {
        skillId: 'variant-generator',
        inputMappings: { product: 'base', count: 'count' },
        outputKey: 'variants',
      },
      {
        skillId: 'performance-predictor',
        inputMappings: { variants: 'creative', audience: 'audience' },
        outputKey: 'prediction',
        branches: [
          {
            label: 'High performance → more variants',
            condition: { type: 'output_gt', stepIndex: 1, outputKey: 'prediction.hookStrength', value: 8 },
            branchToSkillId: 'variant-generator',
            branchInputs: { base: 'variants' },
          },
          {
            label: 'Low performance → explore angles',
            condition: { type: 'output_lt', stepIndex: 1, outputKey: 'prediction.hookStrength', value: 8 },
            branchToSkillId: 'angle-explorer',
            branchInputs: { product: 'product', audience: 'audience', context: 'variants' },
          },
        ],
      },
    ],
    inputs: { product: '', audience: '', count: '3' },
    estimatedCredits: 11,
  },
];

const ENHANCED_CHAIN_INDEX: Map<string, EnhancedSkillChain> = new Map(
  BUILTIN_ENHANCED_CHAINS.map((c) => [c.id, c]),
);

/** Get a single built-in enhanced chain by id. */
export function getEnhancedChain(id: string): EnhancedSkillChain | undefined {
  return ENHANCED_CHAIN_INDEX.get(id);
}

/** List all built-in enhanced chains. */
export function listEnhancedChains(): EnhancedSkillChain[] {
  return [...BUILTIN_ENHANCED_CHAINS];
}

// Re-export for convenience so callers can import everything from one module.
export {
  type CreativeSkill,
  type SkillChain,
  type SkillChainStep,
  listSkills,
  listChains,
  getChain,
  getSkill,
  validateChain,
  estimateChainCredits,
  executeChain,
  executeSkill,
};
