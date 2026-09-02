import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Agent Skill Chains (enhanced skill chaining with branching).
 *
 * Tests cover the pure helper functions (evaluateCondition, buildEnhancedChain,
 * validateEnhancedChain) and the built-in enhanced chain data structures.
 * The executeEnhancedChain function is invoked in dry-run mode (no real LLM
 * calls) so it can run in the Node test runner.
 */
import {
  SKILL_CHAIN_BUILDER_CREDIT_COST,
  BUILTIN_ENHANCED_CHAINS,
  getEnhancedChain,
  listEnhancedChains,
  evaluateCondition,
  buildEnhancedChain,
  validateEnhancedChain,
  executeEnhancedChain,
  estimateEnhancedChainCredits,
  type EnhancedSkillChain,
  type ChainCondition,
} from '@/lib/creative/skill-chain-builder';

// ── Credit cost ──

test('SKILL_CHAIN_BUILDER_CREDIT_COST is 8', () => {
  assert.equal(SKILL_CHAIN_BUILDER_CREDIT_COST, 8);
});

// ── evaluateCondition tests ──

test('evaluateCondition: output_contains matches substring', () => {
  const cond: ChainCondition = { type: 'output_contains', stepIndex: 0, outputKey: 'hooks', value: 'curiosity' };
  const outputs = { hooks: 'A curiosity-driven hook about the product.' };
  assert.ok(evaluateCondition(cond, outputs, {}));
});

test('evaluateCondition: output_contains does not match absent substring', () => {
  const cond: ChainCondition = { type: 'output_contains', stepIndex: 0, outputKey: 'hooks', value: 'zzz' };
  const outputs = { hooks: 'A curiosity-driven hook.' };
  assert.equal(evaluateCondition(cond, outputs, {}), false);
});

test('evaluateCondition: output_gt true when value greater', () => {
  const cond: ChainCondition = { type: 'output_gt', stepIndex: 0, outputKey: 'score', value: 7 };
  const outputs = { score: 8 };
  assert.ok(evaluateCondition(cond, outputs, {}));
});

test('evaluateCondition: output_gt false when value not greater', () => {
  const cond: ChainCondition = { type: 'output_gt', stepIndex: 0, outputKey: 'score', value: 7 };
  const outputs = { score: 5 };
  assert.equal(evaluateCondition(cond, outputs, {}), false);
});

test('evaluateCondition: output_gt supports dotted outputKey path', () => {
  const cond: ChainCondition = { type: 'output_gt', stepIndex: 0, outputKey: 'hooks.hookStrength', value: 7 };
  const outputs = { hooks: { hookStrength: 9 } };
  assert.ok(evaluateCondition(cond, outputs, {}));
});

test('evaluateCondition: output_lt true when value less', () => {
  const cond: ChainCondition = { type: 'output_lt', stepIndex: 0, outputKey: 'score', value: 7 };
  const outputs = { score: 5 };
  assert.ok(evaluateCondition(cond, outputs, {}));
});

test('evaluateCondition: output_lt false when value not less', () => {
  const cond: ChainCondition = { type: 'output_lt', stepIndex: 0, outputKey: 'score', value: 7 };
  const outputs = { score: 9 };
  assert.equal(evaluateCondition(cond, outputs, {}), false);
});

test('evaluateCondition: output_equals matches string value', () => {
  const cond: ChainCondition = { type: 'output_equals', stepIndex: 0, outputKey: 'status', value: 'ready' };
  const outputs = { status: 'ready' };
  assert.ok(evaluateCondition(cond, outputs, {}));
});

test('evaluateCondition: output_equals false when mismatch', () => {
  const cond: ChainCondition = { type: 'output_equals', stepIndex: 0, outputKey: 'status', value: 'ready' };
  const outputs = { status: 'pending' };
  assert.equal(evaluateCondition(cond, outputs, {}), false);
});

test('evaluateCondition: platform_is matches chain input platform', () => {
  const cond: ChainCondition = { type: 'platform_is', value: 'tiktok' };
  assert.ok(evaluateCondition(cond, {}, { platform: 'tiktok' }));
});

test('evaluateCondition: platform_is false when platform differs', () => {
  const cond: ChainCondition = { type: 'platform_is', value: 'tiktok' };
  assert.equal(evaluateCondition(cond, {}, { platform: 'instagram' }), false);
});

test('evaluateCondition: output_gt returns false for non-numeric output', () => {
  const cond: ChainCondition = { type: 'output_gt', stepIndex: 0, outputKey: 'score', value: 7 };
  const outputs = { score: 'not-a-number' };
  assert.equal(evaluateCondition(cond, outputs, {}), false);
});

