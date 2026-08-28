import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Skill Library.
 *
 * Tests only the pure data structures and helper functions (getSkill, search,
 * category filtering, chain validation, credit estimation). The execute
 * functions are NOT invoked — they depend on atlasChat / provider routing
 * which the Node test runner cannot resolve.
 */
import {
  BUILTIN_SKILLS,
  BUILTIN_CHAINS,
  getSkill,
  getSkillsByCategory,
  searchSkills,
  getChain,
  listSkills,
  listChains,
  validateChain,
  estimateChainCredits,
  type CreativeSkill,
  type SkillChain,
  type SkillCategory,
  type SkillComplexity,
} from '@/lib/creative/skill-library';

// ── Expected skill ids (15) ──

const EXPECTED_SKILL_IDS = [
  'hook-generator',
  'angle-explorer',
  'script-writer',
  'storyboard-creator',
  'visual-direction',
  'audio-suggestion',
  'platform-adapter',
  'audience-analyzer',
  'competitor-analyzer',
  'performance-predictor',
  'hook-tester',
  'cta-optimizer',
  'trend-researcher',
  'brand-aligner',
  'variant-generator',
];

const EXPECTED_CHAIN_IDS = [
  'full-pipeline',
  'hook-optimization',
  'competitive-analysis',
  'audience-first',
  'performance-tuning',
];

const VALID_CATEGORIES: SkillCategory[] = [
  'hook', 'angle', 'script', 'storyboard', 'visual', 'audio',
  'platform', 'strategy', 'analysis', 'optimization',
];

const VALID_COMPLEXITIES: SkillComplexity[] = ['basic', 'intermediate', 'advanced'];

// ── Skill structure tests ──

test('exactly 15 built-in skills are defined', () => {
  assert.equal(BUILTIN_SKILLS.length, 15);
  assert.equal(listSkills().length, 15);
});

test('all expected skill ids are present', () => {
  const ids = BUILTIN_SKILLS.map((s) => s.id);
  for (const id of EXPECTED_SKILL_IDS) {
    assert.ok(ids.includes(id), `expected skill "${id}" to be defined`);
  }
});

test('all skill ids are unique', () => {
  const ids = BUILTIN_SKILLS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate skill ids found');
});

test('every built-in skill has valid structure', () => {
  for (const skill of BUILTIN_SKILLS) {
    assert.ok(typeof skill.id === 'string' && skill.id.length > 0, `${skill.id}: missing id`);
    assert.ok(typeof skill.name === 'string' && skill.name.length > 0, `${skill.id}: missing name`);
    assert.ok(typeof skill.description === 'string' && skill.description.length > 0, `${skill.id}: missing description`);
    assert.ok(VALID_CATEGORIES.includes(skill.category), `${skill.id}: invalid category ${skill.category}`);
    assert.ok(VALID_COMPLEXITIES.includes(skill.complexity), `${skill.id}: invalid complexity ${skill.complexity}`);
    assert.ok(Array.isArray(skill.inputs) && skill.inputs.length > 0, `${skill.id}: must have inputs`);
    assert.ok(Array.isArray(skill.outputs) && skill.outputs.length > 0, `${skill.id}: must have outputs`);
    assert.ok(typeof skill.promptTemplate === 'string' && skill.promptTemplate.length > 0, `${skill.id}: missing promptTemplate`);
    assert.ok(Array.isArray(skill.chainableWith), `${skill.id}: chainableWith must be array`);
    assert.ok(typeof skill.estimatedCredits === 'number' && skill.estimatedCredits > 0, `${skill.id}: invalid estimatedCredits`);
    assert.ok(Array.isArray(skill.tags) && skill.tags.length > 0, `${skill.id}: must have tags`);
  }
});

test('every skill input has valid structure', () => {
  for (const skill of BUILTIN_SKILLS) {
    for (const inp of skill.inputs) {
      assert.ok(typeof inp.name === 'string' && inp.name.length > 0, `${skill.id}: input missing name`);
      assert.ok(['text', 'url', 'image', 'video', 'json', 'select'].includes(inp.type), `${skill.id}: input ${inp.name} invalid type`);
      assert.ok(typeof inp.required === 'boolean', `${skill.id}: input ${inp.name} required must be boolean`);
      assert.ok(typeof inp.description === 'string', `${skill.id}: input ${inp.name} missing description`);
      if (inp.type === 'select') {
        assert.ok(Array.isArray(inp.options) && inp.options!.length > 0, `${skill.id}: select input ${inp.name} must have options`);
      }
    }
  }
});

test('every skill output has valid structure', () => {
  for (const skill of BUILTIN_SKILLS) {
    for (const out of skill.outputs) {
      assert.ok(typeof out.name === 'string' && out.name.length > 0, `${skill.id}: output missing name`);
      assert.ok(['text', 'json', 'image', 'video'].includes(out.type), `${skill.id}: output ${out.name} invalid type`);
      assert.ok(typeof out.description === 'string', `${skill.id}: output ${out.name} missing description`);
    }
  }
});

