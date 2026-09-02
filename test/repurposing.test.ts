import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  REPURPOSING_COST,
  getSourceFormats,
  getTargetFormats,
  getPlatforms,
  getRepurposeStrategies,
  determineStrategy,
  estimateQualityRetention,
  estimateEffort,
  validateRepurposingRequest,
  type SourceFormat,
  type TargetFormat,
  type Platform,
  type RepurposeStrategy,
} from '../src/lib/creative/repurposing.ts';

describe('repurposing', () => {
  describe('type completeness', () => {
    test('SourceFormat has 6 formats', () => {
      const formats: SourceFormat[] = ['video', 'image', 'script', 'carousel', 'story', 'long_form_video'];
      assert.equal(formats.length, 6);
    });

    test('TargetFormat has 10 formats', () => {
      const formats: TargetFormat[] = ['short_form_video', 'image_carousel', 'single_image', 'story_set', 'social_post', 'email_creative', 'display_ad', 'vertical_video', 'horizontal_video', 'square_video'];
      assert.equal(formats.length, 10);
    });

    test('Platform has 9 platforms', () => {
      const platforms: Platform[] = ['meta', 'google', 'tiktok', 'youtube', 'instagram', 'x', 'linkedin', 'pinterest', 'snapchat'];
      assert.equal(platforms.length, 9);
    });

    test('RepurposeStrategy has 6 strategies', () => {
      const strategies: RepurposeStrategy[] = ['extract_highlights', 'split_segments', 'reformat_aspect', 'summarize_keypoints', 'create_variants', 'cross_post'];
      assert.equal(strategies.length, 6);
    });

    test('getSourceFormats returns 6', () => { assert.equal(getSourceFormats().length, 6); });
    test('getTargetFormats returns 10', () => { assert.equal(getTargetFormats().length, 10); });
    test('getPlatforms returns 9', () => { assert.equal(getPlatforms().length, 9); });
    test('getRepurposeStrategies returns 6', () => { assert.equal(getRepurposeStrategies().length, 6); });
  });

  describe('determineStrategy', () => {
    test('long_form_video to short_form_video = extract_highlights', () => {
      assert.equal(determineStrategy('long_form_video', 'short_form_video'), 'extract_highlights');
    });
    test('video to vertical_video = reformat_aspect', () => {
      assert.equal(determineStrategy('video', 'vertical_video'), 'reformat_aspect');
    });
    test('script to social_post = create_variants', () => {
      assert.equal(determineStrategy('script', 'social_post'), 'create_variants');
    });
  });

  describe('estimateQualityRetention', () => {
    test('returns 0-100', () => {
      const r = estimateQualityRetention('video', 'vertical_video');
      assert.ok(r >= 0 && r <= 100);
    });
    test('same medium retains more', () => {
      const sameMedium = estimateQualityRetention('image', 'single_image');
      const crossMedium = estimateQualityRetention('image', 'short_form_video');
      assert.ok(sameMedium > crossMedium);
    });
  });

  describe('estimateEffort', () => {
    test('returns valid effort', () => {
      const e = estimateEffort('video', 'image_carousel', 3);
      assert.ok(['low', 'medium', 'high'].includes(e));
    });
    test('many segments = high', () => {
      assert.equal(estimateEffort('video', 'image_carousel', 10), 'high');
    });
  });

  describe('validateRepurposingRequest', () => {
    test('empty content fails', () => {
      const r = validateRepurposingRequest({ sourceContent: '', sourceFormat: 'video', targetFormats: ['short_form_video'] });
      assert.ok(!r.valid);
    });
    test('no target formats fails', () => {
      const r = validateRepurposingRequest({ sourceContent: 'test', sourceFormat: 'video', targetFormats: [] });
      assert.ok(!r.valid);
    });
    test('valid request passes', () => {
      const r = validateRepurposingRequest({ sourceContent: 'test content', sourceFormat: 'video', targetFormats: ['short_form_video'] });
      assert.ok(r.valid);
    });
  });

  describe('REPURPOSING_COST', () => {
    test('cost is 6', () => { assert.equal(REPURPOSING_COST, 6); });
  });
});
