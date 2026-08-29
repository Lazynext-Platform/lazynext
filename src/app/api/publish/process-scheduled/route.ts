import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishToPlatform } from '@/lib/publishing/platform-adapters';
import { decryptToken } from '@/lib/publishing/token-crypto';

/**
 * POST /api/publish/process-scheduled
 * Processes due scheduled posts. Called by a cron trigger or external scheduler.
 *
 * Expects a CRON_SECRET env var for authentication.
 * Queries ScheduledPost WHERE status='scheduled' AND scheduledAt <= now()
 * and attempts to publish each one using the user's stored OAuth token.
 */
export async function POST(req: Request) {
  // Authenticate with CRON_SECRET
  const authHeader = req.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
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
      // Mark as publishing
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: 'publishing' },
      });

      // Get the user's platform connection
      const conn = await prisma.platformConnection.findUnique({
        where: { userId_platform: { userId: post.userId, platform: post.platform } },
      });

      if (!conn) {
        throw new Error('no_platform_connection');
      }

      // Check token expiry
      if (conn.tokenExpiresAt && new Date() > conn.tokenExpiresAt) {
        throw new Error('token_expired');
      }

      const accessToken = await decryptToken(conn.accessToken);

      // Publish to the platform
      const result = await publishToPlatform(post.platform, accessToken, {
        mediaUrl: post.mediaUrl,
        caption: post.caption,
        hashtags: [],
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
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[process-scheduled] post ${post.id} failed:`, errorMsg);

      // Mark as failed
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'failed',
          error: errorMsg,
        },
      });

      results.push({ id: post.id, status: 'failed', error: errorMsg });
    }
  }

  return NextResponse.json({
    processed: results.length,
    published: results.filter(r => r.status === 'published').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  });
}
