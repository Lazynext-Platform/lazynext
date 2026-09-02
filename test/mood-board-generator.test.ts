import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOOD_BOARD_GENERATOR_CREDIT_COST,
  validateMoodBoardGeneratorInput,
  generateMoodBoard,
  type MoodBoardGeneratorInput,
} from '../src/lib/creative/mood-board-generator.ts';

function makeValidInput(overrides: Partial<MoodBoardGeneratorInput> = {}): MoodBoardGeneratorInput {
  return {
    productOrBrand: 'Eco-friendly reusable water bottle for fitness enthusiasts',
    styleKeywords: ['minimal', 'bold'],
    targetAudience: 'urban millennials',
    platform: 'instagram',
    ...overrides,
  };
}

describe('mood-board-generator', () => {
  describe('validation', () => {
    test('rejects missing productOrBrand', () => {
      const result = validateMoodBoardGeneratorInput({
        productOrBrand: '',
        styleKeywords: ['minimal'],
      });
      assert.equal(result.valid, false);
    });

    test('rejects non-object input', () => {
      const result = validateMoodBoardGeneratorInput(null as unknown as MoodBoardGeneratorInput);
      assert.equal(result.valid, false);
    });

    test('rejects productOrBrand over 2000 chars', () => {
      const result = validateMoodBoardGeneratorInput({
        productOrBrand: 'x'.repeat(2001),
      });
      assert.equal(result.valid, false);
    });

    test('rejects non-array styleKeywords', () => {
      const result = validateMoodBoardGeneratorInput({
        productOrBrand: 'test',
        styleKeywords: 'minimal' as unknown as string[],
      });
      assert.equal(result.valid, false);
    });

    test('accepts valid input', () => {
      const result = validateMoodBoardGeneratorInput(makeValidInput());
      assert.equal(result.valid, true);
    });

    test('accepts input with only productOrBrand', () => {
      const result = validateMoodBoardGeneratorInput({ productOrBrand: 'test product' });
      assert.equal(result.valid, true);
    });
  });

  describe('credit cost', () => {
    test('is positive', () => {
      assert.ok(MOOD_BOARD_GENERATOR_CREDIT_COST > 0);
    });

    test('equals 4', () => {
      assert.equal(MOOD_BOARD_GENERATOR_CREDIT_COST, 4);
    });
  });

  describe('dry-run mode', () => {
    test('returns mood board with correct structure', async () => {
      const result = await generateMoodBoard(makeValidInput({ dryRun: true }), 'free');
      assert.ok(result.moodBoard);
      const mb = result.moodBoard;
      assert.ok(mb.colorPalette);
      assert.ok(typeof mb.colorPalette.primary === 'string');
      assert.ok(typeof mb.colorPalette.secondary === 'string');
      assert.ok(typeof mb.colorPalette.accent === 'string');
      assert.ok(typeof mb.colorPalette.background === 'string');
      assert.ok(typeof mb.colorPalette.text === 'string');
      assert.ok(Array.isArray(mb.colorPalette.colors));
      assert.ok(mb.colorPalette.colors.length >= 4);
      assert.ok(mb.typography);
      assert.ok(typeof mb.typography.headingFont === 'string');
      assert.ok(typeof mb.typography.bodyFont === 'string');
      assert.ok(typeof mb.typography.headingStyle === 'string');
      assert.ok(typeof mb.typography.bodyStyle === 'string');
      assert.ok(Array.isArray(mb.imageryThemes));
      assert.ok(mb.imageryThemes.length >= 3);
      assert.ok(typeof mb.overallStyle === 'string');
      assert.ok(typeof mb.emotionalTone === 'string');
      assert.ok(Array.isArray(mb.brandPersonality));
      assert.ok(mb.brandPersonality.length >= 3);
      assert.equal(result.dryRun, true);
    });

    test('imagery themes have keywords and referenceStyles', async () => {
      const result = await generateMoodBoard(makeValidInput({ dryRun: true }), 'free');
      for (const it of result.moodBoard.imageryThemes) {
        assert.ok(typeof it.theme === 'string');
        assert.ok(typeof it.description === 'string');
        assert.ok(Array.isArray(it.keywords));
        assert.ok(Array.isArray(it.referenceStyles));
      }
    });

    test('enriches with style keywords in dry-run', async () => {
      const result = await generateMoodBoard(
        makeValidInput({ dryRun: true, styleKeywords: ['playful', 'vibrant'] }),
        'free',
      );
      assert.ok(result.moodBoard.overallStyle.includes('playful'));
      assert.ok(result.moodBoard.brandPersonality.some((p) => p === 'playful'));
    });

    test('rejects invalid input even in dry-run', async () => {
      await assert.rejects(
        () =>
          generateMoodBoard(
            { productOrBrand: '', dryRun: true } as MoodBoardGeneratorInput,
            'free',
          ),
        /invalid_mood_board_input/,
      );
    });
  });
});
