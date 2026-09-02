/**
 * Autonomous Creative Director — an agent loop that orchestrates the
 * creative intelligence pipeline autonomously.
 *
 * The director:
 * 1. Takes a product URL and high-level goal
 * 2. Extracts brand and product intelligence
 * 3. Generates a brief, hooks, angles, scripts, storyboards
 * 4. Scores each creative combination
 * 5. Picks the best-scoring combination
 * 6. Generates A/B variants
 * 7. Returns a complete creative package
 *
 * Approval gates: each step can be paused for human review.
 * Budget constraints: total credit spend is capped.
 */

import { extractBrand, extractProduct } from '@/lib/brand/extract';
import { buildProfile } from '@/lib/brand/profile';
import {
  generateBrief, generateHooks, generateAngles, generateScript,
  generateStoryboard, scoreCreative, generateVariants, CREATIVE_COSTS,
} from './intelligence';
import { getLearningsContext } from './learning';
import { persistCreativePackage } from './asset-persist';
import { startWorkflow, recordStep, completeWorkflow, failWorkflow } from '@/lib/workflow/engine';
import type {
  CreativeBrief, HookCandidate, CreativeAngle, ScriptCandidate,
  StoryboardCandidate, CreativeScore, CreativeVariant,
} from './types';
import type { BrandExtraction, ProductExtraction } from '@/lib/brand/types';

export interface DirectorInput {
  brandUrl?: string;
  productUrl?: string;
  productText?: string; // manual product description
  productName?: string;
  platform?: string;
  format?: string;
  /** Maximum credits to spend (default 30). */
  budgetCredits?: number;
  /** If true, pauses after each step for human review. */
  requireStepApproval?: boolean;
  /** User ID for loading performance learnings. */
  userId?: string;
}

export interface DirectorStep<T> {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_approval';
  result?: T;
  error?: string;
  creditsSpent: number;
}

export interface DirectorResult {
  steps: DirectorStep<unknown>[];
  brandExtraction?: BrandExtraction;
  productExtraction?: ProductExtraction;
  brief?: CreativeBrief;
  hooks?: HookCandidate[];
  angles?: CreativeAngle[];
  bestCombination?: {
    angle: CreativeAngle;
    hook: HookCandidate;
    script: ScriptCandidate;
    storyboard?: StoryboardCandidate;
    score: CreativeScore;
  };
  variants?: CreativeVariant[];
  totalCreditsSpent: number;
  budgetCredits: number;
  /** ID of the persisted Asset package (if userId was provided). */
  assetPackageId?: string;
}

type StepCallback = (step: DirectorStep<unknown>, result: DirectorResult) => Promise<boolean | void>;

/**
 * Run the autonomous creative director pipeline.
 *
 * @param input Product/brand info and constraints
 * @param onStep Optional callback called after each step. Return false to abort.
 * @returns Complete creative package
 */