test('evaluateCondition: output_contains coerces object output to string', () => {
  const cond: ChainCondition = { type: 'output_contains', stepIndex: 0, outputKey: 'data', value: 'hello' };
  const outputs = { data: { msg: 'hello world' } };
  // JSON.stringify includes "hello"
  assert.ok(evaluateCondition(cond, outputs, {}));
});

// ── buildEnhancedChain tests ──

test('buildEnhancedChain creates a chain with estimated credits', () => {
  const chain = buildEnhancedChain(
    'Test Chain',
    'A test chain',
    [
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience' },
        outputKey: 'hooks',
      },
      {
        skillId: 'script-writer',
        inputMappings: { product: 'product', hook: 'hooks' },
        outputKey: 'script',
      },
    ],
    { product: '', audience: '' },
  );
  assert.ok(chain.id.startsWith('enhanced-'));
  assert.equal(chain.name, 'Test Chain');
  assert.equal(chain.description, 'A test chain');
  assert.equal(chain.steps.length, 2);
  // hook-generator(2) + script-writer(4) = 6
  assert.equal(chain.estimatedCredits, 6);
});

test('buildEnhancedChain defaults inputs to empty object', () => {
  const chain = buildEnhancedChain('No Inputs', 'desc', [
    { skillId: 'hook-generator', inputMappings: { product: 'product' }, outputKey: 'hooks' },
  ]);
  assert.deepEqual(chain.inputs, {});
});

// ── validateEnhancedChain tests ──

test('validateEnhancedChain accepts a valid chain', () => {
  const chain = buildEnhancedChain(
    'Valid',
    'valid chain',
    [
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience' },
        outputKey: 'hooks',
        branches: [
          {
            label: 'to script',
            condition: { type: 'output_gt', stepIndex: 0, outputKey: 'hooks.hookStrength', value: 7 },
            branchToSkillId: 'script-writer',
            branchInputs: { product: 'product' },
          },
        ],
      },
    ],
    { product: '', audience: '' },
  );
  const { valid, errors } = validateEnhancedChain(chain);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateEnhancedChain rejects unknown branch skill', () => {
  const chain = buildEnhancedChain(
    'Bad Branch',
    'bad branch skill',
    [
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience' },
        outputKey: 'hooks',
        branches: [
          {
            label: 'to nowhere',
            condition: { type: 'output_gt', stepIndex: 0, outputKey: 'hooks.hookStrength', value: 7 },
            branchToSkillId: 'nonexistent-skill',
          },
        ],
      },
    ],
    { product: '', audience: '' },
  );
  const { valid, errors } = validateEnhancedChain(chain);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('unknown_skill')), `should report unknown skill: ${errors.join(',')}`);
});

test('validateEnhancedChain rejects branch with no target', () => {
  const chain = buildEnhancedChain(
    'No Target',
    'no target branch',
    [
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience' },
        outputKey: 'hooks',
        branches: [
          {
            label: 'dead end',
            condition: { type: 'output_gt', stepIndex: 0, outputKey: 'hooks.hookStrength', value: 7 },
          },
        ],
      },
    ],
    { product: '', audience: '' },
  );
  const { valid, errors } = validateEnhancedChain(chain);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('no_target')), `should report no target: ${errors.join(',')}`);
});

test('validateEnhancedChain rejects branch with missing label', () => {
  const chain = buildEnhancedChain(
    'No Label',
    'no label branch',
    [
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience' },
        outputKey: 'hooks',
        branches: [
          {
            label: '',
            condition: { type: 'output_gt', stepIndex: 0, outputKey: 'hooks.hookStrength', value: 7 },
            branchToSkillId: 'script-writer',
          },
        ],
      },
    ],
    { product: '', audience: '' },
  );
  const { valid, errors } = validateEnhancedChain(chain);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('missing_label')), `should report missing label: ${errors.join(',')}`);
});

test('validateEnhancedChain rejects empty steps', () => {
  const chain: EnhancedSkillChain = {
    id: 'empty',
    name: 'Empty',
    description: 'no steps',
    steps: [],
    inputs: {},
    estimatedCredits: 0,
  };
  const { valid, errors } = validateEnhancedChain(chain);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e === 'chain_no_steps'));
});

