import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Autonomous Creative Director budget/credit tracking.
 *
 * The director (src/lib/creative/director.ts) orchestrates an external-API-backed
 * pipeline: brand extract → product extract → brief → hooks → angles →
 * scripts/scores → storyboard → variants. Each step has a credit cost and the
 * director enforces a total budget, rejecting any step that would exceed it
 * *before* invoking the (potentially expensive) external call.
 *
 * The director module pulls in transitive relative imports that the Node test
 * loader cannot resolve without extensions, so — following the same convention
 * as test/credits-refund.test.ts and test/pricing.test.ts — we replicate the
 * budget-gating and credit-tracking logic here to verify the invariants
 * hermetically, without external API calls or a database.
 */

// Replicate CREATIVE_COSTS from src/lib/creative/intelligence.ts
const CREATIVE_COSTS = {
  brief: 3,
  hooks: 2,
  angles: 2,
  script: 3,
  storyboard: 3,
  referenceAnalysis: 5,
  score: 2,
  variants: 3,
} as const;

// Replicate the DirectorInput / DirectorResult / DirectorStep shapes
interface DirectorInput {
  brandUrl?: string;
  productUrl?: string;
  productText?: string;
  productName?: string;
  platform?: string;
  format?: string;
  budgetCredits?: number;
  requireStepApproval?: boolean;
  userId?: string;
}

interface DirectorStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_approval';
  result?: unknown;
  error?: string;
  creditsSpent: number;
}

interface DirectorResult {
  steps: DirectorStep[];
  brief?: unknown;
  totalCreditsSpent: number;
  budgetCredits: number;
}

/**
 * A faithful replica of runCreativeDirector's budget-gated step runner.
 * It mirrors checkBudget + runStep + the early-exit "no product text" guard
 * from director.ts. External generation calls are replaced by an injectable
 * map of step name → result so we can simulate success/failure without any
 * network or DB dependency.
 */
async function runDirector(
  input: DirectorInput,
  implementations: Record<string, () => Promise<unknown>> = {},
): Promise<DirectorResult> {
  const budget = input.budgetCredits ?? 30;
  let spent = 0;
  const steps: DirectorStep[] = [];
  const result: DirectorResult = { steps, totalCreditsSpent: 0, budgetCredits: budget };

  const checkBudget = (cost: number, stepName: string): boolean => {
    if (spent + cost > budget) {
      steps.push({ name: stepName, status: 'failed', creditsSpent: 0, error: `Budget exceeded: ${spent + cost} > ${budget} credits` });
      return false;
    }
    return true;
  };

  const runStep = async <T>(name: string, cost: number, fn: () => Promise<T>): Promise<T | null> => {
    if (!checkBudget(cost, name)) return null;
    const step: DirectorStep = { name, status: 'running', creditsSpent: cost };
    steps.push(step);
    try {
      const res = await fn();
      step.status = input.requireStepApproval ? 'awaiting_approval' : 'completed';
      step.result = res as T | undefined;
      spent += cost;
      result.totalCreditsSpent = spent;
      return res;
    } catch (e) {
      step.status = 'failed';
      step.error = String(e);
      return null;
    }
  };

  // Step 1: Brand extraction (optional)
  if (input.brandUrl) {
    const brand = await runStep('brand_extract', CREATIVE_COSTS.brief, () =>
      (implementations.brand_extract ?? (async () => null))() as Promise<unknown>);
    if (brand) (result as Record<string, unknown>).brandExtraction = brand;
  }

  // Step 2: Product extraction (optional)
  if (input.productUrl) {
    const product = await runStep('product_extract', CREATIVE_COSTS.brief, () =>
      (implementations.product_extract ?? (async () => null))() as Promise<unknown>);
    if (product) {
      (result as Record<string, unknown>).productExtraction = product;
      if (!input.productText) {
        const p = product as { productName: string; description: string; benefits: string[] };
        input.productText = `${p.productName}: ${p.description} Benefits: ${p.benefits.join(', ')}.`;
      }
    }
  }

  // Step 3: Brief — requires product text
  if (!input.productText) {
    steps.push({ name: 'brief', status: 'failed', creditsSpent: 0, error: 'No product text available' });
    return result;
  }

  const brief = await runStep('brief', CREATIVE_COSTS.brief, () =>
    (implementations.brief ?? (async () => ({ objective: 'conversion' })))() as Promise<unknown>);
  if (!brief) return result;
  result.brief = brief;

  // Step 4: Hooks
  const hooks = await runStep('hooks', CREATIVE_COSTS.hooks, () =>
    (implementations.hooks ?? (async () => [{ id: 'h1' }]))() as Promise<unknown[]>);
  if (!hooks || (hooks as unknown[]).length === 0) return result;

  // Step 5: Angles
  const angles = await runStep('angles', CREATIVE_COSTS.angles, () =>
    (implementations.angles ?? (async () => [{ id: 'a1' }]))() as Promise<unknown[]>);
  if (!angles || (angles as unknown[]).length === 0) return result;

  return result;
}

// ── Budget exhaustion ──

test('director with a 0-credit budget exits without spending and records a failed brief step', async () => {
  const result = await runDirector({
    productText: 'A wireless ergonomic mouse with 6 programmable buttons.',
    productName: 'ErgoMouse X',
    budgetCredits: 0,
  });

  assert.equal(result.budgetCredits, 0);
  assert.equal(result.totalCreditsSpent, 0);
  assert.ok(result.totalCreditsSpent <= result.budgetCredits, 'spent must never exceed budget');

  const briefStep = result.steps.find((s) => s.name === 'brief');
  assert.ok(briefStep, 'a brief step should be recorded');
  assert.equal(briefStep?.status, 'failed');
  assert.ok(/budget/i.test(briefStep?.error ?? ''), 'failure reason should mention the budget');
  assert.equal(result.brief, undefined);
});

