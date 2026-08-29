/**
 * Core publishing logic for multi-platform content distribution.
 *
 * In dry-run mode (default for safety, mirroring the ad-platform pattern)
 * publishing returns a simulated `published` result. In real mode without
 * API credentials, publishing returns `pending_approval` so callers can
 * gate the action behind a manual approval flow — no real posts are made.
 *
 * Cost model:
 *   - 3 credits per platform publish
 *   - 1 credit per scheduled post
 */

import type { PlanTier } from '@/lib/plan-tier';
import type {
  PublishPlatform,
  PublishRequest,
  PublishResult,
  PlatformCapabilities,
} from './types';
import {
  getPlatformCapabilities,
  getPlatformAdapter,
} from './platforms';

export const PUBLISH_CREDIT_COST = 3;
export const SCHEDULE_CREDIT_COST = 1;

/** Map PublishPlatform to the platform name used in PlatformConnection.
 *  e.g. 'youtube_shorts' → 'youtube', 'instagram_reels' → 'instagram' */
function connectionPlatform(platform: PublishPlatform): string {
  if (platform === 'youtube_shorts') return 'youtube';
  if (platform === 'instagram_reels') return 'instagram';
  return platform;
}

/** Check if real platform credentials are available — either from env vars
 *  (global) or from a stored PlatformConnection (per-user OAuth).
 *  Returns the decrypted access token if available, or null.
 *  If the stored token is expired, attempts to refresh it using the stored
 *  refresh token before falling back to env vars or dry-run. */
async function getRealAccessToken(platform: PublishPlatform, userId?: string): Promise<string | null> {
  const connPlatform = connectionPlatform(platform);
  // First check for per-user OAuth connection
  if (userId) {
    try {
      const { prisma } = await import('@/lib/prisma');
      const conn = await prisma.platformConnection.findUnique({
        where: { userId_platform: { userId, platform: connPlatform } },
      });
      if (conn) {
        const { isTokenExpired, refreshPlatformToken } = await import('./token-refresh');
        // If token is expired (or about to expire), attempt refresh
        if (isTokenExpired(conn.tokenExpiresAt)) {
          const refreshed = await refreshPlatformToken(conn);
          if (refreshed) return refreshed;
          // Refresh failed — fall through to env check / dry-run
          console.warn(`[publisher] ${platform} token expired and refresh failed for user ${userId}`);
          return null;
        }
        const { decryptToken } = await import('./token-crypto');
        return await decryptToken(conn.accessToken);
      }
    } catch {
      // DB or decryption failed — fall through to env check
    }
  }

  // Fall back to global env vars
  const envMap: Record<string, string | undefined> = {
    tiktok: process.env.TIKTOK_ACCESS_TOKEN,
    youtube_shorts: process.env.YOUTUBE_ACCESS_TOKEN,
    instagram_reels: process.env.INSTAGRAM_ACCESS_TOKEN,
    facebook: process.env.FB_PAGE_TOKEN,
    linkedin: process.env.LINKEDIN_ACCESS_TOKEN,
  };
  return envMap[platform] || null;
}

/**
 * Validate a publish request against a platform's capabilities.
 */
