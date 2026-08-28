import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateUgcAd,
  UGC_COST,
  type UgcFormatType,
  type PlatformFormat,
  type CreatorPersona,
} from '@/lib/creative/ugc-formats';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 60;

const VALID_FORMATS: UgcFormatType[] = [
  'testimonial', 'reaction', 'unboxing', 'before_after', 'tutorial', 'review', 'comparison',
];
const VALID_PLATFORMS: PlatformFormat[] = [
  'tiktok', 'reels', 'shorts', 'snapchat', 'facebook_story',
];
const VALID_PERSONAS: CreatorPersona[] = [
  'enthusiastic_customer', 'expert_reviewer', 'casual_user', 'influencer', 'everyday_person',
];

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  // Validate productName (required)
  const productName = typeof body.productName === 'string' ? body.productName.trim() : '';
  if (!productName) {
    return NextResponse.json({ error: 'product_name_required' }, { status: 400 });
  }
  if (productName.length > 300) {
    return NextResponse.json({ error: 'product_name_too_long' }, { status: 400 });
  }

  // Validate format
  const format = body.format as UgcFormatType | undefined;
  if (!format || !VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: 'invalid_format', detail: `format must be one of: ${VALID_FORMATS.join(', ')}` },
      { status: 400 },
    );
  }

  // Validate platform
  const platform = body.platform as PlatformFormat | undefined;
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: 'invalid_platform', detail: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` },
      { status: 400 },
    );
  }

  // Validate persona
  const persona = body.persona as CreatorPersona | undefined;
  if (!persona || !VALID_PERSONAS.includes(persona)) {
    return NextResponse.json(
      { error: 'invalid_persona', detail: `persona must be one of: ${VALID_PERSONAS.join(', ')}` },
      { status: 400 },
    );
  }

  // Optional fields
  const productDescription =
    typeof body.productDescription === 'string' ? body.productDescription.trim().slice(0, 2000) : undefined;
  const brandName =
    typeof body.brandName === 'string' ? body.brandName.trim().slice(0, 200) : undefined;
  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, 300) : undefined;
  const durationSec =
    typeof body.durationSec === 'number'
      ? Math.max(15, Math.min(90, Math.round(body.durationSec)))
      : undefined;
  const keyBenefits = Array.isArray(body.keyBenefits)
    ? (body.keyBenefits as unknown[])
        .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
        .map((b) => b.trim())
        .slice(0, 10)
    : undefined;

  try {
    await deductCredits(uid, UGC_COST, 'creative:ugc');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await generateUgcAd(
      {
        productName,
        productDescription,
        format,
        platform,
        persona,
        durationSec,
        brandName,
        keyBenefits,
        targetAudience,
      },
      planTier,
    );
    return NextResponse.json({ result, cost: UGC_COST });
  } catch (e) {
    await refundSync(uid, UGC_COST, 'creative:ugc');
    console.error('[creative/ugc] error:', String(e));
    return NextResponse.json({ error: 'ugc_generation_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
