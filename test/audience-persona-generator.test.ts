import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIENCE_PERSONA_GENERATOR_CREDIT_COST,
  validateAudiencePersonaGeneratorInput,
  generatePersonas,
  VALID_INDUSTRIES,
  type AudiencePersonaGeneratorInput,
} from '../src/lib/creative/audience-persona-generator.ts';

function makeValidInput(overrides: Partial<AudiencePersonaGeneratorInput> = {}): AudiencePersonaGeneratorInput {
  return {
    productOrBrand: 'A premium organic skincare serum targeting anti-aging concerns',
    ...overrides,
  };
}

describe('audience-persona-generator', () => {
  describe('validation', () => {
    test('rejects missing productOrBrand', () => {
      const result = validateAudiencePersonaGeneratorInput({ productOrBrand: '' });
      assert.equal(result.valid, false);
    });

    test('rejects non-object input', () => {
      const result = validateAudiencePersonaGeneratorInput(null as unknown as AudiencePersonaGeneratorInput);
      assert.equal(result.valid, false);
    });

    test('rejects productOrBrand over 2000 chars', () => {
      const result = validateAudiencePersonaGeneratorInput({ productOrBrand: 'x'.repeat(2001) });
      assert.equal(result.valid, false);
    });

    test('rejects invalid industry', () => {
      const result = validateAudiencePersonaGeneratorInput({ productOrBrand: 'test', industry: 'gaming' as never });
      assert.equal(result.valid, false);
    });

    test('rejects invalid targetMarket', () => {
      const result = validateAudiencePersonaGeneratorInput({ productOrBrand: 'test', targetMarket: 123 as unknown as string });
      assert.equal(result.valid, false);
    });

    test('accepts valid input', () => {
      const result = validateAudiencePersonaGeneratorInput(makeValidInput());
      assert.equal(result.valid, true);
    });

    test('accepts valid input with optional fields', () => {
      const result = validateAudiencePersonaGeneratorInput(makeValidInput({ industry: 'beauty', targetMarket: 'US millennials' }));
      assert.equal(result.valid, true);
    });
  });

  describe('credit cost', () => {
    test('is positive', () => {
      assert.ok(AUDIENCE_PERSONA_GENERATOR_CREDIT_COST > 0);
    });

    test('equals 4', () => {
      assert.equal(AUDIENCE_PERSONA_GENERATOR_CREDIT_COST, 4);
    });
  });

  describe('VALID_INDUSTRIES', () => {
    test('has all 8 industries', () => {
      assert.equal(VALID_INDUSTRIES.length, 8);
    });
  });

  describe('dry-run mode', () => {
    test('returns personas with correct structure', async () => {
      const result = await generatePersonas(makeValidInput({ dryRun: true }), 'free');
      assert.ok(result.personas);
      assert.ok(Array.isArray(result.personas));
      assert.ok(result.personas.length >= 3);
      assert.equal(result.dryRun, true);

      for (const persona of result.personas) {
        assert.ok(typeof persona.name === 'string' && persona.name.length > 0);
        assert.ok(typeof persona.tagline === 'string');
        assert.ok(persona.demographics && typeof persona.demographics === 'object');
        assert.ok(typeof persona.demographics.ageRange === 'string');
        assert.ok(typeof persona.demographics.gender === 'string');
        assert.ok(typeof persona.demographics.location === 'string');
        assert.ok(typeof persona.demographics.incomeLevel === 'string');
        assert.ok(typeof persona.demographics.education === 'string');
        assert.ok(persona.psychographics && typeof persona.psychographics === 'object');
        assert.ok(Array.isArray(persona.psychographics.values));
        assert.ok(Array.isArray(persona.psychographics.interests));
        assert.ok(typeof persona.psychographics.lifestyle === 'string');
        assert.ok(Array.isArray(persona.psychographics.personalityTraits));
        assert.ok(Array.isArray(persona.painPoints));
        for (const pp of persona.painPoints) {
          assert.ok(typeof pp.pain === 'string');
          assert.ok(typeof pp.howProductSolvesIt === 'string');
        }
        assert.ok(Array.isArray(persona.platformBehavior));
        for (const pb of persona.platformBehavior) {
          assert.ok(typeof pb.platform === 'string');
          assert.ok(typeof pb.usagePattern === 'string');
          assert.ok(typeof pb.contentPreferences === 'string');
          assert.ok(typeof pb.bestTimeToReach === 'string');
        }
        assert.ok(Array.isArray(persona.buyingMotivations));
        assert.ok(Array.isArray(persona.objections));
      }
    });

    test('rejects invalid input even in dry-run', async () => {
      await assert.rejects(
        () => generatePersonas({ productOrBrand: '', dryRun: true }, 'free'),
        /invalid_audience_persona_generator_input/,
      );
    });
  });
});
