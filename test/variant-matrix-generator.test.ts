import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  VARIANT_MATRIX_GENERATOR_CREDIT_COST,
  validateVariantMatrixGeneratorInput,
  generateVariantMatrix,
  type VariantMatrixGeneratorInput,
} from '../src/lib/creative/variant-matrix-generator.ts';

function makeValidInput(overrides: Partial<VariantMatrixGeneratorInput> = {}): VariantMatrixGeneratorInput {
  return {
    productOrBrand: 'Eco-friendly reusable water bottle for fitness enthusiasts',
    dimensions: ['hook', 'angle', 'format', 'platform'],
    platforms: ['tiktok', 'instagram'],
    count: 6,
    ...overrides,
  };
}

describe('variant-matrix-generator', () => {
  describe('validation', () => {
    test('rejects missing productOrBrand', () => {
      const result = validateVariantMatrixGeneratorInput({
        productOrBrand: '',
        dimensions: ['hook'],
        count: 6,
      });
      assert.equal(result.valid, false);
    });

    test('rejects non-object input', () => {
      const result = validateVariantMatrixGeneratorInput(null as unknown as VariantMatrixGeneratorInput);
      assert.equal(result.valid, false);
    });

    test('rejects count < 1', () => {
      const result = validateVariantMatrixGeneratorInput({
        productOrBrand: 'test',
        count: 0,
      });
      assert.equal(result.valid, false);
    });

    test('rejects count > 20', () => {
      const result = validateVariantMatrixGeneratorInput({
        productOrBrand: 'test',
        count: 25,
      });
      assert.equal(result.valid, false);
    });

    test('rejects productOrBrand over 2000 chars', () => {
      const result = validateVariantMatrixGeneratorInput({
        productOrBrand: 'x'.repeat(2001),
        count: 6,
      });
      assert.equal(result.valid, false);
    });

    test('accepts valid input', () => {
      const result = validateVariantMatrixGeneratorInput(makeValidInput());
      assert.equal(result.valid, true);
    });
  });

  describe('credit cost', () => {
    test('is positive', () => {
      assert.ok(VARIANT_MATRIX_GENERATOR_CREDIT_COST > 0);
    });

    test('equals 5', () => {
      assert.equal(VARIANT_MATRIX_GENERATOR_CREDIT_COST, 5);
    });
  });

  describe('dry-run mode', () => {
    test('returns variants with correct structure', async () => {
      const result = await generateVariantMatrix(makeValidInput({ dryRun: true }), 'free');
      assert.ok(result.variants);
      assert.ok(Array.isArray(result.variants));
      assert.ok(result.variants.length > 0);
      const v = result.variants[0];
      assert.ok(typeof v.id === 'string');
      assert.ok(typeof v.hook === 'string');
      assert.ok(typeof v.angle === 'string');
      assert.ok(typeof v.format === 'string');
      assert.ok(typeof v.platform === 'string');
      assert.ok(typeof v.predictedScore === 'number');
      assert.ok(v.predictedScore >= 0 && v.predictedScore <= 100);
      assert.ok(typeof v.rationale === 'string');
      assert.equal(result.dryRun, true);
      assert.ok(Array.isArray(result.dimensions));
    });

    test('returns requested count of variants', async () => {
      const result = await generateVariantMatrix(
        makeValidInput({ dryRun: true, count: 4 }),
        'free',
      );
      assert.equal(result.variants.length, 4);
    });

    test('rejects invalid input even in dry-run', async () => {
      await assert.rejects(
        () =>
          generateVariantMatrix(
            { productOrBrand: '', count: 6, dryRun: true } as VariantMatrixGeneratorInput,
            'free',
          ),
        /invalid_variant_matrix_input/,
      );
    });
  });
});