test('skills cover all 10 categories', () => {
  const cats = new Set(BUILTIN_SKILLS.map((s) => s.category));
  for (const c of VALID_CATEGORIES) {
    assert.ok(cats.has(c), `category "${c}" has no skills`);
  }
});

test('estimated credits match the spec for each skill', () => {
  const expected: Record<string, number> = {
    'hook-generator': 2,
    'angle-explorer': 3,
    'script-writer': 4,
    'storyboard-creator': 3,
    'visual-direction': 2,
    'audio-suggestion': 1,
    'platform-adapter': 3,
    'audience-analyzer': 4,
    'competitor-analyzer': 5,
    'performance-predictor': 5,
    'hook-tester': 3,
    'cta-optimizer': 2,
    'trend-researcher': 4,
    'brand-aligner': 3,
    'variant-generator': 3,
  };
  for (const skill of BUILTIN_SKILLS) {
    assert.equal(skill.estimatedCredits, expected[skill.id], `${skill.id}: credits mismatch`);
  }
});

// ── Lookup & query tests ──

test('getSkill returns the skill by id and undefined for unknown', () => {
  assert.ok(getSkill('hook-generator'), 'hook-generator should be found');
  assert.equal(getSkill('hook-generator')?.name, 'Hook Generator');
  assert.equal(getSkill('nonexistent'), undefined);
  assert.equal(getSkill(''), undefined);
});

test('getSkillsByCategory filters correctly', () => {
  const hooks = getSkillsByCategory('hook');
  assert.ok(hooks.length >= 2, 'hook category should have at least 2 skills');
  for (const s of hooks) assert.equal(s.category, 'hook');

  const strategy = getSkillsByCategory('strategy');
  for (const s of strategy) assert.equal(s.category, 'strategy');
});

test('searchSkills matches name, description, id, and tags', () => {
  const byName = searchSkills('hook');
  assert.ok(byName.some((s) => s.id === 'hook-generator'), 'search "hook" should find hook-generator');
  assert.ok(byName.some((s) => s.id === 'hook-tester'), 'search "hook" should find hook-tester');

  const byTag = searchSkills('copywriting');
  assert.ok(byTag.some((s) => s.id === 'hook-generator'), 'search "copywriting" tag should find hook-generator');

  const byId = searchSkills('cta-optimizer');
  assert.ok(byId.some((s) => s.id === 'cta-optimizer'), 'search "cta-optimizer" should find cta-optimizer');

  // Empty query returns all skills.
  assert.equal(searchSkills('').length, BUILTIN_SKILLS.length);
  assert.equal(searchSkills('   ').length, BUILTIN_SKILLS.length);

  // No match returns empty.
  assert.equal(searchSkills('zzzznotarealskill').length, 0);
});

// ── Chain structure tests ──

test('exactly 5 built-in chains are defined', () => {
  assert.equal(BUILTIN_CHAINS.length, 5);
  assert.equal(listChains().length, 5);
});

test('all expected chain ids are present', () => {
  const ids = BUILTIN_CHAINS.map((c) => c.id);
  for (const id of EXPECTED_CHAIN_IDS) {
    assert.ok(ids.includes(id), `expected chain "${id}" to be defined`);
  }
});

test('all chain ids are unique', () => {
  const ids = BUILTIN_CHAINS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate chain ids found');
});

test('every built-in chain has valid structure', () => {
  for (const chain of BUILTIN_CHAINS) {
    assert.ok(typeof chain.id === 'string' && chain.id.length > 0, `${chain.id}: missing id`);
    assert.ok(typeof chain.name === 'string' && chain.name.length > 0, `${chain.id}: missing name`);
    assert.ok(typeof chain.description === 'string' && chain.description.length > 0, `${chain.id}: missing description`);
    assert.ok(Array.isArray(chain.steps) && chain.steps.length > 0, `${chain.id}: must have steps`);
    assert.ok(typeof chain.totalCredits === 'number' && chain.totalCredits > 0, `${chain.id}: invalid totalCredits`);

    const outputKeys = new Set<string>();
    for (const step of chain.steps) {
      assert.ok(typeof step.skillId === 'string' && step.skillId.length > 0, `${chain.id}: step missing skillId`);
      assert.ok(getSkill(step.skillId), `${chain.id}: step references unknown skill ${step.skillId}`);
      assert.ok(typeof step.outputKey === 'string' && step.outputKey.length > 0, `${chain.id}: step missing outputKey`);
      assert.ok(!outputKeys.has(step.outputKey), `${chain.id}: duplicate outputKey ${step.outputKey}`);
      outputKeys.add(step.outputKey);
      assert.ok(typeof step.inputMappings === 'object', `${chain.id}: step missing inputMappings`);
    }
  }
});

test('getChain returns the chain by id and undefined for unknown', () => {
  assert.ok(getChain('full-pipeline'), 'full-pipeline should be found');
  assert.equal(getChain('full-pipeline')?.name, 'Full Creative Pipeline');
  assert.equal(getChain('nonexistent'), undefined);
  assert.equal(getChain(''), undefined);
});

// ── Chain validation tests ──

