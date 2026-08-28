import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  repurposeCreative,
  validateRepurposingRequest,
  REPURPOSING_COST,
  type SourceFormat,
  type TargetFormat,
  type Platform,
} from '@/lib/creative/repurposing';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

const VALID_SOURCES: SourceFormat[] = ['video', 'image', 'script', 'carousel', 'story', 'long_form_video'];
const VALID_TARGETS: TargetFormat[] = [
  'short_form_video', 'image_carousel', 'single_image', 'story_set',
  'social_post', 'email_creative', 'display_ad', 'vertical_video',
  'horizontal_video', 'square_video',
];
const VALID_PLATFORMS: Platform[] = ['meta', 'google', 'tiktok', 'youtube', 'instagram', 'x', 'linkedin', 'pinterest', 'snapchat'];

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const sourceContent = typeof body.sourceContent === 'string' ? body.sourceContent.slice(0, 10000) : '';
  const sourceFormat = typeof body.sourceFormat === 'string' && VALID_SOURCES.includes(body.sourceFormat as SourceFormat)
    ? (body.sourceFormat as SourceFormat) : undefined;

  const targetFormats: TargetFormat[] = Array.isArray(body.targetFormats)
    ? body.targetFormats.filter((f: unknown) => typeof f === 'string' && VALID_TARGETS.includes(f as TargetFormat)).slice(0, 5) as TargetFormat[]
    : [];

  const platforms: Platform[] | undefined = Array.isArray(body.platforms)
    ? body.platforms.filter((p: unknown) => typeof p === 'string' && VALID_PLATFORMS.includes(p as Platform)).slice(0, 5) as Platform[]
    : undefined;

  const brandContext = typeof body.brandContext === 'string' ? body.brandContext.slice(0, 2000) : undefined;

  const validation = validateRepurposingRequest({ sourceContent, sourceFormat, targetFormats });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, REPURPOSING_COST, 'creative:repurposing');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await repurposeCreative({
      sourceContent,
      sourceFormat: sourceFormat!,
      targetFormats,
      platforms: platforms && platforms.length > 0 ? platforms : undefined,
      brandContext,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, REPURPOSING_COST, 'creative:repurposing');
    console.error('[creative/repurposing] error:', String(e));
    return NextResponse.json({ error: 'repurposing_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
