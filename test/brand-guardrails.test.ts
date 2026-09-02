import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAND_GUARDRAILS_CREDIT_COST,
  validateBrandGuardrailsInput,
  checkBrandGuardrails,
  calculateBrandGrade,
  type BrandGuardrailsInput,
  type BrandKit,
  type BrandViolation,
  type BrandGuardrailsResult,
} from '../src/lib/creative/brand-guardrails.ts';

function makeValidInput(overrides: Partial<BrandGuardrailsInput> = {}): BrandGuardrailsInput {
  return {
    brief: 'Launch our new noise-cancelling headphones with a bold, energetic hook targeting remote workers.',
    script: 'Hey remote workers! Tired of distractions? Try Acme headphones today.',
    storyboard: 'Scene 1: close-up of headphones. Scene 2: person working peacefully.',
    brandKit: {
      brandName: 'Acme',
      tone: ['energetic', 'bold'],
      keywords: ['quality', 'affordable'],
      forbiddenWords: ['cheap'],
      colors: ['#FF0000', '#00B2FC'],
      fonts: ['Inter'],
    },
    ...overrides,
  };
}

describe('brand-guardrails', () => {
  describe('validation', () => {
    test('rejects missing brief', () => {
      const result = validateBrandGuardrailsInput({ brief: '', brandKit: {} });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('brief_required'));
    });

    test('rejects non-object input', () => {
      const result = validateBrandGuardrailsInput(null as unknown as BrandGuardrailsInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('input_required'));
    });

    test('accepts a valid minimal input', () => {
      const result = validateBrandGuardrailsInput(makeValidInput());
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    test('rejects missing brandKit', () => {
      const result = validateBrandGuardrailsInput({ brief: 'test' } as BrandGuardrailsInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('brand_kit_required'));
    });

    test('rejects non-boolean dryRun', () => {
      const result = validateBrandGuardrailsInput(
        makeValidInput({ dryRun: 'yes' as unknown as boolean }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('dry_run_invalid'));
    });

    test('accepts a boolean dryRun', () => {
      const result = validateBrandGuardrailsInput(makeValidInput({ dryRun: true }));
      assert.equal(result.valid, true);
    });

    test('rejects overly long brief', () => {
      const result = validateBrandGuardrailsInput(
        makeValidInput({ brief: 'x'.repeat(10001) }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('brief_too_long'));
    });

    test('rejects overly long script', () => {
      const result = validateBrandGuardrailsInput(
        makeValidInput({ script: 'x'.repeat(10001) }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('script_invalid'));
    });

    test('rejects overly long storyboard', () => {
      const result = validateBrandGuardrailsInput(
        makeValidInput({ storyboard: 'x'.repeat(10001) }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('storyboard_invalid'));
    });
  });

  describe('credit cost', () => {
    test('BRAND_GUARDRAILS_CREDIT_COST is positive', () => {
      assert.ok(BRAND_GUARDRAILS_CREDIT_COST > 0);
    });

    test('BRAND_GUARDRAILS_CREDIT_COST is 4', () => {
      assert.equal(BRAND_GUARDRAILS_CREDIT_COST, 4);
    });
  });

  describe('calculateBrandGrade', () => {
    test('90+ = A+', () => {
      assert.equal(calculateBrandGrade(90), 'A+');
      assert.equal(calculateBrandGrade(100), 'A+');
      assert.equal(calculateBrandGrade(95), 'A+');
    });

    test('80+ = A', () => {
      assert.equal(calculateBrandGrade(80), 'A');
      assert.equal(calculateBrandGrade(89), 'A');
    });

    test('70+ = B', () => {
      assert.equal(calculateBrandGrade(70), 'B');
      assert.equal(calculateBrandGrade(79), 'B');
    });

    test('60+ = C', () => {
      assert.equal(calculateBrandGrade(60), 'C');
      assert.equal(calculateBrandGrade(69), 'C');
    });

    test('40+ = D', () => {
      assert.equal(calculateBrandGrade(40), 'D');
      assert.equal(calculateBrandGrade(59), 'D');
    });

    test('<40 = F', () => {
      assert.equal(calculateBrandGrade(39), 'F');
      assert.equal(calculateBrandGrade(0), 'F');
    });
  });

  describe('checkBrandGuardrails (dry-run)', () => {
    const origBase = process.env.ATLASCLOUD_BASE;
    const origKey = process.env.ATLASCLOUD_API_KEY;

    test('returns a result when dryRun flag is set', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await checkBrandGuardrails(makeValidInput({ dryRun: true }));
        assert.ok(out, 'expected output');
        assert.equal(typeof out.score, 'number');
        assert.ok(out.score >= 0 && out.score <= 100);
        assert.ok(Array.isArray(out.violations));
        assert.ok(Array.isArray(out.recommendations));
        assert.equal(typeof out.voiceConsistency, 'number');
        assert.equal(typeof out.visualConsistency, 'number');
        assert.equal(typeof out.messagingConsistency, 'number');
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('detects forbidden words as critical violations', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const input = makeValidInput({
          brief: 'These cheap headphones are the best cheap deal ever!',
          dryRun: true,
        });
        const out = await checkBrandGuardrails(input);
        const critical = out.violations.filter((v) => v.severity === 'critical');
        assert.ok(critical.length > 0, 'expected at least one critical violation');
        assert.ok(critical.some((v) => v.message.includes('Forbidden')));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('detects missing CTA as a warning', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const input = makeValidInput({
          brief: 'Acme headphones are great for remote workers.',
          script: 'They sound amazing and block all noise.',
          storyboard: 'Scene 1: headphones on desk.',
          dryRun: true,
        });
        const out = await checkBrandGuardrails(input);
        const warnings = out.violations.filter((v) => v.severity === 'warning');
        assert.ok(warnings.some((v) => v.message.includes('call-to-action')));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('returns no violations for a clean creative', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const input = makeValidInput({
          brief: 'Quality affordable headphones. Shop now!',
          script: 'Buy quality affordable headphones today.',
          storyboard: 'Scene 1: Inter font, #FF0000 background.',
          brandKit: {
            brandName: 'Acme',
            keywords: ['quality', 'affordable'],
            forbiddenWords: [],
            colors: ['#FF0000'],
            fonts: ['Inter'],
          },
          dryRun: true,
        });
        const out = await checkBrandGuardrails(input);
        assert.equal(out.violations.length, 0);
        assert.ok(out.recommendations.length > 0);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('throws on invalid input', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() =>
          checkBrandGuardrails({ brief: '', brandKit: {} } as BrandGuardrailsInput),
        );
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('score is weighted average of sub-scores', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await checkBrandGuardrails(makeValidInput({ dryRun: true }));
        const expected = Math.round(
          out.voiceConsistency * 0.4 + out.visualConsistency * 0.3 + out.messagingConsistency * 0.3,
        );
        assert.equal(out.score, expected);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });
  });

  describe('types', () => {
    test('BrandViolation has required fields', () => {
      const v: BrandViolation = {
        category: 'voice',
        severity: 'critical',
        message: 'Forbidden word used',
        detail: 'The word "cheap" appears in the script',
        recommendation: 'Replace with "affordable"',
      };
      assert.equal(v.category, 'voice');
      assert.equal(v.severity, 'critical');
      assert.ok(v.message.length > 0);
      assert.ok(v.detail.length > 0);
      assert.ok(v.recommendation.length > 0);
    });

    test('BrandGuardrailsResult has all required fields', () => {
      const r: BrandGuardrailsResult = {
        score: 85,
        grade: 'A',
        violations: [],
        recommendations: ['Looks good'],
        voiceConsistency: 90,
        visualConsistency: 80,
        messagingConsistency: 85,
      };
      assert.equal(r.score, 85);
      assert.equal(r.grade, 'A');
      assert.ok(Array.isArray(r.violations));
      assert.ok(Array.isArray(r.recommendations));
      assert.equal(r.voiceConsistency, 90);
      assert.equal(r.visualConsistency, 80);
      assert.equal(r.messagingConsistency, 85);
    });

    test('BrandKit accepts optional fields', () => {
      const kit: BrandKit = {
        brandName: 'Acme',
        tone: ['bold'],
        keywords: ['quality'],
        forbiddenWords: ['cheap'],
        colors: ['#FF0000'],
        fonts: ['Inter'],
        logoPlacement: 'bottom-right',
        claims: ['Best in class'],
        disclaimers: ['Results may vary'],
        ctaGuidelines: ['Use "Shop Now"'],
      };
      assert.equal(kit.brandName, 'Acme');
      assert.equal(kit.tone?.length, 1);
      assert.equal(kit.forbiddenWords?.[0], 'cheap');
    });
  });
});
