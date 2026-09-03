import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { randomUUID } from 'crypto';
import { getUserPlanTier } from '@/lib/plan-tier';
import { deductCredits, refundCredits } from '@/lib/credits';
import {
  schedulePost,
  SCHEDULE_CREDIT_COST,
} from '@/lib/publishing/publisher';
import { getPlatformCapabilities } from '@/lib/publishing/platforms';
import type { PublishRequest } from '@/lib/publishing/types';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

/** GET /api/publish/schedule — list the user's scheduled posts */
async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;

  const posts = await prisma.scheduledPost.findMany({
    where: {
      userId: uid,
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      platform: true,
      mediaUrl: true,
      caption: true,
      scheduledAt: true,
      status: true,
      postUrl: true,
      postId: true,
      error: true,
      createdAt: true,
    },
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });

  return NextResponse.json({ posts });
}

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
  const ref = `schedule:${request.platform}:${randomUUID()}`;

  try {
    await deductCredits(uid, cost, 'publish_schedule', ref);
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 });
    }
    console.error('[publish/schedule] charge error:', String(e));
    return NextResponse.json({ error: 'charge_failed' }, { status: 500 });
  }

  await getUserPlanTier(uid).catch(() => 'free' as const);

  let result;
  try {
    result = await schedulePost({ ...request, scheduleAt }, scheduleAt, uid);
  } catch (e) {
    await refundCredits(uid, cost, ref).catch(() => {});
    console.error('[publish/schedule] error:', String(e));
    return NextResponse.json({ error: 'schedule_failed' }, { status: 500 });
  }

  if (result.status === 'failed') {
    await refundCredits(uid, cost, ref).catch(() => {});
    return NextResponse.json({ error: 'schedule_failed', detail: result.error }, { status: 400 });
  }

  return NextResponse.json({ result });
}

/** DELETE /api/publish/schedule?id=xxx — cancel a scheduled post */
async function __byokDELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  // Find the scheduled post and verify ownership
  const post = await prisma.scheduledPost.findUnique({ where: { id } });
  if (!post || post.userId !== uid) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Only allow cancellation of posts that haven't been published yet
  if (post.status !== 'scheduled') {
    return NextResponse.json({ error: 'cannot_cancel_non_scheduled' }, { status: 400 });
  }

  // Mark as cancelled
  await prisma.scheduledPost.update({
    where: { id },
    data: { status: 'cancelled' },
  });

  // Refund the scheduling credit
  await refundCredits(uid, SCHEDULE_CREDIT_COST, `schedule_cancel:${id}`).catch(() => {});

  return NextResponse.json({ ok: true });
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
export const DELETE = withAtlas(__byokDELETE);
