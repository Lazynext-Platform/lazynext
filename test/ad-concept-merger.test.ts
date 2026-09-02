import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_CONCEPT_MERGER_CREDIT_COST,
  validateAdConceptMergerInput,
  mergeConcepts,
  type AdConceptMergerInput,
  type ConceptInput,
  type ConceptType,
} from '../src/lib/creative/ad-concept-merger.ts';

function makeConcept(overrides: Partial<ConceptInput> = {}): ConceptInput {
  return {
    id: 'c1',
    type: 'hook',
    content: 'Stop scrolling — this changes everything.',
    ...overrides,
  };
}

function makeValidInput(overrides: Partial<AdConceptMergerInput> = {}): AdConceptMergerInput {
  return {
    concepts: [
      makeConcept({ id: 'c1', type: 'hook', content: 'Stop scrolling — this changes everything.' }),
      makeConcept({ id: 'c2', type: 'angle', content: 'Position as the premium must-have upgrade.' }),
    ],
    ...overrides,
  };
}

describe('ad-concept-merger', () => {
  describe('validation', () => {
    test('rejects missing concepts', () => {
      const result = validateAdConceptMergerInput({} as AdConceptMergerInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('concepts_required'));
    });

    test('rejects non-object input', () => {
      const result = validateAdConceptMergerInput(null as unknown as AdConceptMergerInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('input_required'));
    });

    test('rejects too few concepts', () => {
      const result = validateAdConceptMergerInput({
        ...makeValidInput(),
        concepts: [makeConcept()],
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('concepts_too_few'));
    });

    test('rejects too many concepts', () => {
      const result = validateAdConceptMergerInput({
        ...makeValidInput(),
        concepts: Array.from({ length: 11 }, (_, i) =>
          makeConcept({ id: `c${i}`, content: `concept ${i}` }),
        ),
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('concepts_too_many'));
    });

    test('rejects invalid concept type', () => {
      const result = validateAdConceptMergerInput({
        ...makeValidInput(),
        concepts: [
          makeConcept({ id: 'c1', type: 'invalid' as unknown as ConceptType, content: 'x' }),
          makeConcept({ id: 'c2', type: 'angle', content: 'y' }),
        ],
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('type_invalid')));
    });

    test('rejects concept with missing content', () => {
      const result = validateAdConceptMergerInput({
        ...makeValidInput(),
        concepts: [
          makeConcept({ id: 'c1', type: 'hook', content: '' }),
          makeConcept({ id: 'c2', type: 'angle', content: 'y' }),
        ],
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('content_required')));
    });

    test('rejects concept with missing id', () => {
      const result = validateAdConceptMergerInput({
        ...makeValidInput(),
        concepts: [
          makeConcept({ id: '', type: 'hook', content: 'x' }),
          makeConcept({ id: 'c2', type: 'angle', content: 'y' }),
        ],
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('id_required')));
    });

    test('rejects non-boolean dryRun', () => {
      const result = validateAdConceptMergerInput(
        makeValidInput({ dryRun: 'yes' as unknown as boolean }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('dry_run_invalid'));
    });

    test('accepts a valid minimal input', () => {
      const result = validateAdConceptMergerInput(makeValidInput());
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    test('accepts all four concept types', () => {
      const result = validateAdConceptMergerInput({
        concepts: [
          makeConcept({ id: 'c1', type: 'hook', content: 'hook' }),
          makeConcept({ id: 'c2', type: 'angle', content: 'angle' }),
          makeConcept({ id: 'c3', type: 'script', content: 'script' }),
          makeConcept({ id: 'c4', type: 'visual', content: 'visual' }),
        ],
      });
      assert.equal(result.valid, true);
    });

    test('accepts optional targetPlatform', () => {
      const result = validateAdConceptMergerInput(makeValidInput({ targetPlatform: 'tiktok' }));
      assert.equal(result.valid, true);
    });

    test('rejects empty-string targetPlatform', () => {
      const result = validateAdConceptMergerInput(makeValidInput({ targetPlatform: '   ' }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('target_platform_invalid'));
    });
  });

  describe('credit cost', () => {
    test('AD_CONCEPT_MERGER_CREDIT_COST is positive', () => {
      assert.ok(AD_CONCEPT_MERGER_CREDIT_COST > 0);
    });

    test('AD_CONCEPT_MERGER_CREDIT_COST is 5', () => {
      assert.equal(AD_CONCEPT_MERGER_CREDIT_COST, 5);
    });
  });

  describe('mergeConcepts (dry-run)', () => {
    const origBase = process.env.ATLASCLOUD_BASE;
    const origKey = process.env.ATLASCLOUD_API_KEY;

    test('returns a merged concept with correct structure', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await mergeConcepts(makeValidInput({ dryRun: true }));
        assert.ok(out, 'expected output');
        assert.equal(typeof out.merged.unifiedHook, 'string');
        assert.ok(out.merged.unifiedHook.length > 0);
        assert.equal(typeof out.merged.unifiedAngle, 'string');
        assert.ok(out.merged.unifiedAngle.length > 0);
        assert.equal(typeof out.merged.unifiedScript, 'string');
        assert.ok(out.merged.unifiedScript.length > 0);
        assert.equal(typeof out.merged.unifiedVisual, 'string');
        assert.ok(out.merged.unifiedVisual.length > 0);
        assert.ok(Array.isArray(out.merged.conflictResolutions));
        assert.ok(out.merged.conflictResolutions.length > 0);
        assert.ok(Array.isArray(out.merged.optimizationNotes));
        assert.ok(out.merged.optimizationNotes.length > 0);
        assert.equal(typeof out.merged.flowScore, 'number');
        assert.ok(out.merged.flowScore >= 0 && out.merged.flowScore <= 100);
        assert.equal(out.dryRun, true);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('dryRun flag is true when set explicitly', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await mergeConcepts(makeValidInput({ dryRun: true }));
        assert.equal(out.dryRun, true);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('rejects invalid input (too few concepts)', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() =>
          mergeConcepts({ concepts: [makeConcept()] } as AdConceptMergerInput),
        );
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('rejects invalid input (missing concepts)', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() =>
          mergeConcepts({} as AdConceptMergerInput),
        );
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('rejects invalid input (invalid type)', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() =>
          mergeConcepts({
            concepts: [
              makeConcept({ id: 'c1', type: 'bogus' as unknown as ConceptType, content: 'x' }),
              makeConcept({ id: 'c2', type: 'angle', content: 'y' }),
            ],
          } as AdConceptMergerInput),
        );
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('heuristic merge picks strongest hook', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await mergeConcepts({
          dryRun: true,
          concepts: [
            makeConcept({ id: 'c1', type: 'hook', content: 'short hook' }),
            makeConcept({ id: 'c2', type: 'hook', content: 'a much longer and stronger hook that should win' }),
            makeConcept({ id: 'c3', type: 'angle', content: 'premium positioning' }),
          ],
        });
        assert.ok(out.merged.unifiedHook.includes('a much longer and stronger hook'));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('merges angles by joining', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await mergeConcepts({
          dryRun: true,
          concepts: [
            makeConcept({ id: 'c1', type: 'angle', content: 'premium' }),
            makeConcept({ id: 'c2', type: 'angle', content: 'affordable' }),
          ],
        });
        assert.ok(out.merged.unifiedAngle.includes('premium'));
        assert.ok(out.merged.unifiedAngle.includes('affordable'));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('concatenates scripts', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await mergeConcepts({
          dryRun: true,
          concepts: [
            makeConcept({ id: 'c1', type: 'script', content: 'Scene one intro.' }),
            makeConcept({ id: 'c2', type: 'script', content: 'Scene two demo.' }),
          ],
        });
        assert.ok(out.merged.unifiedScript.includes('Scene one intro.'));
        assert.ok(out.merged.unifiedScript.includes('Scene two demo.'));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('flowScore is within 0-100', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await mergeConcepts(makeValidInput({ dryRun: true }));
        assert.ok(out.merged.flowScore >= 0);
        assert.ok(out.merged.flowScore <= 100);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });
  });
});
