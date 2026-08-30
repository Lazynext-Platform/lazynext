import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MULTI_CONCEPT_CREDIT_COST,
  validateMultiConceptInput,
  generateMultiConcept,
  forkConcept,
  EMOTIONAL_TRIGGERS,
  type MultiConceptInput,
  type AdConcept,
  type EmotionalTrigger,
} from '../src/lib/creative/multi-concept.ts';

const ALL_TRIGGERS: EmotionalTrigger[] = [
  'fear',
  'aspiration',
  'humor',
  'urgency',
  'curiosity',
  'social_proof',
];

function makeValidInput(overrides: Partial<MultiConceptInput> = {}): MultiConceptInput {
  return {
    productOrBrand: 'Acme Noise-Cancelling Headphones',
    audience: 'remote workers',
    platform: 'tiktok',
    durationSeconds: 30,
    ...overrides,
  };
}

describe('multi-concept', () => {
  describe('validation', () => {
    test('rejects missing productOrBrand', () => {
      const result = validateMultiConceptInput({ productOrBrand: '' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('product_or_brand_required'));
    });

    test('rejects non-object input', () => {
      const result = validateMultiConceptInput(null as unknown as MultiConceptInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('input_required'));
    });

    test('accepts a valid minimal input', () => {
      const result = validateMultiConceptInput(makeValidInput());
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    test('rejects invalid productUrl', () => {
      const result = validateMultiConceptInput(makeValidInput({ productUrl: 'not-a-url' }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('product_url_invalid'));
    });

    test('accepts a valid productUrl', () => {
      const result = validateMultiConceptInput(
        makeValidInput({ productUrl: 'https://acme.com/headphones' }),
      );
      assert.equal(result.valid, true);
    });

    test('rejects out-of-range durationSeconds', () => {
      const result = validateMultiConceptInput(makeValidInput({ durationSeconds: 2 }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('duration_seconds_invalid'));
    });

    test('rejects non-array brandInfo.values', () => {
      const result = validateMultiConceptInput(
        makeValidInput({ brandInfo: { name: 'Acme', values: 'quality' as unknown as string[] } }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('brand_info_values_invalid'));
    });
  });

  describe('credit cost', () => {
    test('MULTI_CONCEPT_CREDIT_COST is positive', () => {
      assert.ok(MULTI_CONCEPT_CREDIT_COST > 0);
    });

    test('MULTI_CONCEPT_CREDIT_COST is 6', () => {
      assert.equal(MULTI_CONCEPT_CREDIT_COST, 6);
    });
  });

  describe('emotional trigger schema', () => {
    test('EMOTIONAL_TRIGGERS has exactly 6 entries', () => {
      assert.equal(EMOTIONAL_TRIGGERS.length, 6);
    });

    test('each trigger is unique and from the canonical set', () => {
      const seen = new Set<EmotionalTrigger>();
      for (const t of EMOTIONAL_TRIGGERS) {
        assert.ok(ALL_TRIGGERS.includes(t.trigger), `unknown trigger ${t.trigger}`);
        assert.ok(!seen.has(t.trigger), `duplicate trigger ${t.trigger}`);
        seen.add(t.trigger);
        assert.ok(t.name);
        assert.ok(t.description);
        assert.ok(t.hookSeed);
      }
    });
  });

  describe('generateMultiConcept (dry-run)', () => {
    // Force dry-run mode for deterministic local tests.
    const origBase = process.env.ATLASCLOUD_BASE;
    const origKey = process.env.ATLASCLOUD_API_KEY;
    test('returns exactly 6 concepts', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateMultiConcept(makeValidInput());
        assert.equal(out.concepts.length, 6);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('each emotional trigger is represented exactly once', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateMultiConcept(makeValidInput());
        const triggers = out.concepts.map((c) => c.trigger);
        assert.equal(triggers.length, 6);
        for (const t of ALL_TRIGGERS) {
          const count = triggers.filter((x) => x === t).length;
          assert.equal(count, 1, `trigger ${t} should appear exactly once`);
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('each concept has hook, angle, scriptOutline, visualDirection, cta', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateMultiConcept(makeValidInput());
        for (const c of out.concepts) {
          assert.ok(c.id, 'concept missing id');
          assert.ok(c.hook, 'concept missing hook');
          assert.ok(c.angle, 'concept missing angle');
          assert.ok(c.scriptOutline, 'concept missing scriptOutline');
          assert.ok(c.visualDirection, 'concept missing visualDirection');
          assert.ok(c.cta, 'concept missing cta');
          assert.ok(c.triggerDescription, 'concept missing triggerDescription');
          assert.ok(c.estimatedDuration > 0, 'concept missing estimatedDuration');
          assert.ok(c.targetEmotion, 'concept missing targetEmotion');
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('forkOptions are present', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateMultiConcept(makeValidInput());
        assert.ok(Array.isArray(out.forkOptions));
        assert.ok(out.forkOptions.length > 0);
        for (const f of out.forkOptions) {
          assert.ok(f.variation);
          assert.ok(f.description);
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('recommendedConcept references a real concept id', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateMultiConcept(makeValidInput());
        assert.ok(out.recommendedConcept);
        assert.ok(
          out.concepts.some((c) => c.id === out.recommendedConcept),
          'recommendedConcept id not found in concepts',
        );
        assert.ok(out.recommendationReason.length > 0);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('brandResearch is returned when productUrl is provided', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateMultiConcept(
          makeValidInput({ productUrl: 'https://acme.com/headphones' }),
        );
        assert.ok(out.brandResearch);
        assert.ok(out.brandResearch!.name);
        assert.ok(out.brandResearch!.positioning !== undefined);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('brandResearch is undefined when no productUrl', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateMultiConcept(makeValidInput());
        assert.equal(out.brandResearch, undefined);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('throws on invalid input', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() => generateMultiConcept({ productOrBrand: '' }));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });
  });

  describe('forkConcept (dry-run)', () => {
    const origBase = process.env.ATLASCLOUD_BASE;

    function makeConcept(overrides: Partial<AdConcept> = {}): AdConcept {
      return {
        id: 'concept_1_fear',
        trigger: 'fear',
        triggerDescription: "Don't miss out on",
        hook: "Don't miss out on Acme Headphones.",
        angle: 'Fear / Loss Aversion angle for Acme Headphones.',
        scriptOutline: 'Open with hook, reveal product, end with CTA.',
        visualDirection: 'Bold tiktok native visuals with fear framing.',
        cta: 'Shop Now',
        estimatedDuration: 30,
        targetEmotion: 'fear',
        ...overrides,
      };
    }

    test('returns the requested number of variants', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const forks = await forkConcept(makeConcept(), 3);
        assert.equal(forks.length, 3);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('each variant has a new unique id', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const base = makeConcept();
        const forks = await forkConcept(base, 4);
        const ids = forks.map((f) => f.id);
        assert.equal(new Set(ids).size, 4);
        for (const id of ids) {
          assert.ok(id.startsWith('concept_1_fear_fork_'), `unexpected id ${id}`);
          assert.notEqual(id, base.id);
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('variants preserve the original trigger', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const forks = await forkConcept(makeConcept({ trigger: 'curiosity' }), 2);
        for (const f of forks) {
          assert.equal(f.trigger, 'curiosity');
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });

    test('clamps count to 1..6', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const many = await forkConcept(makeConcept(), 99);
        assert.equal(many.length, 6);
        const few = await forkConcept(makeConcept(), 0);
        assert.equal(few.length, 1);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
      }
    });
  });
});