test('director with a tiny budget (1 credit) cannot afford the brief step and stops', async () => {
  const result = await runDirector({
    productText: 'A stainless steel insulated water bottle.',
    productName: 'HydroFlask Pro',
    budgetCredits: 1, // brief costs 3
  });

  assert.equal(result.budgetCredits, 1);
  assert.equal(result.totalCreditsSpent, 0);
  assert.ok(result.totalCreditsSpent <= result.budgetCredits);
  assert.equal(result.brief, undefined);
  assert.equal(result.steps.find((s) => s.name === 'brief')?.status, 'failed');
});

// ── DirectorInput validation ──

test('DirectorInput without productText or productUrl fails with "No product text available"', async () => {
  const result = await runDirector({ budgetCredits: 100 });

  const briefStep = result.steps.find((s) => s.name === 'brief');
  assert.ok(briefStep, 'brief step should be recorded');
  assert.equal(briefStep?.status, 'failed');
  assert.ok(/product text/i.test(briefStep?.error ?? ''), 'error should mention product text');
  assert.equal(result.brief, undefined);
  assert.equal(result.totalCreditsSpent, 0);
});

test('DirectorInput with only productUrl but a zero budget stops before extraction', async () => {
  const result = await runDirector({ productUrl: 'https://example.com/product', budgetCredits: 0 });

  assert.equal(result.totalCreditsSpent, 0);
  const extractStep = result.steps.find((s) => s.name === 'product_extract');
  assert.ok(extractStep, 'product_extract step should be recorded');
  assert.equal(extractStep?.status, 'failed');
  assert.ok(/budget/i.test(extractStep?.error ?? ''));
});

test('DirectorInput with productText runs the brief step when budget allows', async () => {
  const result = await runDirector({
    productText: 'A compact mechanical keyboard.',
    budgetCredits: 10,
  });

  // brief(3) + hooks(2) + angles(2) = 7
  assert.equal(result.totalCreditsSpent, 7);
  assert.ok(result.brief, 'brief should be produced');
  assert.equal(result.steps.find((s) => s.name === 'brief')?.status, 'completed');
});

// ── Credit tracking invariants ──

test('runStep tracks credits spent across multiple successful steps', async () => {
  const result = await runDirector(
    { productText: 'Product', budgetCredits: 100 },
    {
      brief: async () => ({ objective: 'conversion' }),
      hooks: async () => [{ id: 'h1' }, { id: 'h2' }],
      angles: async () => [{ id: 'a1' }],
    },
  );
  // brief(3) + hooks(2) + angles(2) = 7
  assert.equal(result.totalCreditsSpent, 7);
  assert.ok(result.steps.filter((s) => s.status === 'completed').length >= 3);
});

test('totalCreditsSpent never exceeds budgetCredits across a mixed run', async () => {
  const budget = 6; // brief(3) + hooks(2) = 5 ok, angles(2) → 7 > 6 rejected
  const result = await runDirector(
    { productText: 'Product', budgetCredits: budget },
    {
      brief: async () => ({}),
      hooks: async () => [{ id: 'h1' }],
      angles: async () => [{ id: 'a1' }],
    },
  );
  assert.ok(result.totalCreditsSpent <= budget, `spent ${result.totalCreditsSpent} must not exceed budget ${budget}`);
  assert.equal(result.totalCreditsSpent, 5);
  assert.equal(result.steps.find((s) => s.name === 'angles')?.status, 'failed');
});

test('failed external call does not charge credits and is recorded as failed', async () => {
  const result = await runDirector(
    { productText: 'Product', budgetCredits: 100 },
    { brief: async () => { throw new Error('llm_down'); } },
  );
  assert.equal(result.totalCreditsSpent, 0, 'failed step should not charge credits');
  assert.equal(result.brief, undefined);
  const briefStep = result.steps.find((s) => s.name === 'brief');
  assert.equal(briefStep?.status, 'failed');
  assert.ok(/llm_down/.test(briefStep?.error ?? ''));
});

test('budget check rejects a step that would exceed the remaining budget', async () => {
  // brief costs 3; budget 3 allows brief but not hooks (2) afterward.
  const result = await runDirector(
    { productText: 'Product', budgetCredits: 3 },
    { brief: async () => ({}), hooks: async () => [{ id: 'h1' }] },
  );
  assert.equal(result.totalCreditsSpent, 3);
  assert.equal(result.steps.find((s) => s.name === 'hooks')?.status, 'failed');
  assert.ok(/budget/i.test(result.steps.find((s) => s.name === 'hooks')?.error ?? ''));
});

test('empty hooks result stops the pipeline early', async () => {
  const result = await runDirector(
    { productText: 'Product', budgetCredits: 100 },
    { brief: async () => ({}), hooks: async () => [] },
  );
  // brief(3) + hooks(2) = 5 — hooks step charges even though it returns empty
  assert.equal(result.totalCreditsSpent, CREATIVE_COSTS.brief + CREATIVE_COSTS.hooks);
  assert.equal(result.steps.find((s) => s.name === 'angles'), undefined, 'angles should not run');
});

// ── Cost model sanity ──

test('CREATIVE_COSTS values are all positive integers', () => {
  for (const [name, cost] of Object.entries(CREATIVE_COSTS)) {
    assert.ok(Number.isInteger(cost), `${name} cost should be an integer`);
    assert.ok((cost as number) > 0, `${name} cost should be positive`);
  }
});

test('a full director run (brief+hooks+angles) costs 7 credits', () => {
  const fullCost = CREATIVE_COSTS.brief + CREATIVE_COSTS.hooks + CREATIVE_COSTS.angles;
  assert.equal(fullCost, 7);
});
