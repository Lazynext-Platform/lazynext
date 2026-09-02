import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIEF_ANALYZER_CREDIT_COST,
  validateBriefAnalyzerInput,
  analyzeBrief,
  calculateBriefGrade,
  type BriefAnalyzerInput,
  type BriefSection,
  type BriefGap,
  type BriefAnalysis,
} from '../src/lib/creative/brief-analyzer.ts';

function makeValidInput(overrides: Partial<BriefAnalyzerInput> = {}): BriefAnalyzerInput {
  return {
    briefText:
      'Launch our new noise-cancelling headphones targeting remote workers aged 25-40. ' +
      'Value proposition: premium sound quality at an affordable price. Hook: "Silence the noise." ' +
      'CTA: Shop now. Visual direction: clean, minimal, blue tones. Platform: TikTok and Instagram. ' +
      'Budget: $5000. Timeline: launch by Q3. Success metrics: 2% CTR, 3x ROAS.',
    industry: 'tech',
    ...overrides,
  };
}

describe('brief-analyzer', () => {
  describe('validation', () => {
    test('rejects missing briefText', () => {
      const result = validateBriefAnalyzerInput({ briefText: '' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('brief_text_required'));
    });

    test('rejects non-object input', () => {
      const result = validateBriefAnalyzerInput(null as unknown as BriefAnalyzerInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('input_required'));
    });

    test('rejects briefText that is too short (< 50 chars)', () => {
      const result = validateBriefAnalyzerInput({ briefText: 'short brief' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('brief_text_too_short'));
    });

    test('rejects briefText that is too long (> 10000 chars)', () => {
      const result = validateBriefAnalyzerInput({
        briefText: 'x'.repeat(10001),
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('brief_text_too_long'));
    });

    test('accepts a valid input', () => {
      const result = validateBriefAnalyzerInput(makeValidInput());
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    test('accepts valid input without optional industry', () => {
      const result = validateBriefAnalyzerInput({ briefText: makeValidInput().briefText });
      assert.equal(result.valid, true);
    });

    test('rejects non-boolean dryRun', () => {
      const result = validateBriefAnalyzerInput(
        makeValidInput({ dryRun: 'yes' as unknown as boolean }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('dry_run_invalid'));
    });

    test('accepts a boolean dryRun', () => {
      const result = validateBriefAnalyzerInput(makeValidInput({ dryRun: true }));
      assert.equal(result.valid, true);
    });

    test('rejects overly long industry', () => {
      const result = validateBriefAnalyzerInput(
        makeValidInput({ industry: 'x'.repeat(101) }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('industry_invalid'));
    });
  });

  describe('credit cost', () => {
    test('BRIEF_ANALYZER_CREDIT_COST is positive', () => {
      assert.ok(BRIEF_ANALYZER_CREDIT_COST > 0);
    });

    test('BRIEF_ANALYZER_CREDIT_COST is 4', () => {
      assert.equal(BRIEF_ANALYZER_CREDIT_COST, 4);
    });
  });

  describe('calculateBriefGrade', () => {
    test('90+ = A+', () => {
      assert.equal(calculateBriefGrade(90), 'A+');
      assert.equal(calculateBriefGrade(100), 'A+');
      assert.equal(calculateBriefGrade(95), 'A+');
    });

    test('80+ = A', () => {
      assert.equal(calculateBriefGrade(80), 'A');
      assert.equal(calculateBriefGrade(89), 'A');
    });

    test('70+ = B', () => {
      assert.equal(calculateBriefGrade(70), 'B');
      assert.equal(calculateBriefGrade(79), 'B');
    });

    test('60+ = C', () => {
      assert.equal(calculateBriefGrade(60), 'C');
      assert.equal(calculateBriefGrade(69), 'C');
    });

    test('40+ = D', () => {
      assert.equal(calculateBriefGrade(40), 'D');
      assert.equal(calculateBriefGrade(59), 'D');
    });

    test('<40 = F', () => {
      assert.equal(calculateBriefGrade(39), 'F');
      assert.equal(calculateBriefGrade(0), 'F');
    });
  });

  describe('analyzeBrief (dry-run)', () => {
    const origBase = process.env.ATLASCLOUD_BASE;
    const origKey = process.env.ATLASCLOUD_API_KEY;

    test('returns an analysis with the correct structure', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await analyzeBrief(makeValidInput({ dryRun: true }));
        assert.ok(out, 'expected output');
        assert.equal(out.dryRun, true);
        const a = out.analysis;
        assert.equal(typeof a.overallScore, 'number');
        assert.equal(typeof a.grade, 'string');
        assert.ok(Array.isArray(a.sections));
        assert.ok(Array.isArray(a.gaps));
        assert.ok(Array.isArray(a.strengths));
        assert.ok(Array.isArray(a.weaknesses));
        assert.ok(Array.isArray(a.recommendations));
        assert.equal(typeof a.predictedEffectiveness, 'string');
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('overall score is between 0 and 100', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await analyzeBrief(makeValidInput({ dryRun: true }));
        assert.ok(out.analysis.overallScore >= 0 && out.analysis.overallScore <= 100);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('sections array covers all expected section names', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await analyzeBrief(makeValidInput({ dryRun: true }));
        const names = out.analysis.sections.map((s) => s.name);
        const expected = [
          'target_audience',
          'value_proposition',
          'hooks',
          'cta',
          'visual_direction',
          'platform_specs',
          'budget',
          'timeline',
          'success_metrics',
        ];
        for (const e of expected) {
          assert.ok(names.includes(e), `expected section "${e}"`);
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('detects present sections in a complete brief', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await analyzeBrief(makeValidInput({ dryRun: true }));
        const present = out.analysis.sections.filter((s) => s.present);
        assert.ok(present.length > 0, 'expected at least one present section');
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('reports gaps for a sparse brief', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await analyzeBrief({
          briefText:
            'We want to make an ad about our new product for young people who like tech gadgets. ' +
            'It should be fun and engaging with a modern look.',
          dryRun: true,
        });
        assert.ok(out.analysis.gaps.length > 0, 'expected gaps for a sparse brief');
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('rejects invalid input (too short)', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() =>
          analyzeBrief({ briefText: 'too short' } as BriefAnalyzerInput),
        );
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('rejects invalid input (missing briefText)', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() =>
          analyzeBrief({ briefText: '' } as BriefAnalyzerInput),
        );
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('grade matches the overall score', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await analyzeBrief(makeValidInput({ dryRun: true }));
        assert.equal(out.analysis.grade, calculateBriefGrade(out.analysis.overallScore));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('predictedEffectiveness is a non-empty string', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await analyzeBrief(makeValidInput({ dryRun: true }));
        assert.ok(out.analysis.predictedEffectiveness.length > 0);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });
  });

  describe('types', () => {
    test('BriefSection has required fields', () => {
      const s: BriefSection = {
        name: 'target_audience',
        present: true,
        quality: 'strong',
        content: 'Remote workers aged 25-40',
      };
      assert.equal(s.name, 'target_audience');
      assert.equal(s.present, true);
      assert.equal(s.quality, 'strong');
      assert.ok(s.content!.length > 0);
    });

    test('BriefSection accepts missing quality without content', () => {
      const s: BriefSection = {
        name: 'budget',
        present: false,
        quality: 'missing',
      };
      assert.equal(s.present, false);
      assert.equal(s.quality, 'missing');
      assert.equal(s.content, undefined);
    });

    test('BriefGap has required fields', () => {
      const g: BriefGap = {
        element: 'cta',
        impact: 'high',
        recommendation: 'Add a clear call-to-action',
      };
      assert.equal(g.element, 'cta');
      assert.equal(g.impact, 'high');
      assert.ok(g.recommendation.length > 0);
    });

    test('BriefAnalysis has all required fields', () => {
      const a: BriefAnalysis = {
        overallScore: 75,
        grade: 'B',
        sections: [],
        gaps: [],
        strengths: ['Good audience definition'],
        weaknesses: ['Missing CTA'],
        recommendations: ['Add a CTA'],
        predictedEffectiveness: 'Moderately effective',
      };
      assert.equal(a.overallScore, 75);
      assert.equal(a.grade, 'B');
      assert.ok(Array.isArray(a.sections));
      assert.ok(Array.isArray(a.gaps));
      assert.ok(Array.isArray(a.strengths));
      assert.ok(Array.isArray(a.weaknesses));
      assert.ok(Array.isArray(a.recommendations));
      assert.equal(a.predictedEffectiveness, 'Moderately effective');
    });
  });
});
