import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_SCRIPT_WRITER_CREDIT_COST,
  validateAdScriptWriterInput,
  writeAdScript,
  type AdScriptWriterInput,
  type AdScriptWriterResult,
  type AdScriptPlatform,
} from '../src/lib/creative/ad-script-writer.ts';

function makeValidInput(overrides: Partial<AdScriptWriterInput> = {}): AdScriptWriterInput {
  return {
    source: 'https://acme.com/products/noise-cancelling-headphones — premium ANC headphones for remote workers.',
    platform: 'tiktok',
    ...overrides,
  };
}

describe('ad-script-writer', () => {
  describe('validation', () => {
    test('rejects missing source', () => {
      const result = validateAdScriptWriterInput({ source: '', platform: 'tiktok' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('source_required'));
    });

    test('rejects non-object input', () => {
      const result = validateAdScriptWriterInput(null as unknown as AdScriptWriterInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('input_required'));
    });

    test('accepts a valid minimal input', () => {
      const result = validateAdScriptWriterInput(makeValidInput());
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    test('rejects invalid platform', () => {
      const result = validateAdScriptWriterInput(
        makeValidInput({ platform: 'facebook' as unknown as AdScriptPlatform }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('platform_invalid'));
    });

    test('accepts all three platforms', () => {
      for (const p of ['tiktok', 'youtube', 'instagram'] as AdScriptPlatform[]) {
        const result = validateAdScriptWriterInput(makeValidInput({ platform: p }));
        assert.equal(result.valid, true, `platform ${p} should be valid`);
      }
    });

    test('rejects non-boolean dryRun', () => {
      const result = validateAdScriptWriterInput(
        makeValidInput({ dryRun: 'yes' as unknown as boolean }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('dry_run_invalid'));
    });

    test('accepts a boolean dryRun', () => {
      const result = validateAdScriptWriterInput(makeValidInput({ dryRun: true }));
      assert.equal(result.valid, true);
    });

    test('rejects overly long source', () => {
      const result = validateAdScriptWriterInput(
        makeValidInput({ source: 'x'.repeat(2001) }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('source_too_long'));
    });

    test('rejects non-object brandKit', () => {
      const result = validateAdScriptWriterInput(
        makeValidInput({ brandKit: 'nope' as unknown as AdScriptWriterInput['brandKit'] }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('brand_kit_invalid'));
    });

    test('accepts an object brandKit', () => {
      const result = validateAdScriptWriterInput(
        makeValidInput({ brandKit: { brandName: 'Acme', tone: ['bold'] } }),
      );
      assert.equal(result.valid, true);
    });

    test('rejects duration below 5', () => {
      const result = validateAdScriptWriterInput(makeValidInput({ durationSec: 4 }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('duration_out_of_range'));
    });

    test('rejects duration above 120', () => {
      const result = validateAdScriptWriterInput(makeValidInput({ durationSec: 121 }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('duration_out_of_range'));
    });

    test('accepts duration within range (5)', () => {
      const result = validateAdScriptWriterInput(makeValidInput({ durationSec: 5 }));
      assert.equal(result.valid, true);
    });

    test('accepts duration within range (120)', () => {
      const result = validateAdScriptWriterInput(makeValidInput({ durationSec: 120 }));
      assert.equal(result.valid, true);
    });

    test('rejects non-number duration', () => {
      const result = validateAdScriptWriterInput(
        makeValidInput({ durationSec: '30' as unknown as number }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('duration_invalid'));
    });

    test('accepts undefined duration', () => {
      const result = validateAdScriptWriterInput(makeValidInput({ durationSec: undefined }));
      assert.equal(result.valid, true);
    });
  });

  describe('credit cost', () => {
    test('AD_SCRIPT_WRITER_CREDIT_COST is positive', () => {
      assert.ok(AD_SCRIPT_WRITER_CREDIT_COST > 0);
    });

    test('AD_SCRIPT_WRITER_CREDIT_COST is 5', () => {
      assert.equal(AD_SCRIPT_WRITER_CREDIT_COST, 5);
    });
  });

  describe('writeAdScript (dry-run)', () => {
    const origBase = process.env.ATLASCLOUD_BASE;
    const origKey = process.env.ATLASCLOUD_API_KEY;

    test('returns a result when dryRun flag is set', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await writeAdScript(makeValidInput({ dryRun: true }));
        assert.ok(out, 'expected output');
        assert.equal(typeof out.dryRun, 'boolean');
        assert.ok(Array.isArray(out.script.scenes));
        assert.equal(typeof out.script.totalDurationSec, 'number');
        assert.equal(typeof out.script.platform, 'string');
        assert.equal(typeof out.script.hook, 'string');
        assert.equal(typeof out.script.cta, 'string');
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('throws on invalid input', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() =>
          writeAdScript({ source: '', platform: 'tiktok' } as AdScriptWriterInput),
        );
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('dry-run returns 3-5 scenes', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await writeAdScript(makeValidInput({ dryRun: true }));
        assert.ok(out.script.scenes.length >= 3, 'should have at least 3 scenes');
        assert.ok(out.script.scenes.length <= 5, 'should have at most 5 scenes');
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('each scene has the correct structure', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await writeAdScript(makeValidInput({ dryRun: true }));
        for (const scene of out.script.scenes) {
          assert.equal(typeof scene.id, 'number');
          assert.equal(typeof scene.durationSec, 'number');
          assert.ok(scene.durationSec > 0);
          assert.equal(typeof scene.visualDescription, 'string');
          assert.equal(typeof scene.voiceover, 'string');
          assert.equal(typeof scene.brollNotes, 'string');
          assert.equal(typeof scene.onScreenText, 'string');
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('scene ids are sequential starting at 1', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await writeAdScript(makeValidInput({ dryRun: true }));
        out.script.scenes.forEach((scene, idx) => {
          assert.equal(scene.id, idx + 1);
        });
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('totalDurationSec equals sum of scene durations', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await writeAdScript(makeValidInput({ dryRun: true }));
        const sum = out.script.scenes.reduce((a, s) => a + s.durationSec, 0);
        assert.equal(out.script.totalDurationSec, sum);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('platform field matches requested platform', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        for (const p of ['tiktok', 'youtube', 'instagram'] as AdScriptPlatform[]) {
          const out = await writeAdScript(makeValidInput({ platform: p, dryRun: true }));
          assert.equal(out.script.platform, p);
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('dryRun flag is true in dry-run mode', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await writeAdScript(makeValidInput({ dryRun: true }));
        assert.equal(out.dryRun, true);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('brand kit influences dry-run output', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await writeAdScript(
          makeValidInput({
            dryRun: true,
            brandKit: { brandName: 'Acme', keywords: ['premium'] },
          }),
        );
        const all = out.script.hook + ' ' + out.script.cta + ' ' + out.script.scenes.map((s) => s.voiceover).join(' ');
        assert.ok(all.includes('premium') || all.includes('Acme'));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('youtube dry-run has 5 scenes', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await writeAdScript(makeValidInput({ platform: 'youtube', dryRun: true }));
        assert.equal(out.script.scenes.length, 5);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('AdScriptWriterResult has all required fields', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await writeAdScript(makeValidInput({ dryRun: true }));
        const r: AdScriptWriterResult = out;
        assert.ok(r.script.scenes);
        assert.equal(typeof r.script.totalDurationSec, 'number');
        assert.equal(typeof r.script.platform, 'string');
        assert.equal(typeof r.script.hook, 'string');
        assert.equal(typeof r.script.cta, 'string');
        assert.equal(typeof r.dryRun, 'boolean');
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });
  });
});