export async function runCreativeDirector(
  input: DirectorInput,
  onStep?: StepCallback,
): Promise<DirectorResult> {
  const budget = input.budgetCredits || 30;
  let spent = 0;
  const steps: DirectorStep<unknown>[] = [];
  const result: DirectorResult = { steps, totalCreditsSpent: 0, budgetCredits: budget };
  const startedAt = Date.now();

  // Start a durable workflow run (non-fatal if DB table doesn't exist)
  const wfId = input.userId
    ? await startWorkflow(input.userId, 'creative_director', {
        productUrl: input.productUrl, brandUrl: input.brandUrl,
        platform: input.platform, budgetCredits: budget,
      }).catch(() => null)
    : null;

  const checkBudget = (cost: number, stepName: string): boolean => {
    if (spent + cost > budget) {
      const failStep: DirectorStep<unknown> = { name: stepName, status: 'failed', creditsSpent: 0, error: `Budget exceeded: ${spent + cost} > ${budget} credits` };
      steps.push(failStep);
      return false;
    }
    return true;
  };

  const runStep = async <T>(name: string, cost: number, fn: () => Promise<T>): Promise<T | null> => {
    if (!checkBudget(cost, name)) {
      if (wfId) await recordStep(wfId, name, 'failed', { error: 'Budget exceeded', creditsCost: 0 }).catch(() => {});
      return null;
    }
    const step: DirectorStep<T> = { name, status: 'running', creditsSpent: cost };
    steps.push(step as DirectorStep<unknown>);
    if (wfId) await recordStep(wfId, name, 'running', { creditsCost: cost }).catch(() => {});
    if (onStep) await onStep(step as DirectorStep<unknown>, result);
    try {
      const res = await fn();
      step.status = input.requireStepApproval ? 'awaiting_approval' : 'completed';
      step.result = res as T | undefined;
      if (wfId) await recordStep(wfId, name, 'completed', { creditsCost: cost, output: res as Record<string, unknown> | undefined }).catch(() => {});
      if (onStep) {
        const proceed = await onStep(step as DirectorStep<unknown>, result);
        if (proceed === false) { step.status = 'failed'; return null; }
      }
      if (!input.requireStepApproval) step.status = 'completed';
      spent += cost;
      result.totalCreditsSpent = spent;
      return res;
    } catch (e) {
      step.status = 'failed';
      step.error = String(e);
      if (wfId) await recordStep(wfId, name, 'failed', { error: String(e), creditsCost: 0 }).catch(() => {});
      return null;
    }
  };

  // Step 1: Brand extraction (optional)
  if (input.brandUrl) {
    const brand = await runStep('brand_extract', CREATIVE_COSTS.brief, () => extractBrand(input.brandUrl!));
    if (brand) result.brandExtraction = brand;
  }

  // Step 2: Product extraction (optional)
  if (input.productUrl) {
    const product = await runStep('product_extract', CREATIVE_COSTS.brief, () => extractProduct(input.productUrl!));
    if (product) {
      result.productExtraction = product;
      if (!input.productText) {
        input.productText = `${product.productName}: ${product.description} Benefits: ${product.benefits.join(', ')}.`;
        input.productName = input.productName || product.productName;
      }
    }
  }

  // Step 3: Generate brief
  if (!input.productText) {
    const failStep: DirectorStep<unknown> = { name: 'brief', status: 'failed', creditsSpent: 0, error: 'No product text available' };
    steps.push(failStep);
    if (wfId && input.userId) await failWorkflow(wfId, input.userId, 'No product text available').catch(() => {});
    return result;
  }

  const learnings = input.userId ? await getLearningsContext(input.userId).catch(() => '') : '';
  const brief = await runStep('brief', CREATIVE_COSTS.brief, () =>
    generateBrief({
      product: input.productText!,
      productName: input.productName,
      platform: input.platform || 'tiktok',
      format: input.format || 'ugc',
      learnings: learnings || undefined,
    }),
  );
  if (!brief) return result;
  result.brief = brief;

  // Step 4: Generate hooks
  const hooks = await runStep('hooks', CREATIVE_COSTS.hooks, () => generateHooks(brief, 5));
  if (!hooks || hooks.length === 0) return result;
  result.hooks = hooks;

  // Step 5: Generate angles
  const angles = await runStep('angles', CREATIVE_COSTS.angles, () => generateAngles(brief, 3));
  if (!angles || angles.length === 0) return result;
  result.angles = angles;

  // Step 6: Generate scripts for top combinations, score them, pick the best
  const combinations: Array<{
    angle: CreativeAngle; hook: HookCandidate;
    script: ScriptCandidate; storyboard?: StoryboardCandidate;
    score: CreativeScore;
  }> = [];

  // Try top 2 angles × top 2 hooks = 4 combinations (budget permitting)
  const maxCombinations = Math.min(2, angles.length) * Math.min(2, hooks.length);
  const scriptCost = CREATIVE_COSTS.script + CREATIVE_COSTS.score;

  for (let a = 0; a < Math.min(2, angles.length) && spent + scriptCost <= budget; a++) {
    for (let h = 0; h < Math.min(2, hooks.length) && spent + scriptCost <= budget; h++) {
      const script = await runStep(`script(${a},${h})`, CREATIVE_COSTS.script, () =>
        generateScript(brief, angles[a], hooks[h]),
      );
      if (!script) continue;

      const score = await runStep(`score(${a},${h})`, CREATIVE_COSTS.score, () =>
        scoreCreative({ brief, script }),
      );
      if (!score) continue;

      combinations.push({ angle: angles[a], hook: hooks[h], script, score });
    }
  }

  if (combinations.length === 0) return result;

  // Pick the best combination by overall score
  combinations.sort((a, b) => b.score.overall - a.score.overall);
  const best = combinations[0];

  // Step 7: Generate storyboard for the best combination
  if (spent + CREATIVE_COSTS.storyboard <= budget) {
    const storyboard = await runStep('storyboard', CREATIVE_COSTS.storyboard, () =>
      generateStoryboard(brief, best.script, '9:16'),
    );
    if (storyboard) best.storyboard = storyboard;
  }

  result.bestCombination = best;

  // Step 8: Generate A/B variants
  if (spent + CREATIVE_COSTS.variants <= budget) {
    const variants = await runStep('variants', CREATIVE_COSTS.variants, () =>
      generateVariants(brief, best.script, 3),
    );
    if (variants) result.variants = variants;
  }

  // Complete the durable workflow run
  if (wfId && input.userId) {
    await completeWorkflow(wfId, input.userId, {
      totalCreditsSpent: spent,
      bestScore: best.score.overall,
      variantsCount: result.variants?.length || 0,
    }, Date.now() - startedAt).catch(() => {});
  }

  // Persist the creative package as Asset records (non-fatal)
  if (input.userId) {
    const { packageId } = await persistCreativePackage(input.userId, {
      brief: brief as unknown as Record<string, unknown>,
      hooks: hooks as unknown as Record<string, unknown>,
      angles: angles as unknown as Record<string, unknown>,
      bestCombination: best as unknown as Record<string, unknown>,
      variants: result.variants as unknown as Record<string, unknown>,
      totalCreditsSpent: spent,
      budgetCredits: budget,
    }).catch(() => ({ packageId: null, childIds: [] }));
    result.assetPackageId = packageId ?? undefined;
  }

  return result;
}
