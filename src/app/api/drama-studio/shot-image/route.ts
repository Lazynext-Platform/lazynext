import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { submitShotImage, normalizeRatio, MK_IMAGE_COST, getShotImageModel, getShotImageEditModel } from '@/lib/lazynext-studio/workflow';
import { chargeAndSubmit, chargeErrorResponse } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';
import { isUrlSafe } from '@/lib/security';

export const maxDuration = 60;

// Script storyboard image generation (reuses marketing underlying nano-banana): requires login + charges MK_IMAGE_COST; refunds on submit/async failure, Atlas errors pass through.
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 3000) : '';
  const ratio = normalizeRatio(body.ratio);
  // Convert relative paths (site /api/lazynext-studio/media/...) to absolute URLs, otherwise they get filtered out → refImages empty → falls back to pure text-to-image,
  // look images/product/scene reference images silently fail, inconsistent per shot (marketing fixed toAbsMedia earlier, drama was missed here before).
  const toAbs = (u: unknown): string => {
    const s = typeof u === 'string' ? u.trim() : '';
    if (s.startsWith('/api/lazynext-studio/media/')) return new URL(s, req.url).toString();
    if (!/^https?:\/\//.test(s)) return '';
    return isUrlSafe(s) ? s : '';
  };
  const refImages = (Array.isArray(body.refImages) ? body.refImages : []).map(toAbs).filter(Boolean) as string[];
  if (!prompt) return NextResponse.json({ error: 'prompt_required' }, { status: 400 });

  try {
    const submit = await chargeAndSubmit({
      uid,
      cost: MK_IMAGE_COST,
      ref: 'drama:shot-image',
      templateId: 'drama-shot',
      model: refImages.length ? getShotImageEditModel(planTier) : getShotImageModel(planTier),
      prompt,
      submit: () => submitShotImage(prompt, ratio, refImages, planTier),
    });
    return NextResponse.json({ id: submit.id, getUrl: submit.getUrl });
  } catch (e) {
    return chargeErrorResponse(e, 'drama/shot-image');
  }
}

export const POST = withAtlas(__byokPOST);
