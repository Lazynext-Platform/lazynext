import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_COPY_GENERATOR_CREDIT_COST,
  validateAdCopyInput,
  generateAdCopy,
  type AdCopyGeneratorInput,
  type AdCopyResult,
  type AdCopyPlatform,
} from '../src/lib/creative/ad-copy-generator.ts';

function makeValidInput(overrides: Partial<AdCopyGeneratorInput> = {}): AdCopyGeneratorInput {
  return {
    source: 'https://acme.com/products/noise-cancelling-headphones — premium ANC headphones for remote workers.',
    platform: 'tiktok',
    ...overrides,
  };
}

describe('ad-copy-generator', () => {
  describe('validation', () => {
    test('rejects missing source', () => {
      const result = validateAdCopyInput({ source: '', platform: 'tiktok' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('source_required'));
    });

    test('rejects non-object input', () => {
      const result = validateAdCopyInput(null as unknown as AdCopyGeneratorInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('input_required'));
    });

    test('accepts a valid minimal input', () => {
      const result = validateAdCopyInput(makeValidInput());
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    test('rejects invalid platform', () => {
      const result = validateAdCopyInput(
        makeValidInput({ platform: 'facebook' as unknown as AdCopyPlatform }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('platform_invalid'));
    });

    test('accepts all three platforms', () => {
      for (const p of ['tiktok', 'instagram', 'youtube'] as AdCopyPlatform[]) {
        const result = validateAdCopyInput(makeValidInput({ platform: p }));
        assert.equal(result.valid, true, `platform ${p} should be valid`);
      }
    });

    test('rejects non-boolean dryRun', () => {
      const result = validateAdCopyInput(
        makeValidInput({ dryRun: 'yes' as unknown as boolean }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('dry_run_invalid'));
    });

    test('accepts a boolean dryRun', () => {
      const result = validateAdCopyInput(makeValidInput({ dryRun: true }));
      assert.equal(result.valid, true);
    });

    test('rejects overly long source', () => {
      const result = validateAdCopyInput(
        makeValidInput({ source: 'x'.repeat(10001) }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('source_too_long'));
    });

    test('rejects non-object brandKit', () => {
      const result = validateAdCopyInput(
        makeValidInput({ brandKit: 'nope' as unknown as AdCopyGeneratorInput['brandKit'] }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('brand_kit_invalid'));
    });

    test('accepts an object brandKit', () => {
      const result = validateAdCopyInput(
        makeValidInput({ brandKit: { brandName: 'Acme', tone: ['bold'] } }),
      );
      assert.equal(result.valid, true);
    });
  });

  describe('credit cost', () => {
    test('AD_COPY_GENERATOR_CREDIT_COST is positive', () => {
      assert.ok(AD_COPY_GENERATOR_CREDIT_COST > 0);
    });

    test('AD_COPY_GENERATOR_CREDIT_COST is 3', () => {
      assert.equal(AD_COPY_GENERATOR_CREDIT_COST, 3);
    });
  });

  describe('generateAdCopy (dry-run)', () => {
    const origBase = process.env.ATLASCLOUD_BASE;
    const origKey = process.env.ATLASCLOUD_API_KEY;

    test('returns a result when dryRun flag is set', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateAdCopy(makeValidInput({ dryRun: true }));
        assert.ok(out, 'expected output');
        assert.equal(typeof out.headline, 'string');
        assert.equal(typeof out.bodyCopy, 'string');
        assert.equal(typeof out.cta, 'string');
        assert.ok(Array.isArray(out.hashtags));
        assert.equal(typeof out.description, 'string');
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('throws on invalid input', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() =>
          generateAdCopy({ source: '', platform: 'tiktok' } as AdCopyGeneratorInput),
        );
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });
  });

  describe('platform-specific copy', () => {
    const origBase = process.env.ATLASCLOUD_BASE;
    const origKey = process.env.ATLASCLOUD_API_KEY;

    test('tiktok copy has hashtags and empty description', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateAdCopy(makeValidInput({ platform: 'tiktok', dryRun: true }));
        assert.equal(out.platform, 'tiktok');
        assert.ok(out.hashtags.length > 0, 'tiktok should have hashtags');
        assert.equal(out.description, '', 'tiktok description should be empty');
        assert.ok(out.headline.length > 0);
        assert.ok(out.bodyCopy.length > 0);
        assert.ok(out.cta.length > 0);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('instagram copy has hashtags and empty description', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateAdCopy(makeValidInput({ platform: 'instagram', dryRun: true }));
        assert.equal(out.platform, 'instagram');
        assert.ok(out.hashtags.length > 0, 'instagram should have hashtags');
        assert.equal(out.description, '', 'instagram description should be empty');
        assert.ok(out.headline.length > 0);
        assert.ok(out.bodyCopy.length > 0);
        assert.ok(out.cta.length > 0);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('youtube copy has description and no hashtags', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateAdCopy(makeValidInput({ platform: 'youtube', dryRun: true }));
        assert.equal(out.platform, 'youtube');
        assert.ok(out.description.length > 0, 'youtube should have a description');
        assert.equal(out.hashtags.length, 0, 'youtube should have no hashtags');
        assert.ok(out.headline.length > 0);
        assert.ok(out.bodyCopy.length > 0);
        assert.ok(out.cta.length > 0);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('platform field matches requested platform', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        for (const p of ['tiktok', 'instagram', 'youtube'] as AdCopyPlatform[]) {
          const out = await generateAdCopy(makeValidInput({ platform: p, dryRun: true }));
          assert.equal(out.platform, p);
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });
  });

  describe('copy structure', () => {
    const origBase = process.env.ATLASCLOUD_BASE;
    const origKey = process.env.ATLASCLOUD_API_KEY;

    test('AdCopyResult has all required fields', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateAdCopy(makeValidInput({ dryRun: true }));
        const r: AdCopyResult = out;
        assert.equal(typeof r.platform, 'string');
        assert.equal(typeof r.headline, 'string');
        assert.equal(typeof r.bodyCopy, 'string');
        assert.equal(typeof r.cta, 'string');
        assert.ok(Array.isArray(r.hashtags));
        assert.equal(typeof r.description, 'string');
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('brand kit influences dry-run copy', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateAdCopy(
          makeValidInput({
            dryRun: true,
            brandKit: { brandName: 'Acme', keywords: ['premium'] },
          }),
        );
        assert.ok(out.headline.includes('premium') || out.bodyCopy.includes('Acme'));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('hashtags are non-empty strings', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generateAdCopy(makeValidInput({ platform: 'tiktok', dryRun: true }));
        for (const h of out.hashtags) {
          assert.equal(typeof h, 'string');
          assert.ok(h.length > 0);
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });
  });
});