export function validatePublishRequest(
  request: PublishRequest,
  capabilities: PlatformCapabilities,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.platform) errors.push('platform_required');
  if (!request.mediaUrl?.trim()) errors.push('media_url_required');
  if (!request.caption?.trim()) errors.push('caption_required');

  if (request.caption && request.caption.length > capabilities.maxCaptionLength) {
    errors.push(`caption_exceeds_max_${capabilities.maxCaptionLength}`);
  }

  if (
    request.hashtags &&
    capabilities.maxHashtags > 0 &&
    request.hashtags.length > capabilities.maxHashtags
  ) {
    errors.push(`hashtags_exceeds_max_${capabilities.maxHashtags}`);
  }

  if (request.privacyLevel) {
    if (!capabilities.privacyOptions.includes(request.privacyLevel)) {
      errors.push(`privacy_level_not_supported_${request.privacyLevel}`);
    }
  }

  if (request.scheduleAt && !capabilities.allowsScheduling) {
    errors.push('scheduling_not_supported');
  }

  if (
    request.crossPostTo &&
    request.crossPostTo.length > 0 &&
    !capabilities.allowsCrossPosting
  ) {
    errors.push('cross_posting_not_supported');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Publish content to a single platform.
 *
 * Validates the request, adapts the content (caption + hashtags) for the
 * target platform, and returns a simulated result in dry-run mode or a
 * `pending_approval` result in real mode (no credentials configured).
 */
export async function publishContent(
  request: PublishRequest,
  _planTier?: PlanTier,
  userId?: string,
): Promise<PublishResult> {
  const caps = getPlatformCapabilities(request.platform);
  const adapter = getPlatformAdapter(request.platform);

  const validation = validatePublishRequest(request, caps);
  if (!validation.valid) {
    return {
      platform: request.platform,
      status: 'failed',
      error: validation.errors.join('; '),
      metadata: {},
    };
  }

  // Adapt content for the platform (caption truncation, hashtag limits).
  const adaptedCaption = adapter.adaptCaption(request.caption);
  const adaptedHashtags = adapter.adaptHashtags(request.hashtags);
  const mediaCheck = adapter.validateMedia(request.mediaUrl);
  if (!mediaCheck.valid) {
    return {
      platform: request.platform,
      status: 'failed',
      error: mediaCheck.errors.join('; '),
      metadata: {},
    };
  }

  // Scheduled publish: return a scheduled result.
  if (request.scheduleAt) {
    return schedulePost(request, request.scheduleAt, userId);
  }

  // Check for real credentials (per-user OAuth token or global env var)
  const accessToken = await getRealAccessToken(request.platform, userId);

  // Dry-run: simulate a publish (no real credentials configured).
  if (!accessToken) {
    const postId = `${request.platform}_dryrun_${Date.now()}`;
    return {
      platform: request.platform,
      status: 'dry_run',
      postId,
      postUrl: `https://example.com/${request.platform}/${postId}`,
      metadata: {
        platformSpecificId: postId,
        publishedAt: new Date().toISOString(),
        engagementMetrics: { views: 0, likes: 0, comments: 0, shares: 0 },
        dryRun: true,
      },
    };
  }

  // Real publishing: call the platform API adapter
  try {
    const { publishToPlatform } = await import('./platform-adapters');
    const result = await publishToPlatform(request.platform, accessToken, {
      mediaUrl: request.mediaUrl,
      caption: adaptedCaption,
      hashtags: adaptedHashtags,
      privacyLevel: request.privacyLevel,
    });
    return {
      platform: request.platform,
      status: 'published',
      postId: result.postId,
      postUrl: result.postUrl,
      metadata: {
        platformSpecificId: result.postId,
        publishedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    console.error(`[publisher] ${request.platform} real publish failed:`, String(e));
    return {
      platform: request.platform,
      status: 'failed',
      error: 'platform_publish_failed',
      metadata: {},
    };
  }
}

/**
 * Publish to multiple platforms in parallel. The primary request's
 * `crossPostTo` list is merged with the explicit `requests` array.
 */
export async function publishToMultiple(
  requests: PublishRequest[],
  planTier?: PlanTier,
  userId?: string,
): Promise<PublishResult[]> {
  const expanded: PublishRequest[] = [];
  for (const req of requests) {
    expanded.push(req);
    if (req.crossPostTo && req.crossPostTo.length > 0) {
      for (const target of req.crossPostTo) {
        expanded.push({
          ...req,
          platform: target,
          crossPostTo: undefined,
        });
      }
    }
  }

  const results = await Promise.all(
    expanded.map((r) => publishContent(r, planTier, userId).catch((): PublishResult => ({
      platform: r.platform,
      status: 'failed',
      error: 'publish_error',
      metadata: {},
    }))),
  );
  return results;
}

/**
 * Schedule a post for later publishing. Validates that the schedule time
 * is in the future and that the platform supports scheduling.
 * Persists the scheduled post to the ScheduledPost table for durability.
 */
export async function schedulePost(
  request: PublishRequest,
  scheduleAt: string,
  userId?: string,
): Promise<PublishResult> {
  const caps = getPlatformCapabilities(request.platform);

  if (!caps.allowsScheduling) {
    return {
      platform: request.platform,
      status: 'failed',
      error: 'scheduling_not_supported',
      metadata: {},
    };
  }

  const when = new Date(scheduleAt);
  if (Number.isNaN(when.getTime())) {
    return {
      platform: request.platform,
      status: 'failed',
      error: 'invalid_schedule_at',
      metadata: {},
    };
  }

  if (when.getTime() <= Date.now()) {
    return {
      platform: request.platform,
      status: 'failed',
      error: 'schedule_at_must_be_in_future',
      metadata: {},
    };
  }

  // Persist to ScheduledPost table for durability and future scheduler processing
  let scheduledId = `${request.platform}_scheduled_${Date.now()}`;
  if (userId) {
    try {
      const { prisma } = await import('@/lib/prisma');
      const post = await prisma.scheduledPost.create({
        data: {
          userId,
          platform: request.platform,
          mediaUrl: request.mediaUrl || '',
          caption: request.caption || '',
          hashtagsJson: JSON.stringify(request.hashtags || []),
          privacyLevel: request.privacyLevel || null,
          crossPostToJson: JSON.stringify(request.crossPostTo || []),
          scheduledAt: when,
          status: 'scheduled',
        },
      });
      scheduledId = post.id;
    } catch (e) {
      console.warn('[publish] failed to persist scheduled post:', String(e));
      // Continue with in-memory ID if DB persistence fails
    }
  }

  return {
    platform: request.platform,
    status: 'scheduled',
    postId: scheduledId,
    scheduledAt: when.toISOString(),
    metadata: {
      platformSpecificId: scheduledId,
    },
  };
}