test('validateEnhancedChain rejects unknown chain branch reference', () => {
  const chain = buildEnhancedChain(
    'Bad Chain Ref',
    'bad chain ref',
    [
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience' },
        outputKey: 'hooks',
        branches: [
          {
            label: 'to bad chain',
            condition: { type: 'output_gt', stepIndex: 0, outputKey: 'hooks.hookStrength', value: 7 },
            branchToChainId: 'nonexistent-chain',
          },
        ],
      },
    ],
    { product: '', audience: '' },
  );
  const { valid, errors } = validateEnhancedChain(chain);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('unknown_chain')), `should report unknown chain: ${errors.join(',')}`);
});

// ── Built-in enhanced chains tests ──

test('exactly 3 built-in enhanced chains are defined', () => {
  assert.equal(BUILTIN_ENHANCED_CHAINS.length, 3);
  assert.equal(listEnhancedChains().length, 3);
});

test('all expected built-in enhanced chain ids are present', () => {
  const expectedIds = ['adaptive-hook-chain', 'platform-optimized-chain', 'performance-driven-chain'];
  const ids = BUILTIN_ENHANCED_CHAINS.map((c) => c.id);
  for (const id of expectedIds) {
    assert.ok(ids.includes(id), `expected enhanced chain "${id}" to be defined`);
  }
});

test('all built-in enhanced chain ids are unique', () => {
  const ids = BUILTIN_ENHANCED_CHAINS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate enhanced chain ids found');
});

test('every built-in enhanced chain has valid structure', () => {
  for (const chain of BUILTIN_ENHANCED_CHAINS) {
    assert.ok(typeof chain.id === 'string' && chain.id.length > 0, `${chain.id}: missing id`);
    assert.ok(typeof chain.name === 'string' && chain.name.length > 0, `${chain.id}: missing name`);
    assert.ok(typeof chain.description === 'string' && chain.description.length > 0, `${chain.id}: missing description`);
    assert.ok(Array.isArray(chain.steps) && chain.steps.length > 0, `${chain.id}: must have steps`);
    assert.ok(typeof chain.estimatedCredits === 'number' && chain.estimatedCredits > 0, `${chain.id}: invalid estimatedCredits`);
    assert.ok(typeof chain.inputs === 'object', `${chain.id}: missing inputs`);
  }
});

test('all built-in enhanced chains validate successfully', () => {
  for (const chain of BUILTIN_ENHANCED_CHAINS) {
    const { valid, errors } = validateEnhancedChain(chain);
    assert.ok(valid, `enhanced chain "${chain.id}" should be valid: ${errors.join(', ')}`);
    assert.equal(errors.length, 0, `enhanced chain "${chain.id}" should have no errors`);
  }
});

test('every built-in enhanced chain step has at least one branch', () => {
  for (const chain of BUILTIN_ENHANCED_CHAINS) {
    for (const step of chain.steps) {
      if (step.branches) {
        assert.ok(step.branches.length > 0, `${chain.id}: step should have at least one branch if branches defined`);
      }
    }
  }
});

test('adaptive-hook-chain branches to script-writer or hook-tester', () => {
  const chain = getEnhancedChain('adaptive-hook-chain')!;
  assert.ok(chain);
  const step0 = chain.steps[0];
  assert.ok(step0.branches);
  assert.equal(step0.branches!.length, 2);
  assert.ok(step0.branches!.some((b) => b.branchToSkillId === 'script-writer'));
  assert.ok(step0.branches!.some((b) => b.branchToSkillId === 'hook-tester'));
});

test('platform-optimized-chain branches based on platform', () => {
  const chain = getEnhancedChain('platform-optimized-chain')!;
  assert.ok(chain);
  const step0 = chain.steps[0];
  assert.ok(step0.branches);
  assert.ok(step0.branches!.some((b) => b.condition.type === 'platform_is'));
  assert.ok(step0.branches!.some((b) => b.branchToSkillId === 'platform-adapter'));
  assert.ok(step0.branches!.some((b) => b.branchToSkillId === 'variant-generator'));
});

test('performance-driven-chain branches based on predicted performance', () => {
  const chain = getEnhancedChain('performance-driven-chain')!;
  assert.ok(chain);
  assert.equal(chain.steps.length, 2);
  const step1 = chain.steps[1];
  assert.ok(step1.branches);
  assert.ok(step1.branches!.some((b) => b.branchToSkillId === 'variant-generator'));
  assert.ok(step1.branches!.some((b) => b.branchToSkillId === 'angle-explorer'));
});

test('getEnhancedChain returns undefined for unknown id', () => {
  assert.equal(getEnhancedChain('nonexistent'), undefined);
  assert.equal(getEnhancedChain(''), undefined);
});

// ── estimateEnhancedChainCredits tests ──

