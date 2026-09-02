import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  DirectorInput,
  DirectorStep,
  DirectorResult,
} from '@/lib/creative/director';

// ── Type shape instantiation (compile-time + runtime smoke) ──

test('DirectorInput accepts minimal shape', () => {
  const input: DirectorInput = {
    productUrl: 'https://example.com/product',
  };
  assert.equal(input.productUrl, 'https://example.com/product');
});

test('DirectorInput accepts full shape', () => {
  const input: DirectorInput = {
    brandUrl: 'https://example.com',
    productUrl: 'https://example.com/product',
    productText: 'A great widget',
    productName: 'Widget',
    platform: 'tiktok',
    format: '9x16',
    budgetCredits: 30,
    requireStepApproval: true,
    userId: 'user-123',
  };
  assert.equal(input.budgetCredits, 30);
  assert.equal(input.requireStepApproval, true);
});

test('DirectorStep accepts completed shape', () => {
  const step: DirectorStep<string> = {
    name: 'brief',
    status: 'completed',
    result: 'Brief generated',
    creditsSpent: 3,
  };
  assert.equal(step.name, 'brief');
  assert.equal(step.status, 'completed');
  assert.equal(step.creditsSpent, 3);
});

test('DirectorStep accepts failed shape', () => {
  const step: DirectorStep<unknown> = {
    name: 'hooks',
    status: 'failed',
    error: 'Generation failed',
    creditsSpent: 0,
  };
  assert.equal(step.status, 'failed');
  assert.equal(step.error, 'Generation failed');
});

test('DirectorStep accepts awaiting_approval shape', () => {
  const step: DirectorStep<unknown> = {
    name: 'script',
    status: 'awaiting_approval',
    creditsSpent: 0,
  };
  assert.equal(step.status, 'awaiting_approval');
});

test('DirectorResult accepts minimal shape', () => {
  const result: DirectorResult = {
    steps: [],
    totalCreditsSpent: 0,
    budgetCredits: 30,
  };
  assert.ok(Array.isArray(result.steps));
  assert.equal(result.steps.length, 0);
  assert.equal(result.totalCreditsSpent, 0);
});

test('DirectorResult accepts full shape with steps', () => {
  const step: DirectorStep<unknown> = {
    name: 'brief',
    status: 'completed',
    creditsSpent: 3,
  };
  const result: DirectorResult = {
    steps: [step],
    totalCreditsSpent: 3,
    budgetCredits: 30,
  };
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].name, 'brief');
  assert.equal(result.totalCreditsSpent, 3);
});
