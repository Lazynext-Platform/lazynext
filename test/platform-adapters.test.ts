import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for platform-adapters.ts — mocked fetch calls to platform APIs.
 * Each test mocks globalThis.fetch to return canned responses and verifies
 * that the adapter constructs the correct API calls and returns the
 * expected { postId, postUrl } result.
 */

// Save original fetch
const originalFetch = globalThis.fetch;

// Helper to create a mock Response
function mockResponse(ok: boolean, json: unknown, status = ok ? 200 : 400): Response {
  return {
    ok,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json),
    blob: async () => new Blob([JSON.stringify(json)], { type: 'video/*' }),
  } as unknown as Response;
}

// Helper to create a fetch mock that handles multiple URL patterns
function createFetchMock(handlers: { pattern: RegExp; response: Response | (() => Response) }[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    for (const h of handlers) {
      if (h.pattern.test(url)) {
        return typeof h.response === 'function' ? h.response() : h.response;
      }
    }
    // Default: return a 404 for unhandled URLs
    return mockResponse(false, { error: 'no_mock_handler', url }, 404);
  }) as typeof fetch;
}

describe('platform-adapters — publishToPlatform', () => {
  beforeEach(() => {
    // Ensure clean state
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  });

  describe('tiktok', () => {
    test('publishes successfully when both API calls succeed', async () => {
      let initBody: string | undefined;
      let statusBody: string | undefined;

      globalThis.fetch = createFetchMock([
        {
          pattern: /publish\/video\/init/,
          response: mockResponse(true, { data: { publish_id: 'tiktok_pub_123' } }),
        },
        {
          pattern: /publish\/status\/fetch/,
          response: () => {
            // Capture the body on the second call
            return mockResponse(true, { status: 'PUBLISHED' });
          },
        },
      ]);

      // Capture request bodies via a wrapper
      const mockFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (/publish\/video\/init/.test(url)) {
          initBody = init?.body as string;
        }
        if (/publish\/status\/fetch/.test(url)) {
          statusBody = init?.body as string;
        }
        return mockFetch(input, init);
      }) as typeof fetch;

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      const result = await publishToPlatform('tiktok', 'tok-token', {
        mediaUrl: 'https://example.com/video.mp4',
        caption: 'Check this out!',
        hashtags: ['fyp', 'viral'],
        privacyLevel: 'PUBLIC_TO_EVERYONE',
      });

      assert.equal(result.postId, 'tiktok_pub_123');
      assert.ok(result.postUrl.includes('tiktok_pub_123'));

      // Verify init request body
      const init = JSON.parse(initBody!);
      assert.equal(init.source, 'PULL_FROM_URL');
      assert.equal(init.video_url, 'https://example.com/video.mp4');

      // Verify status request body
      const status = JSON.parse(statusBody!);
      assert.equal(status.publish_id, 'tiktok_pub_123');
      assert.equal(status.title, 'Check this out!');
      assert.equal(status.privacy_level, 'PUBLIC_TO_EVERYONE');
    });

    test('throws when init fails', async () => {
      globalThis.fetch = createFetchMock([
        {
          pattern: /publish\/video\/init/,
          response: mockResponse(false, { error: 'invalid_token' }, 401),
        },
      ]);

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      await assert.rejects(
        () => publishToPlatform('tiktok', 'bad-token', {
          mediaUrl: 'https://example.com/video.mp4',
          caption: 'test',
          hashtags: [],
        }),
        /tiktok_init_failed/,
      );
    });

    test('throws when publish_id is missing', async () => {
      globalThis.fetch = createFetchMock([
        {
          pattern: /publish\/video\/init/,
          response: mockResponse(true, { data: {} }),
        },
      ]);

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      await assert.rejects(
        () => publishToPlatform('tiktok', 'tok-token', {
          mediaUrl: 'https://example.com/video.mp4',
          caption: 'test',
          hashtags: [],
        }),
        /tiktok_no_publish_id/,
      );
    });
  });

  describe('youtube_shorts', () => {
    test('uploads video and returns post URL', async () => {
      globalThis.fetch = createFetchMock([
        {
          pattern: /^https:\/\/example\.com\/video\.mp4$/,
          response: mockResponse(true, { data: 'video-bytes' }),
        },
        {
          pattern: /googleapis\.com\/upload\/youtube/,
          response: mockResponse(true, { id: 'yt_vid_456' }),
        },
      ]);

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      const result = await publishToPlatform('youtube_shorts', 'yt-token', {
        mediaUrl: 'https://example.com/video.mp4',
        caption: 'My YouTube Short',
        hashtags: ['shorts'],
      });

      assert.equal(result.postId, 'yt_vid_456');
      assert.equal(result.postUrl, 'https://www.youtube.com/watch?v=yt_vid_456');
    });

    test('throws when video fetch fails', async () => {
      globalThis.fetch = createFetchMock([
        {
          pattern: /^https:\/\/example\.com\/video\.mp4$/,
          response: mockResponse(false, {}, 404),
        },
      ]);

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      await assert.rejects(
        () => publishToPlatform('youtube_shorts', 'yt-token', {
          mediaUrl: 'https://example.com/video.mp4',
          caption: 'test',
          hashtags: [],
        }),
        /youtube_video_fetch_failed/,
      );
    });

    test('throws when upload fails', async () => {
      globalThis.fetch = createFetchMock([
        {
          pattern: /^https:\/\/example\.com\/video\.mp4$/,
          response: mockResponse(true, { data: 'video-bytes' }),
        },
        {
          pattern: /googleapis\.com\/upload\/youtube/,
          response: mockResponse(false, { error: 'quota_exceeded' }, 403),
        },
      ]);

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      await assert.rejects(
        () => publishToPlatform('youtube_shorts', 'yt-token', {
          mediaUrl: 'https://example.com/video.mp4',
          caption: 'test',
          hashtags: [],
        }),
        /youtube_upload_failed/,
      );
    });
  });

  describe('instagram_reels', () => {
    test('creates container and publishes', async () => {
      let containerBody: string | undefined;

      globalThis.fetch = createFetchMock([
        {
          pattern: /graph\.facebook\.com.*\/media\?/,
          response: () => mockResponse(true, { id: 'ig_container_789' }),
        },
        {
          pattern: /graph\.facebook\.com.*\/media_publish/,
          response: mockResponse(true, { id: 'ig_post_012' }),
        },
      ]);

      // Capture container body
      const mockFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (/graph\.facebook\.com.*\/media\?/.test(url)) {
          containerBody = init?.body as string;
        }
        return mockFetch(input, init);
      }) as typeof fetch;

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      const result = await publishToPlatform('instagram_reels', 'ig-token', {
        mediaUrl: 'https://example.com/reel.mp4',
        caption: 'Instagram reel caption',
        hashtags: ['reels', 'trending'],
      });

      assert.equal(result.postId, 'ig_post_012');
      assert.ok(result.postUrl.includes('ig_post_012'));

      // Verify container body includes caption + hashtags
      const container = JSON.parse(containerBody!);
      assert.equal(container.media_type, 'REELS');
      assert.ok(container.caption.includes('Instagram reel caption'));
      assert.ok(container.caption.includes('#reels'));
      assert.ok(container.caption.includes('#trending'));
    });

    test('throws when container creation fails', async () => {
      globalThis.fetch = createFetchMock([
        {
          pattern: /graph\.facebook\.com.*\/media\?/,
          response: mockResponse(false, { error: { message: 'Invalid token' } }, 401),
        },
      ]);

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      await assert.rejects(
        () => publishToPlatform('instagram_reels', 'bad-token', {
          mediaUrl: 'https://example.com/reel.mp4',
          caption: 'test',
          hashtags: [],
        }),
        /instagram_container_failed/,
      );
    });
  });

  describe('facebook', () => {
    test('posts to page feed with caption and link', async () => {
      let feedBody: string | undefined;

      globalThis.fetch = createFetchMock([
        {
          pattern: /graph\.facebook\.com.*\/feed/,
          response: () => {
            return mockResponse(true, { id: 'fb_post_345' });
          },
        },
      ]);

      const mockFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (/graph\.facebook\.com.*\/feed/.test(url)) {
          feedBody = init?.body as string;
        }
        return mockFetch(input, init);
      }) as typeof fetch;

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      const result = await publishToPlatform('facebook', 'fb-token', {
        mediaUrl: 'https://example.com/post.html',
        caption: 'Facebook post',
        hashtags: ['marketing'],
      });

      assert.equal(result.postId, 'fb_post_345');

      const feed = JSON.parse(feedBody!);
      assert.ok(feed.message.includes('Facebook post'));
      assert.ok(feed.message.includes('#marketing'));
      assert.equal(feed.link, 'https://example.com/post.html');
    });

    test('throws when feed post fails', async () => {
      globalThis.fetch = createFetchMock([
        {
          pattern: /graph\.facebook\.com.*\/feed/,
          response: mockResponse(false, { error: { message: 'Permission denied' } }, 403),
        },
      ]);

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      await assert.rejects(
        () => publishToPlatform('facebook', 'bad-token', {
          mediaUrl: 'https://example.com/post.html',
          caption: 'test',
          hashtags: [],
        }),
        /facebook_publish_failed/,
      );
    });
  });

  describe('linkedin', () => {
    test('fetches userinfo and creates post', async () => {
      let postBody: string | undefined;

      globalThis.fetch = createFetchMock([
        {
          pattern: /api\.linkedin\.com\/v2\/userinfo/,
          response: mockResponse(true, { sub: 'li_user_678' }),
        },
        {
          pattern: /api\.linkedin\.com\/v2\/posts/,
          response: () => mockResponse(true, { id: 'li_post_901' }),
        },
      ]);

      const mockFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (/api\.linkedin\.com\/v2\/posts/.test(url)) {
          postBody = init?.body as string;
        }
        return mockFetch(input, init);
      }) as typeof fetch;

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      const result = await publishToPlatform('linkedin', 'li-token', {
        mediaUrl: 'https://example.com/article.html',
        caption: 'LinkedIn article',
        hashtags: ['business'],
      });

      assert.equal(result.postId, 'li_post_901');
      assert.ok(result.postUrl.includes('li_post_901'));

      const post = JSON.parse(postBody!);
      assert.equal(post.author, 'urn:li:person:li_user_678');
      assert.equal(post.lifecycleState, 'PUBLISHED');
      assert.ok(post.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text.includes('LinkedIn article'));
    });

    test('throws when userinfo fails', async () => {
      globalThis.fetch = createFetchMock([
        {
          pattern: /api\.linkedin\.com\/v2\/userinfo/,
          response: mockResponse(false, {}, 401),
        },
      ]);

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      await assert.rejects(
        () => publishToPlatform('linkedin', 'bad-token', {
          mediaUrl: 'https://example.com/article.html',
          caption: 'test',
          hashtags: [],
        }),
        /linkedin_userinfo_failed/,
      );
    });

    test('throws when post creation fails', async () => {
      globalThis.fetch = createFetchMock([
        {
          pattern: /api\.linkedin\.com\/v2\/userinfo/,
          response: mockResponse(true, { sub: 'li_user_678' }),
        },
        {
          pattern: /api\.linkedin\.com\/v2\/posts/,
          response: mockResponse(false, { message: 'Throttled' }, 429),
        },
      ]);

      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      await assert.rejects(
        () => publishToPlatform('linkedin', 'li-token', {
          mediaUrl: 'https://example.com/article.html',
          caption: 'test',
          hashtags: [],
        }),
        /linkedin_publish_failed/,
      );
    });
  });

  describe('unsupported platform', () => {
    test('throws for unknown platform', async () => {
      const { publishToPlatform } = await import('../src/lib/publishing/platform-adapters');
      await assert.rejects(
        () => publishToPlatform('snapchat', 'token', {
          mediaUrl: 'https://example.com/video.mp4',
          caption: 'test',
          hashtags: [],
        }),
        /unsupported_platform/,
      );
    });
  });
});