test('estimateEnhancedChainCredits sums step skill costs', () => {
  // adaptive-hook-chain: hook-generator(2) = 2 (branch skills not counted in estimate)
  const adaptive = getEnhancedChain('adaptive-hook-chain')!;
  assert.equal(estimateEnhancedChainCredits(adaptive), 2);

  // platform-optimized-chain: angle-explorer(3) = 3
  const platform = getEnhancedChain('platform-optimized-chain')!;
  assert.equal(estimateEnhancedChainCredits(platform), 3);

  // performance-driven-chain: variant-generator(3) + performance-predictor(5) = 8
  const perf = getEnhancedChain('performance-driven-chain')!;
  assert.equal(estimateEnhancedChainCredits(perf), 8);
});

// ── Dry-run execution tests ──
//
// These tests run executeEnhancedChain in dry-run mode. The Node test runner
// does not have ATLASCLOUD_API_KEY set, so isDryRun() returns true and no real
// LLM calls are made — deterministic placeholder outputs are returned instead.

test('dry-run execution returns a structured ChainExecutionResult', async () => {
  const chain = getEnhancedChain('adaptive-hook-chain')!;
  const result = await executeEnhancedChain(
    chain,
    { product: 'Test Product', audience: 'Test Audience', count: '3', cta: 'Buy Now' },
  );
  assert.equal(result.chainId, 'adaptive-hook-chain');
  assert.ok(Array.isArray(result.steps));
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].skillId, 'hook-generator');
  assert.equal(result.steps[0].success, true);
  assert.ok(typeof result.steps[0].duration === 'number');
  assert.ok(typeof result.totalDuration === 'number');
  assert.ok(typeof result.totalCreditsUsed === 'number');
  assert.ok(typeof result.finalOutputs === 'object');
  assert.ok(Array.isArray(result.branchPaths));
});

test('dry-run execution takes a branch when condition is met', async () => {
  const chain = getEnhancedChain('adaptive-hook-chain')!;
  // dryRunSkillOutputs for hook-generator returns hookStrength: 8 (> 7)
  // so the "Strong hook → write script" branch should be taken.
  const result = await executeEnhancedChain(
    chain,
    { product: 'Test Product', audience: 'Test Audience', count: '3', cta: 'Buy Now' },
  );
  assert.ok(result.branchPaths.length > 0, 'should have taken at least one branch');
  assert.ok(result.steps[0].branchesTaken && result.steps[0].branchesTaken!.length > 0);
});

test('dry-run execution of platform-optimized-chain takes tiktok branch', async () => {
  const chain = getEnhancedChain('platform-optimized-chain')!;
  const result = await executeEnhancedChain(
    chain,
    { product: 'Test Product', audience: 'Test Audience', platform: 'tiktok' },
  );
  assert.ok(result.branchPaths.length > 0);
  assert.ok(result.branchPaths.some((p) => p.includes('TikTok')));
});

test('dry-run execution of performance-driven-chain completes all steps', async () => {
  const chain = getEnhancedChain('performance-driven-chain')!;
  const result = await executeEnhancedChain(
    chain,
    { product: 'Test Product', audience: 'Test Audience', count: '3' },
  );
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0].skillId, 'variant-generator');
  assert.equal(result.steps[1].skillId, 'performance-predictor');
  // performance-predictor dry-run returns hookStrength: 7, which is < 8, so the
  // "Low performance → explore angles" branch should be taken.
  assert.ok(result.branchPaths.length > 0);
});

test('dry-run execution merges branch outputs into finalOutputs', async () => {
  const chain = getEnhancedChain('adaptive-hook-chain')!;
  const result = await executeEnhancedChain(
    chain,
    { product: 'Test Product', audience: 'Test Audience', count: '3', cta: 'Buy Now' },
  );
  // The main step output (hooks) should be present.
  assert.ok('hooks' in result.finalOutputs);
  // A branch output key (starts with branch_) should be present.
  const branchKeys = Object.keys(result.finalOutputs).filter((k) => k.startsWith('branch_'));
  assert.ok(branchKeys.length > 0, 'should have at least one branch output in finalOutputs');
});

test('dry-run execution throws on invalid chain', async () => {
  const invalid: EnhancedSkillChain = {
    id: 'invalid',
    name: 'Invalid',
    description: 'references unknown skill',
    steps: [{ skillId: 'nonexistent-skill', inputMappings: {}, outputKey: 'out' }],
    inputs: {},
    estimatedCredits: 0,
  };
  await assert.rejects(
    () => executeEnhancedChain(invalid, {}),
    /invalid_enhanced_chain/,
  );
});
