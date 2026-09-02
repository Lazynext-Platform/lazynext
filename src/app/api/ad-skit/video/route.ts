import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { deductCredits, grantCredits } from '@/lib/credits';
import { submitSkitVideo, getAdSkitVideoModel, AD_SKIT_TEMPLATE_ID } from '@/lib/ad-skit';
import { videoCredits } from '@/lib/video-pricing';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const planTier = await getUserPlanTier(session.user.id);
  const videoModel = getAdSkitVideoModel(planTier);
  // seedance ref-to-video fixed 720p / 15s: dynamic billing by seconds × resolution (no longer fixed AD_SKIT_COSTS.video).
  const AD_SKIT_VIDEO_COST = videoCredits(videoModel, '720p', 15);

  const body = await req.json().catch(() => ({}));
  const productUrls: string[] = Array.isArray(body.productUrls)
    ? body.productUrls.filter((u: unknown) => typeof u === 'string' && u.startsWith('http')).slice(0, 4)
    : typeof body.productUrl === 'string' && body.productUrl.startsWith('http')
      ? [body.productUrl]
      : [];
  const videoPrompt = typeof body.videoPrompt === 'string' ? body.videoPrompt.slice(0, 700) : '';
  const duration = Math.max(5, Math.min(15, Number(body.duration) || 15));
  if (!productUrls.length) return NextResponse.json({ error: 'product_url_required' }, { status: 400 });
  if (videoPrompt.length < 5) return NextResponse.json({ error: 'prompt_required' }, { status: 400 });

  try {
    await deductCredits(session.user.id, AD_SKIT_VIDEO_COST, 'generate', AD_SKIT_TEMPLATE_ID + ':video');
  } catch {
    return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 });
  }
  let res;
  try {
    res = await submitSkitVideo(productUrls, videoPrompt, duration, planTier);
  } catch (e) {
    await grantCredits(session.user.id, AD_SKIT_VIDEO_COST, 'refund', AD_SKIT_TEMPLATE_ID + ':video');
    console.error('[ad-skit/video] error:', String(e));
    return NextResponse.json({ error: 'submit_failed' }, { status: 502 });
  }
  // templateId uses formal 'ad-skit' (without ':') → final video enters "My Creations"; prompt stores friendly title (frontend passes plan.idea).
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : videoPrompt.slice(0, 120);
  const creation = await prisma.creation.create({
    data: { userId: session.user.id, templateId: AD_SKIT_TEMPLATE_ID, model: videoModel, prompt: title, status: 'processing', taskId: res.id, getUrl: res.getUrl, cost: AD_SKIT_VIDEO_COST },
  });
  return NextResponse.json({ id: creation.id, status: 'processing' });
}

export const POST = withAtlas(__byokPOST);
