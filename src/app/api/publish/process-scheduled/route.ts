import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishToPlatform } from '@/lib/publishing/platform-adapters';
import { decryptToken } from '@/lib/publishing/token-crypto';
import { isTokenExpired, refreshPlatformToken } from '@/lib/publishing/token-refresh';
import { isUrlSafe } from '@/lib/security';

/** Map raw error strings to controlled client-safe codes for scheduled-post failures. */
function classifyPublishError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('token') || lower.includes('auth') || lower.includes('unauthorized')) return 'auth_error';
  if (lower.includes('rate') || lower.includes('429') || lower.includes('throttl')) return 'rate_limited';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'timeout';
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) return 'network';
  if (lower.includes('no_platform_connection')) return 'no_connection';
  if (lower.includes('token_expired_refresh_failed')) return 'token_refresh_failed';
  return 'publish_failed';
}

/**
 * POST /api/publish/process-scheduled
 * Processes due scheduled posts. Called by a cron trigger or external scheduler.
 *
 * Expects a CRON_SECRET env var for authentication.
 * Queries ScheduledPost WHERE status='scheduled' AND scheduledAt <= now()
 * and attempts to publish each one using the user's stored OAuth token.
 * If the stored token is expired, attempts to refresh it before publishing.
 *
 * Concurrency safety: Posts are atomically claimed by updating
 * status from 'scheduled' to 'publishing' with a conditional WHERE clause.
 * Only posts that were successfully claimed are processed, preventing
 * duplicate publishes from concurrent cron invocations.
 */
export async function POST(req: Request) {
  // Authenticate with CRON_SECRET
  const authHeader = req.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Find due posts
  const due = await prisma.scheduledPost.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: now },
    },
    take: 10, // Process in batches to avoid timeouts
    orderBy: { scheduledAt: 'asc' },
  });

  if (due.length === 0) {
    return NextResponse.json({ processed: 0, message: 'no_due_posts' });
  }

  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const post of due) {
    try {
      // Atomically claim the post: only update if still 'scheduled'.
      // This prevents concurrent cron invocations from processing the same post.
      const claim = await prisma.scheduledPost.updateMany({
        where: { id: post.id, status: 'scheduled' },
        data: { status: 'publishing' },
      });

      // If claim count is 0, another invocation already claimed it — skip
      if (claim.count === 0) {
        continue;
      }

      // Get the user's platform connection
      const conn = await prisma.platformConnection.findUnique({
        where: { userId_platform: { userId: post.userId, platform: post.platform } },
      });

      if (!conn) {
        throw new Error('no_platform_connection');
      }

      // Get access token — refresh if expired
      let accessToken: string;
      if (isTokenExpired(conn.tokenExpiresAt)) {
        const refreshed = await refreshPlatformToken(conn);
        if (!refreshed) throw new Error('token_expired_refresh_failed');
        accessToken = refreshed;
      } else {
        accessToken = await decryptToken(conn.accessToken);
      }

      // Publish to the platform using persisted metadata
      const hashtags: string[] = (() => {
        try { return JSON.parse(post.hashtagsJson || '[]') as string[]; } catch { return []; }
      })();
      // Defense in depth: re-validate stored mediaUrl before server-side fetch.
      if (!isUrlSafe(post.mediaUrl)) {
        throw new Error('blocked_media_url');
      }
      const result = await publishToPlatform(post.platform, accessToken, {
        mediaUrl: post.mediaUrl,
        caption: post.caption,
        hashtags,
        privacyLevel: post.privacyLevel || undefined,
      });

      // Mark as published
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'published',
          postId: result.postId,
          postUrl: result.postUrl,
        },
      });

      results.push({ id: post.id, status: 'published' });
    } catch (e) {
      const rawError = e instanceof Error ? e.message : String(e);
      const errorCode = classifyPublishError(rawError);
      console.error(`[process-scheduled] post ${post.id} failed:`, rawError);

      // Mark as failed (only if we claimed it — if claim failed, don't touch it)
      // Store only the sanitized error code, not the raw error message.
      await prisma.scheduledPost.updateMany({
        where: { id: post.id, status: 'publishing' },
        data: {
          status: 'failed',
          error: errorCode,
        },
      }).catch(() => {});

      results.push({ id: post.id, status: 'failed', error: errorCode });
    }
  }

  return NextResponse.json({
    processed: results.length,
    published: results.filter(r => r.status === 'published').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  });
}
