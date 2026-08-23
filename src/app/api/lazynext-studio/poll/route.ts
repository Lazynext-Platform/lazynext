import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { pollMarketingTask } from '@/lib/lazynext-studio/poll-task';

export const maxDuration = 60;

// No-library proxy polling: frontend passes Atlas task getUrl, backend uses key to check status. Shared by marketing/drama/ad-reference.
// On completion, transfers output from Atlas temporary OSS to R2, returns a same-origin url that can be played inline / never expires.
// Locks Atlas domain to prevent SSRF (otherwise backend would carry key to request arbitrary urls).
// Polling itself is free and requires taskId, so no session/no charge; but updates persisted task status by taskId,
// Atlas async failure (review block/timeout etc.) triggers idempotent refund by taskId (processing→failed atomic transition, only refunds once).
async function __byokPOST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const getUrl = typeof body.getUrl === 'string' ? body.getUrl : '';
  if (!/^https:\/\/api\.atlascloud\.ai\//.test(getUrl)) {
    return NextResponse.json({ error: 'invalid_get_url' }, { status: 400 });
  }
  try {
    return NextResponse.json(await pollMarketingTask(getUrl));
  } catch (error) {
    const detail = String(error);
    console.error('[marketing/poll] poll error:', detail);
    return NextResponse.json({ error: 'poll_failed', detail }, { status: 502 });
  }
}

export const POST = withAtlas(__byokPOST);
