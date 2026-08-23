import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { marketingPlanSchema } from '@/lib/marketing-studio/schema';
import { buildShotImagePrompt, buildShotImageEditPrompt, normalizeRatio, submitShotImage, MK_IMAGE_COST, SHOT_IMAGE_MODEL, SHOT_IMAGE_EDIT_MODEL } from '@/lib/marketing-studio/workflow';
import { chargeAndSubmit, chargeErrorResponse } from '@/lib/marketing-studio/gen-task';

export const maxDuration = 60;

// Product/avatar images may be site-relative paths (/api/marketing-studio/media/...), but Atlas edit requires public absolute URLs.
// Previously /^https?:\/\// directly filtered out relative paths → refImages empty → image generation fell back to pure text-to-image, never using uploaded product images
// (users observed "reference images never actually passed in" for this reason). Here we convert site-relative paths to absolute URLs based on the request origin.
function toAbsMedia(v: unknown, base: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.startsWith('/api/marketing-studio/media/')) return new URL(s, base).toString();
  return /^https?:\/\//.test(s) ? s : '';
}

// Per-shot image generation (nano-banana): requires login + charges MK_IMAGE_COST; refunds on submit/async failure, Atlas errors pass through.
async function __byokPOST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const parsed = marketingPlanSchema.safeParse(body.plan);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
  const plan = parsed.data;
  const idx = Number(body.shotIndex);
  const shot = Number.isInteger(idx) ? plan.shots[idx] : undefined;
  if (!shot) return NextResponse.json({ error: 'shot_index_out_of_range' }, { status: 400 });

  const ratio = normalizeRatio(plan.ratio);
  // Product images support multiple (productUrls[]); backward compatible with single productUrl. Avatar is single. Edit reference images max 4 (submitShotImage will slice).
  const rawProducts = Array.isArray(body.productUrls) ? body.productUrls : [body.productUrl];
  const productUrls: string[] = rawProducts.map((u: unknown) => toAbsMedia(u, req.url)).filter(Boolean);
  const avatarUrl = toAbsMedia(body.avatarUrl, req.url);
  // Avatar placed first: when multiple product images + portrait exceed submitShotImage's slice(4) limit, prioritize keeping the portrait (otherwise the speaking subject loses their face).
  const refImages = [avatarUrl, ...productUrls].filter(Boolean);
  const useEdit = refImages.length > 0;
  // Replica mode: frontend directly passes the image prompt (real person holding the product composition), takes priority over auto-constructed prompt.
  const promptOverride = typeof body.promptOverride === 'string' ? body.promptOverride.trim().slice(0, 3000) : '';
  const base = promptOverride || (useEdit
    ? buildShotImageEditPrompt(plan, shot, productUrls.length > 0, !!avatarUrl)
    : buildShotImagePrompt(plan, shot));
  // First-frame image generation hard-constrains no subtitles: promptOverride often contains spoken script with dialogue, edit would render dialogue as speech bubbles/subtitles, forcibly disabled here.
  const prompt = `${base} ABSOLUTELY NO text of any kind in the image: no speech bubbles, no captions, no subtitles, no dialogue text, no logo, no watermark.`;

  try {
    const submit = await chargeAndSubmit({
      uid,
      cost: MK_IMAGE_COST,
      ref: 'marketing:shot-image',
      templateId: 'mk-shot',
      model: useEdit ? SHOT_IMAGE_EDIT_MODEL : SHOT_IMAGE_MODEL,
      prompt,
      submit: () => submitShotImage(prompt, ratio, refImages),
    });
    return NextResponse.json({ id: submit.id, getUrl: submit.getUrl });
  } catch (e) {
    return chargeErrorResponse(e, 'marketing/shot-image');
  }
}

export const POST = withAtlas(__byokPOST);
