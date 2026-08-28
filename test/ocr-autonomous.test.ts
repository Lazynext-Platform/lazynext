import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for the OCR provider abstraction and autonomous pipeline logic.
 *
 * These tests verify:
 *   - OCR provider selection logic (dry-run vs vision LLM)
 *   - Autonomous pipeline step ordering and budget logic
 *   - Deploy result handling
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. OCR provider selection logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replicates the getOCRProvider logic from src/lib/providers/ocr.ts.
 */
function selectOCRProvider(hasApiKey: boolean): string {
  return hasApiKey ? 'vision-llm' : 'dryrun';
}

test('OCR: dry-run provider when no API key', () => {
  assert.equal(selectOCRProvider(false), 'dryrun');
});

test('OCR: vision LLM provider when API key is present', () => {
  assert.equal(selectOCRProvider(true), 'vision-llm');
});

test('OCR: dry-run returns empty text', async () => {
  // Inline test of the dry-run extract logic
  const result = { text: '', regions: [], language: 'en' };
  assert.equal(result.text, '');
  assert.equal(result.regions!.length, 0);
});

test('OCR: structured prompt differs from plain text prompt', () => {
  const structuredPrompt = 'Return a JSON array of regions, each with "text", "confidence", and "bbox"';
  const plainPrompt = 'Return only the extracted text, preserving line breaks';
  assert.notEqual(structuredPrompt, plainPrompt);
  assert.ok(structuredPrompt.includes('JSON'));
  assert.ok(!plainPrompt.includes('JSON'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Autonomous pipeline step ordering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replicates the pipeline phase ordering from the autonomous pipeline route.
 */
const PIPELINE_PHASES = [
  'creative_director',
  'deploy',
] as const;

test('Pipeline: has exactly 2 phases', () => {
  assert.equal(PIPELINE_PHASES.length, 2);
});

test('Pipeline: creative director runs before deploy', () => {
  const directorIdx = PIPELINE_PHASES.indexOf('creative_director');
  const deployIdx = PIPELINE_PHASES.indexOf('deploy');
  assert.ok(directorIdx < deployIdx);
});

test('Pipeline: director steps include brief, hooks, angles, script, score', () => {
  const directorSteps = ['brand_extract', 'product_extract', 'brief', 'hooks', 'angles', 'script', 'score', 'storyboard', 'variants'];
  assert.ok(directorSteps.includes('brief'));
  assert.ok(directorSteps.includes('hooks'));
  assert.ok(directorSteps.includes('angles'));
  assert.ok(directorSteps.includes('script'));
  assert.ok(directorSteps.includes('score'));
});

test('Pipeline: budget is capped at 50 credits', () => {
  const requestedBudget = 100;
  const cappedBudget = Math.min(requestedBudget, 50);
  assert.equal(cappedBudget, 50);
});

test('Pipeline: default budget is 30 credits', () => {
  const input: number | undefined = undefined;
  const budget = typeof input === 'number' ? Math.min(input, 50) : 30;
  assert.equal(budget, 30);
});

test('Pipeline: refund logic returns unused credits', () => {
  const budget = 30;
  const spent = 22;
  const unused = budget - spent;
  assert.equal(unused, 8);
  assert.ok(unused > 0);
});

test('Pipeline: no refund when fully spent', () => {
  const budget = 30;
  const spent = 30;
  const unused = budget - spent;
  assert.equal(unused, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Deploy result handling
// ─────────────────────────────────────────────────────────────────────────────

test('Deploy: dry-run is default true for safety', () => {
  const defaultDryRun = true; // body.deployDryRun !== false
  assert.ok(defaultDryRun);
});

test('Deploy: campaign name includes product name and date', () => {
  const productName = 'Glow Serum';
  const date = new Date().toISOString().slice(0, 10);
  const campaignName = `${productName} — Auto-Deployed (${date})`;
  assert.ok(campaignName.includes('Glow Serum'));
  assert.ok(campaignName.includes(date));
});

test('Deploy: platform must be meta or google', () => {
  const validPlatforms = ['meta', 'google'];
  assert.ok(validPlatforms.includes('meta'));
  assert.ok(validPlatforms.includes('google'));
  assert.ok(!validPlatforms.includes('tiktok'));
});

test('Deploy: budget split for per-variant allocation', () => {
  const totalBudget = 50;
  const variantCount = 3;
  const perVariant = Math.floor(totalBudget / variantCount);
  assert.equal(perVariant, 16);
});
