import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  cleanText,
  normalizeVideoDuration,
  normalizeVideoRatio,
  normalizeVideoResolution,
  submitShotVideo,
  submitShotRefVideo,
  getShotVideoModel,
  getShotRefVideoModel,
  getReplicaVideoModel,
} from '@/lib/lazynext-studio/workflow';
import {
  chargeAndSubmit,
  chargeErrorResponse,
  linkMarketingCreationTask,
} from '@/lib/lazynext-studio/gen-task';
import { videoCredits } from '@/lib/video-pricing';
import { getUserPlanTier } from '@/lib/plan-tier';
import { isUrlSafe } from '@/lib/security';

export const maxDuration = 60;

// Per-shot video generation (Seedance 2.0 i2v): requires login + charges MK_VIDEO_COST; refunds on submit failure, poll refunds on async failure, Atlas errors pass through.
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const prompt = cleanText(body.prompt, '', 3000);
  const ratio = normalizeVideoRatio(body.ratio);
  const resolution = normalizeVideoResolution(body.resolution);
  const duration = normalizeVideoDuration(body.duration);
  const creationId = typeof body.creationId === 'string' ? body.creationId.trim() : '';
  if (!prompt) return NextResponse.json({ error: 'prompt_required' }, { status: 400 });

  // Convert site-relative paths (/api/lazynext-studio/media/...) to public absolute URLs, otherwise Atlas cannot fetch them.
  // Wraps with SSRF validation: same-origin media paths are safe, external URLs must pass isUrlSafe.
  const toAbs = (u: unknown): string => {
    const s = typeof u === 'string' ? u.trim() : '';
    if (s.startsWith('/api/lazynext-studio/media/')) return new URL(s, req.url).toString();
    if (!/^https?:\/\//.test(s)) return '';
    return isUrlSafe(s) ? s : '';
  };

  // Drama per-shot: if referenceImages[] is provided, use reference-to-video (product image + character look image + scene image directly to video);
  // otherwise marketing single first-frame i2v (imageUrl).
  const referenceImages = (Array.isArray(body.referenceImages) ? body.referenceImages : []).map(toAbs).filter(Boolean);

  try {
    if (referenceImages.length) {
      const refVideoModel = getShotRefVideoModel(planTier);
      const submit = await chargeAndSubmit({
        uid,
        cost: videoCredits(refVideoModel, resolution, duration),
        ref: 'drama:ref-video',
        templateId: 'mk-shot',
        model: refVideoModel,
        prompt,
        submit: () => submitShotRefVideo(referenceImages, prompt, { ratio, resolution, duration, planTier }),
      });
      return NextResponse.json({ id: submit.id, getUrl: submit.getUrl });
    }

    const imageUrl = toAbs(body.imageUrl);
    if (!/^https?:\/\//.test(imageUrl)) return NextResponse.json({ error: 'image_url_required' }, { status: 400 });
    // Replica mode: frontend may specify veo3.1-fast (with dialogue lip-sync speaking); whitelist-validated, arbitrary models not accepted.
    const replicaModel = getReplicaVideoModel(planTier);
    const model = body.model === replicaModel ? replicaModel : getShotVideoModel(planTier);
    const submit = await chargeAndSubmit({
      uid,
      cost: videoCredits(model, resolution, duration),
      ref: 'marketing:shot-video',
      templateId: 'mk-shot',
      model,
      prompt,
      submit: () => submitShotVideo(imageUrl, prompt, { ratio, resolution, duration, model }),
    });
    const parentLinked = await linkMarketingCreationTask({
      uid,
      creationId,
      taskId: submit.id,
      getUrl: submit.getUrl,
      model,
    });
    return NextResponse.json({ id: submit.id, getUrl: submit.getUrl, parentLinked });
  } catch (e) {
    return chargeErrorResponse(e, 'marketing/shot-video');
  }
}

export const POST = withAtlas(__byokPOST);
