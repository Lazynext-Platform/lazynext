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

/** True when real platform API credentials are configured (none by default). */
function hasRealCredentials(_platform: PublishPlatform): boolean {
  // Real publishing would check env vars like TIKTOK_ACCESS_TOKEN,
  // YOUTUBE_REFRESH_TOKEN, INSTAGRAM_ACCESS_TOKEN, FB_PAGE_TOKEN, etc.
  // None are configured by default → always returns pending_approval.
  return false;
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
    return schedulePost(request, request.scheduleAt);
  }

  // Dry-run: simulate a publish (no real credentials configured).
  if (!hasRealCredentials(request.platform)) {
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

  // Real mode without credentials → pending_approval (no real post made).
  const pendingId = `${request.platform}_pending_${Date.now()}`;
  return {
    platform: request.platform,
    status: 'pending_approval',
    postId: pendingId,
    metadata: {
      platformSpecificId: pendingId,
    },
  };
}

/**
 * Publish to multiple platforms in parallel. The primary request's
 * `crossPostTo` list is merged with the explicit `requests` array.
 */
export async function publishToMultiple(
  requests: PublishRequest[],
  planTier?: PlanTier,
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
    expanded.map((r) => publishContent(r, planTier).catch((e): PublishResult => ({
      platform: r.platform,
      status: 'failed',
      error: String(e),
      metadata: {},
    }))),
  );
  return results;
}

/**
 * Schedule a post for later publishing. Validates that the schedule time
 * is in the future and that the platform supports scheduling.
 */
export async function schedulePost(
  request: PublishRequest,
  scheduleAt: string,
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

  const scheduledId = `${request.platform}_scheduled_${Date.now()}`;
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