test('all built-in chains validate successfully', () => {
  for (const chain of BUILTIN_CHAINS) {
    const { valid, errors } = validateChain(chain);
    assert.ok(valid, `chain "${chain.id}" should be valid: ${errors.join(', ')}`);
    assert.equal(errors.length, 0, `chain "${chain.id}" should have no errors`);
  }
});

test('validateChain rejects unknown skill ids', () => {
  const bad: SkillChain = {
    id: 'bad-chain',
    name: 'Bad Chain',
    description: 'References a nonexistent skill',
    steps: [{ skillId: 'nonexistent-skill', inputMappings: {}, outputKey: 'out' }],
    totalCredits: 1,
  };
  const { valid, errors } = validateChain(bad);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('unknown_skill')), `should report unknown skill: ${errors.join(',')}`);
});

test('validateChain rejects missing required inputs', () => {
  // script-writer requires "product"; provide a step with no mapping for it.
  const bad: SkillChain = {
    id: 'bad-required',
    name: 'Bad Required',
    description: 'Missing required input mapping',
    steps: [{ skillId: 'script-writer', inputMappings: { angle: 'angle' }, outputKey: 'script' }],
    totalCredits: 4,
  };
  const { valid, errors } = validateChain(bad);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('missing_required_input:product')), `should report missing product: ${errors.join(',')}`);
});

test('validateChain rejects duplicate output keys', () => {
  const bad: SkillChain = {
    id: 'bad-dup',
    name: 'Bad Dup',
    description: 'Duplicate output keys',
    steps: [
      { skillId: 'hook-generator', inputMappings: { product: 'product', audience: 'audience' }, outputKey: 'out' },
      { skillId: 'cta-optimizer', inputMappings: { cta: 'cta' }, outputKey: 'out' },
    ],
    totalCredits: 4,
  };
  const { valid, errors } = validateChain(bad);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('duplicate_output_key:out')), `should report duplicate output key: ${errors.join(',')}`);
});

test('validateChain rejects empty steps', () => {
  const bad: SkillChain = {
    id: 'bad-empty',
    name: 'Bad Empty',
    description: 'No steps',
    steps: [],
    totalCredits: 0,
  };
  const { valid, errors } = validateChain(bad);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e === 'chain_no_steps'), `should report no steps: ${errors.join(',')}`);
});

// ── Credit estimation tests ──

test('estimateChainCredits sums step skill costs', () => {
  // full-pipeline: hook(2) + angle(3) + script(4) + storyboard(3) + visual(2) + platform(3) = 17
  const full = getChain('full-pipeline')!;
  assert.equal(estimateChainCredits(full), 17);
  assert.equal(estimateChainCredits(full), full.totalCredits);

  // hook-optimization: hook(2) + hook-tester(3) + cta(2) = 7
  const hookOpt = getChain('hook-optimization')!;
  assert.equal(estimateChainCredits(hookOpt), 7);
  assert.equal(estimateChainCredits(hookOpt), hookOpt.totalCredits);

  // competitive-analysis: competitor(5) + trend(4) + angle(3) = 12
  const comp = getChain('competitive-analysis')!;
  assert.equal(estimateChainCredits(comp), 12);
  assert.equal(estimateChainCredits(comp), comp.totalCredits);

  // audience-first: audience(4) + hook(2) + script(4) = 10
  const aud = getChain('audience-first')!;
  assert.equal(estimateChainCredits(aud), 10);
  assert.equal(estimateChainCredits(aud), aud.totalCredits);

  // performance-tuning: variant(3) + performance(5) + platform(3) = 11
  const perf = getChain('performance-tuning')!;
  assert.equal(estimateChainCredits(perf), 11);
  assert.equal(estimateChainCredits(perf), perf.totalCredits);
});

test('estimateChainCredits returns 0 for unknown skills in steps', () => {
  const chain: SkillChain = {
    id: 'unknown-credits',
    name: 'Unknown',
    description: 'Step with unknown skill',
    steps: [{ skillId: 'nonexistent', inputMappings: {}, outputKey: 'out' }],
    totalCredits: 0,
  };
  assert.equal(estimateChainCredits(chain), 0);
});

// ── Chainability tests ──

test('chainableWith references only existing skill ids', () => {
  const allIds = new Set(BUILTIN_SKILLS.map((s) => s.id));
  for (const skill of BUILTIN_SKILLS) {
    for (const target of skill.chainableWith) {
      assert.ok(allIds.has(target), `${skill.id}: chainableWith references unknown skill ${target}`);
    }
  }
});

test('built-in chain steps reference skills declared in chainableWith where applicable', () => {
  // For each chain, every consecutive step's skill should be chainable from the prior step's skill.
  for (const chain of BUILTIN_CHAINS) {
    for (let i = 0; i < chain.steps.length - 1; i += 1) {
      const current = getSkill(chain.steps[i].skillId)!;
      const next = chain.steps[i + 1].skillId;
      assert.ok(
        current.chainableWith.includes(next),
        `chain "${chain.id}": ${current.id} should be chainableWith ${next}`,
      );
    }
  }
});
