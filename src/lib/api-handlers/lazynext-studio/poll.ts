import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { pollMarketingTask } from '@/lib/lazynext-studio/poll-task';

export const maxDuration = 60;

// No-library proxy polling: frontend passes Atlas task getUrl, backend uses key to check status. Shared by marketing/drama/ad-reference.
// On completion, transfers output from Atlas temporary OSS to R2, returns a same-origin url that can be played inline / never expires.
// Locks Atlas domain to prevent SSRF (otherwise backend would carry key to request arbitrary urls).
// Polling itself is free and requires taskId, so no charge; but updates persisted task status by taskId,
// Atlas async failure (review block/timeout etc.) triggers idempotent refund by taskId (processing→failed atomic transition, only refunds once).
// Requires authentication: only the logged-in user who submitted the task should be able to poll it.
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const getUrl = typeof body.getUrl === 'string' ? body.getUrl : '';
  // In development, allow mock Atlas Cloud URLs (http://localhost:3099).
  // In production, restrict to the real Atlas Cloud API domain (SSRF protection).
  const isDev = process.env.NODE_ENV === 'development' || process.env.BUILD_TARGET === 'local';
  const allowedPattern = isDev
    ? /^(https:\/\/api\.atlascloud\.ai\/|http:\/\/localhost:\d+\/api\/v1\/)/
    : /^https:\/\/api\.atlascloud\.ai\//;
  if (!allowedPattern.test(getUrl)) {
    return NextResponse.json({ error: 'invalid_get_url' }, { status: 400 });
  }
  try {
    return NextResponse.json(await pollMarketingTask(getUrl));
  } catch (error) {
    console.error('[marketing/poll] poll error:', String(error));
    return NextResponse.json({ error: 'poll_failed' }, { status: 502 });
  }
}

export const POST = withAtlas(__byokPOST);
