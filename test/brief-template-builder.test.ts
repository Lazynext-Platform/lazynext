import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIEF_TEMPLATE_BUILDER_CREDIT_COST,
  validateBriefTemplateBuilderInput,
  buildBriefTemplate,
  INDUSTRY_PRESETS,
  VALID_INDUSTRIES,
  type BriefTemplateBuilderInput,
  type Industry,
} from '../src/lib/creative/brief-template-builder.ts';

function makeValidInput(overrides: Partial<BriefTemplateBuilderInput> = {}): BriefTemplateBuilderInput {
  return {
    industry: 'beauty' as Industry,
    productCategory: 'skincare serum',
    ...overrides,
  };
}

describe('brief-template-builder', () => {
  describe('validation', () => {
    test('rejects missing industry', () => {
      const result = validateBriefTemplateBuilderInput({ industry: '' as Industry, productCategory: 'test' });
      assert.equal(result.valid, false);
    });

    test('rejects non-object input', () => {
      const result = validateBriefTemplateBuilderInput(null as unknown as BriefTemplateBuilderInput);
      assert.equal(result.valid, false);
    });

    test('rejects invalid industry', () => {
      const result = validateBriefTemplateBuilderInput({ industry: 'gaming' as unknown as Industry, productCategory: 'test' });
      assert.equal(result.valid, false);
    });

    test('rejects missing productCategory', () => {
      const result = validateBriefTemplateBuilderInput({ industry: 'beauty', productCategory: '' });
      assert.equal(result.valid, false);
    });

    test('accepts valid input', () => {
      const result = validateBriefTemplateBuilderInput(makeValidInput());
      assert.equal(result.valid, true);
    });
  });

  describe('credit cost', () => {
    test('is positive', () => {
      assert.ok(BRIEF_TEMPLATE_BUILDER_CREDIT_COST > 0);
    });

    test('equals 4', () => {
      assert.equal(BRIEF_TEMPLATE_BUILDER_CREDIT_COST, 4);
    });
  });

  describe('INDUSTRY_PRESETS', () => {
    test('has all 8 industries', () => {
      assert.equal(Object.keys(INDUSTRY_PRESETS).length, 8);
    });

    test('includes beauty, tech, food, fashion, fitness, home, finance, travel', () => {
      for (const ind of VALID_INDUSTRIES) {
        assert.ok(INDUSTRY_PRESETS[ind], `missing preset for ${ind}`);
      }
    });

    test('each preset has targetAudience and valueProps', () => {
      for (const [name, preset] of Object.entries(INDUSTRY_PRESETS)) {
        assert.ok(preset.targetAudience, `${name} missing targetAudience`);
        assert.ok(preset.valueProps, `${name} missing valueProps`);
      }
    });
  });

  describe('dry-run mode', () => {
    test('returns template with correct structure', async () => {
      const result = await buildBriefTemplate(makeValidInput({ dryRun: true }), 'free');
      assert.ok(result.template);
      assert.ok(typeof result.template.targetAudience === 'string');
      assert.ok(Array.isArray(result.template.valueProps));
      assert.ok(Array.isArray(result.template.hooks));
      assert.ok(Array.isArray(result.template.angles));
      assert.ok(Array.isArray(result.template.visualDirection));
      assert.ok(Array.isArray(result.template.platformRecommendations));
      assert.ok(Array.isArray(result.template.complianceNotes));
    });

    test('uses industry preset in dry-run', async () => {
      const result = await buildBriefTemplate(makeValidInput({ industry: 'tech', dryRun: true }), 'free');
      assert.ok(result.template.targetAudience.length > 0);
    });

    test('rejects invalid input even in dry-run', async () => {
      await assert.rejects(
        () => buildBriefTemplate({ industry: 'gaming' as unknown as Industry, productCategory: 'test', dryRun: true }, 'free'),
        /invalid_brief_template_builder_input/,
      );
    });
  });
});
