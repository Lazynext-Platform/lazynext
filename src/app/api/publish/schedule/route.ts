import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getUserPlanTier } from '@/lib/plan-tier';
import { deductCredits, refundCredits } from '@/lib/credits';
import {
  schedulePost,
  SCHEDULE_CREDIT_COST,
} from '@/lib/publishing/publisher';
import { getPlatformCapabilities } from '@/lib/publishing/platforms';
import type { PublishRequest } from '@/lib/publishing/types';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const request = body.request as PublishRequest | undefined;
  const scheduleAt = body.scheduleAt as string | undefined;

  if (!request || !request.platform || !request.mediaUrl || !request.caption) {
    return NextResponse.json({ error: 'platform_media_caption_required' }, { status: 400 });
  }
  if (!scheduleAt) {
    return NextResponse.json({ error: 'schedule_at_required' }, { status: 400 });
  }

  // Validate scheduleAt is a valid future timestamp.
  const when = new Date(scheduleAt);
  if (Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: 'invalid_schedule_at' }, { status: 400 });
  }
  if (when.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'schedule_at_must_be_in_future' }, { status: 400 });
  }

  // Validate platform supports scheduling.
  const caps = getPlatformCapabilities(request.platform);
  if (!caps.allowsScheduling) {
    return NextResponse.json({ error: 'scheduling_not_supported' }, { status: 400 });
  }

  const cost = SCHEDULE_CREDIT_COST;
  const ref = `schedule:${request.platform}:${Date.now()}`;

  try {
    await deductCredits(uid, cost, 'publish_schedule', ref);
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 });
    }
    return NextResponse.json({ error: 'charge_failed', detail: String(e) }, { status: 500 });
  }

  const planTier = await getUserPlanTier(uid).catch(() => 'free' as const);

  let result;
  try {
    result = await schedulePost({ ...request, scheduleAt }, scheduleAt);
  } catch (e) {
    await refundCredits(uid, cost, ref).catch(() => {});
    console.error('[publish/schedule] error:', String(e));
    return NextResponse.json({ error: 'schedule_failed', detail: String(e) }, { status: 500 });
  }

  if (result.status === 'failed') {
    await refundCredits(uid, cost, ref).catch(() => {});
    return NextResponse.json({ error: 'schedule_failed', detail: result.error }, { status: 400 });
  }

  return NextResponse.json({ result });
}

export const POST = withAtlas(__byokPOST);
