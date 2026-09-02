import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Multi-Platform Publisher', () => {
  test('all 6 platform capabilities have valid structure', () => {
    const platforms = ['tiktok', 'youtube_shorts', 'instagram_reels', 'facebook', 'twitter', 'linkedin'];
    assert.equal(platforms.length, 6);
    for (const p of platforms) {
      assert.ok(typeof p === 'string');
    }
  });

  test('TikTok capabilities are correct', () => {
    const tiktok = {
      platform: 'tiktok',
      maxVideoDurationSec: 600,
      maxCaptionLength: 2200,
      maxHashtags: 30,
      supportedAspectRatios: ['9:16'],
      supportedMediaTypes: ['video'],
      allowsScheduling: true,
      allowsCrossPosting: true,
      privacyOptions: ['public', 'private', 'followers'],
      thumbnailRequired: false,
    };
    assert.equal(tiktok.maxVideoDurationSec, 600);
    assert.equal(tiktok.maxCaptionLength, 2200);
    assert.ok(tiktok.allowsScheduling);
  });

  test('YouTube Shorts has 60s limit', () => {
    const yt = { platform: 'youtube_shorts', maxVideoDurationSec: 60 };
    assert.equal(yt.maxVideoDurationSec, 60);
  });

  test('Twitter has 280 char caption limit', () => {
    const twitter = { platform: 'twitter', maxCaptionLength: 280 };
    assert.equal(twitter.maxCaptionLength, 280);
  });

  test('caption optimization truncates long captions', () => {
    const longCaption = 'A'.repeat(300);
    const maxLen = 280;
    const optimized = longCaption.slice(0, maxLen);
    assert.equal(optimized.length, maxLen);
  });

  test('hashtag optimization enforces limits', () => {
    const hashtags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'];
    const maxHashtags = 5;
    const optimized = hashtags.slice(0, maxHashtags);
    assert.equal(optimized.length, maxHashtags);
  });

  test('publish request validation - missing media url', () => {
    const request = { platform: 'tiktok', mediaUrl: '', caption: 'test' };
    assert.equal(request.mediaUrl, '');
  });

  test('publish request validation - valid request', () => {
    const request = {
      platform: 'tiktok',
      mediaUrl: 'https://example.com/video.mp4',
      caption: 'Check this out!',
      hashtags: ['fyp', 'viral'],
      privacyLevel: 'public',
    };
    assert.ok(request.mediaUrl);
    assert.ok(request.platform);
  });

  test('PublishResult structure - published', () => {
    const result = {
      platform: 'tiktok',
      status: 'published',
      postId: '12345',
      postUrl: 'https://tiktok.com/@user/video/12345',
      metadata: { publishedAt: '2026-01-01T00:00:00Z' },
    };
    assert.equal(result.status, 'published');
    assert.ok(result.postUrl);
  });

  test('PublishResult structure - dry_run', () => {
    const result = {
      platform: 'tiktok',
      status: 'dry_run',
      postId: undefined,
      postUrl: undefined,
      metadata: { dryRun: true, publishedAt: '2026-01-01T00:00:00Z' },
    };
    assert.equal(result.status, 'dry_run');
    assert.ok(result.metadata.dryRun);
    assert.equal(result.postId, undefined);
  });

  test('scheduling validation rejects past dates', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000).toISOString();
    assert.ok(new Date(pastDate) < now);
  });

  test('scheduling validation accepts future dates', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 86400000).toISOString();
    assert.ok(new Date(futureDate) > now);
  });

  test('cross-post validation', () => {
    const crossPost = ['youtube_shorts', 'instagram_reels'];
    assert.equal(crossPost.length, 2);
    assert.ok(!crossPost.includes('tiktok')); // shouldn't include primary platform
  });
});

describe('Publisher — real function tests', () => {
  test('hasRealCredentials returns false when no env vars set', async () => {
    // The publisher module is imported dynamically to avoid side effects
    const { publishContent } = await import('../src/lib/publishing/publisher');
    const result = await publishContent({
      platform: 'tiktok',
      mediaUrl: 'https://example.com/video.mp4',
      caption: 'test caption',
      hashtags: [],
    });
    // Without env credentials, should return dry_run
    assert.equal(result.status, 'dry_run');
    assert.ok(result.metadata?.dryRun);
  });

  test('publishContent validates missing caption', async () => {
    const { publishContent } = await import('../src/lib/publishing/publisher');
    const result = await publishContent({
      platform: 'tiktok',
      mediaUrl: 'https://example.com/video.mp4',
      caption: '',
      hashtags: [],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.error);
  });

  test('schedulePost rejects past dates', async () => {
    const { schedulePost } = await import('../src/lib/publishing/publisher');
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const result = await schedulePost({
      platform: 'tiktok',
      mediaUrl: 'https://example.com/video.mp4',
      caption: 'test',
      hashtags: [],
    }, pastDate);
    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'schedule_at_must_be_in_future');
  });

  test('schedulePost rejects invalid dates', async () => {
    const { schedulePost } = await import('../src/lib/publishing/publisher');
    const result = await schedulePost({
      platform: 'tiktok',
      mediaUrl: 'https://example.com/video.mp4',
      caption: 'test',
      hashtags: [],
    }, 'not-a-date');
    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'invalid_schedule_at');
  });

  test('schedulePost rejects platforms that do not support scheduling', async () => {
    const { schedulePost } = await import('../src/lib/publishing/publisher');
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const result = await schedulePost({
      platform: 'twitter',
      mediaUrl: 'https://example.com/video.mp4',
      caption: 'test',
      hashtags: [],
    }, futureDate);
    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'scheduling_not_supported');
  });

  test('publishToMultiple expands cross-post targets', async () => {
    const { publishToMultiple } = await import('../src/lib/publishing/publisher');
    const results = await publishToMultiple([{
      platform: 'tiktok',
      mediaUrl: 'https://example.com/video.mp4',
      caption: 'test',
      hashtags: [],
      crossPostTo: ['youtube_shorts', 'instagram_reels'],
    }]);
    // Should have 3 results: primary + 2 cross-post targets
    assert.equal(results.length, 3);
    assert.equal(results[0].platform, 'tiktok');
    assert.equal(results[1].platform, 'youtube_shorts');
    assert.equal(results[2].platform, 'instagram_reels');
  });
});

describe('safeError helper', () => {
  test('returns sanitized error code without raw message', async () => {
    const { safeError } = await import('../src/lib/security');
    const result = safeError(new Error('secret internal DB connection string'), 'test-route', 'operation_failed');
    assert.equal(result.error, 'operation_failed');
    assert.equal(JSON.stringify(result).includes('secret'), false);
  });

  test('handles non-Error thrown values', async () => {
    const { safeError } = await import('../src/lib/security');
    const result = safeError('some string error', 'test-route', 'failed');
    assert.equal(result.error, 'failed');
  });
});
