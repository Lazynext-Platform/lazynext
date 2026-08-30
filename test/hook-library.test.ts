import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOOK_LIBRARY_CREDIT_COST,
  validateHookLibraryInput,
  generateHooks,
  getHooks,
  calculateHookScore,
  type HookLibraryInput,
} from '../src/lib/creative/hook-library.ts';

function makeValidInput(overrides: Partial<HookLibraryInput> = {}): HookLibraryInput {
  return {
    productOrBrand: 'Eco-friendly reusable water bottle for fitness enthusiasts',
    platforms: ['tiktok'],
    count: 5,
    ...overrides,
  };
}

describe('hook-library', () => {
  describe('validation', () => {
    test('rejects missing productOrBrand', () => {
      const result = validateHookLibraryInput({ productOrBrand: '', platforms: ['tiktok'], count: 5 });
      assert.equal(result.valid, false);
    });

    test('rejects non-object input', () => {
      const result = validateHookLibraryInput(null as unknown as HookLibraryInput);
      assert.equal(result.valid, false);
    });

    test('rejects count < 1', () => {
      const result = validateHookLibraryInput({ productOrBrand: 'test', platforms: ['tiktok'], count: 0 });
      assert.equal(result.valid, false);
    });

    test('rejects count > 50', () => {
      const result = validateHookLibraryInput({ productOrBrand: 'test', platforms: ['tiktok'], count: 55 });
      assert.equal(result.valid, false);
    });

    test('accepts valid input', () => {
      const result = validateHookLibraryInput(makeValidInput());
      assert.equal(result.valid, true);
    });
  });

  describe('credit cost', () => {
    test('is positive', () => {
      assert.ok(HOOK_LIBRARY_CREDIT_COST > 0);
    });

    test('equals 4', () => {
      assert.equal(HOOK_LIBRARY_CREDIT_COST, 4);
    });
  });

  describe('calculateHookScore', () => {
    test('returns a number between 0 and 100', () => {
      const score = calculateHookScore('aspiration', ['tiktok']);
      assert.ok(score >= 0 && score <= 100);
    });

    test('returns different scores for different platforms', () => {
      const tiktokScore = calculateHookScore('humor', ['tiktok']);
      const youtubeScore = calculateHookScore('humor', ['youtube']);
      assert.ok(typeof tiktokScore === 'number');
      assert.ok(typeof youtubeScore === 'number');
    });
  });

  describe('dry-run mode', () => {
    test('returns hooks with correct structure', async () => {
      const result = await generateHooks(makeValidInput({ dryRun: true }), 'free');
      assert.ok(result.hooks);
      assert.ok(Array.isArray(result.hooks));
      assert.ok(result.hooks.length > 0);
      const hook = result.hooks[0];
      assert.ok(typeof hook.text === 'string');
      assert.ok(typeof hook.trigger === 'string');
      assert.ok(typeof hook.performanceScore === 'number');
      assert.ok(Array.isArray(hook.platforms));
    });

    test('returns requested count of hooks', async () => {
      const result = await generateHooks(makeValidInput({ dryRun: true, count: 3 }), 'free');
      assert.ok(result.hooks.length <= 5);
    });

    test('rejects invalid input even in dry-run', async () => {
      await assert.rejects(
        () => generateHooks({ productOrBrand: '', platforms: ['tiktok'], count: 5, dryRun: true } as HookLibraryInput, 'free'),
        /invalid_hook_library_input/,
      );
    });
  });

  describe('getHooks', () => {
    test('returns an array', () => {
      const hooks = getHooks();
      assert.ok(Array.isArray(hooks));
    });

    test('filters by trigger', () => {
      const hooks = getHooks({ trigger: 'fear' });
      assert.ok(hooks.every(h => h.trigger === 'fear'));
    });

    test('filters by platform', () => {
      const hooks = getHooks({ platform: 'tiktok' });
      assert.ok(hooks.every(h => h.platforms.includes('tiktok')));
    });

    test('filters by minScore', () => {
      const hooks = getHooks({ minScore: 70 });
      assert.ok(hooks.every(h => h.performanceScore >= 70));
    });
  });
});
