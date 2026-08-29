import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREATOR_KIT_COST,
  getKitPlatforms,
  getCampaignGoals,
  sortTalkingPoints,
  normalizePlatform,
  normalizeGoal,
  platformDeliveryDefaults,
  estimateReach,
  estimateEngagementRate,
  validateCreatorKitRequest,
  generateFallbackCreatorKit,
  type KitPlatform,
  type CampaignGoal,
  type TalkingPoint,
} from '../src/lib/creative/creator-kits.ts';

describe('creator-kits', () => {
  describe('type completeness', () => {
    test('KitPlatform has 6 platforms', () => {
      const platforms: KitPlatform[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'snapchat', 'twitter'];
      assert.equal(platforms.length, 6);
    });

    test('CampaignGoal has 5 goals', () => {
      const goals: CampaignGoal[] = ['awareness', 'consideration', 'conversion', 'engagement', 'retention'];
      assert.equal(goals.length, 5);
    });

    test('getKitPlatforms returns 6', () => {
      assert.equal(getKitPlatforms().length, 6);
    });

    test('getCampaignGoals returns 5', () => {
      assert.equal(getCampaignGoals().length, 5);
    });
  });

  describe('CREATOR_KIT_COST', () => {
    test('cost is 6', () => {
      assert.equal(CREATOR_KIT_COST, 6);
    });
  });

  describe('sortTalkingPoints', () => {
    test('sorts by priority ascending', () => {
      const points: TalkingPoint[] = [
        { priority: 3, point: 'c', elaboration: '' },
        { priority: 1, point: 'a', elaboration: '' },
        { priority: 2, point: 'b', elaboration: '' },
      ];
      const sorted = sortTalkingPoints(points);
      assert.deepEqual(sorted.map((p) => p.priority), [1, 2, 3]);
    });

    test('does not mutate original array', () => {
      const points: TalkingPoint[] = [
        { priority: 2, point: 'b', elaboration: '' },
        { priority: 1, point: 'a', elaboration: '' },
      ];
      sortTalkingPoints(points);
      assert.equal(points[0].priority, 2);
    });

    test('empty array returns empty', () => {
      assert.deepEqual(sortTalkingPoints([]), []);
    });
  });

  describe('normalizePlatform', () => {
    test('valid platform passes through', () => {
      assert.equal(normalizePlatform('instagram'), 'instagram');
    });
    test('invalid platform defaults to tiktok', () => {
      assert.equal(normalizePlatform('myspace'), 'tiktok');
    });
    test('case-insensitive', () => {
      assert.equal(normalizePlatform('YOUTUBE'), 'youtube');
    });
  });

  describe('normalizeGoal', () => {
    test('valid goal passes through', () => {
      assert.equal(normalizeGoal('conversion'), 'conversion');
    });
    test('invalid goal defaults to awareness', () => {
      assert.equal(normalizeGoal('viral'), 'awareness');
    });
  });

  describe('platformDeliveryDefaults', () => {
    test('tiktok returns vertical spec', () => {
      const d = platformDeliveryDefaults('tiktok');
      assert.equal(d.format, '9:16 vertical');
      assert.equal(d.resolution, '1080x1920');
    });
    test('youtube returns 16:9 option', () => {
      const d = platformDeliveryDefaults('youtube');
      assert.ok(d.format.includes('16:9'));
    });
    test('all platforms return MP4', () => {
      const platforms: KitPlatform[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'snapchat', 'twitter'];
      for (const p of platforms) {
        assert.ok(platformDeliveryDefaults(p).fileFormat.includes('MP4'));
      }
    });
  });

  describe('estimateReach', () => {
    test('returns a string with impressions', () => {
      assert.match(estimateReach('tiktok', 'awareness'), /impressions/);
    });
    test('awareness has higher reach than conversion', () => {
      const awareness = estimateReach('tiktok', 'awareness');
      const conversion = estimateReach('tiktok', 'conversion');
      const aNum = parseInt(awareness.split('-')[0].replace(/[^0-9]/g, ''), 10);
      const cNum = parseInt(conversion.split('-')[0].replace(/[^0-9]/g, ''), 10);
      assert.ok(aNum > cNum);
    });
  });

  describe('estimateEngagementRate', () => {
    test('returns a percentage range', () => {
      assert.match(estimateEngagementRate('tiktok'), /%/);
    });
  });

  describe('validateCreatorKitRequest', () => {
    test('missing productName fails', () => {
      assert.ok(!validateCreatorKitRequest({ productDescription: 'desc' }).valid);
    });
    test('missing productDescription fails', () => {
      assert.ok(!validateCreatorKitRequest({ productName: 'name' }).valid);
    });
    test('valid input passes', () => {
      assert.ok(validateCreatorKitRequest({ productName: 'Widget', productDescription: 'A great widget' }).valid);
    });
    test('invalid platform fails', () => {
      const r = validateCreatorKitRequest({ productName: 'W', productDescription: 'D', platform: 'myspace' });
      assert.ok(!r.valid);
    });
    test('invalid campaignGoal fails', () => {
      const r = validateCreatorKitRequest({ productName: 'W', productDescription: 'D', campaignGoal: 'viral' });
      assert.ok(!r.valid);
    });
  });

  describe('generateFallbackCreatorKit', () => {
    test('returns a complete kit', () => {
      const res = generateFallbackCreatorKit({
        productName: 'Glow Serum',
        productDescription: 'A vitamin C serum for radiant skin.',
        platform: 'tiktok',
        campaignGoal: 'conversion',
      });
      assert.equal(res.kit.productInfo.productName, 'Glow Serum');
      assert.equal(res.kit.platform, 'tiktok');
      assert.equal(res.kit.campaignGoal, 'conversion');
      assert.ok(res.kit.talkingPoints.length >= 1);
      assert.ok(res.kit.hookSuggestions.length >= 1);
      assert.ok(res.kit.ctaOptions.length >= 1);
      assert.ok(res.kit.dosAndDonts.dos.length >= 1);
      assert.ok(res.kit.dosAndDonts.donts.length >= 1);
      assert.ok(res.creatorTips.length >= 1);
      assert.ok(res.estimatedReach.length > 0);
      assert.ok(res.estimatedEngagement.length > 0);
    });

    test('uses selling points as talking points when provided', () => {
      const res = generateFallbackCreatorKit({
        productName: 'X',
        productDescription: 'Y',
        platform: 'instagram',
        campaignGoal: 'awareness',
        keySellingPoints: 'Fast results, Easy to use, Affordable',
      });
      assert.equal(res.kit.talkingPoints.length, 3);
      assert.equal(res.kit.talkingPoints[0].point, 'Fast results');
    });

    test('normalizes invalid platform to tiktok', () => {
      const res = generateFallbackCreatorKit({
        productName: 'X',
        productDescription: 'Y',
        platform: 'myspace' as KitPlatform,
        campaignGoal: 'awareness',
      });
      assert.equal(res.kit.platform, 'tiktok');
    });
  });
});
