import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  enhanceProductImage,
  ENHANCEMENT_COSTS,
  validateImageRequest,
  type ProductImageRequest,
  type ImageEnhancementType,
} from '@/lib/creative/product-image';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 60;

const VALID_ENHANCEMENT_TYPES = new Set<ImageEnhancementType>([
  'background_removal',
  'scene_generation',
  'lifestyle_context',
  'multi_angle',
  'color_correction',
  'shadow_addition',
  'reflection',
  'resize_crop',
]);

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim().slice(0, 2048) : '';
  if (!imageUrl) return NextResponse.json({ error: 'image_url_required' }, { status: 400 });

  const enhancementType = typeof body.enhancementType === 'string' ? body.enhancementType : '';
  if (!enhancementType) return NextResponse.json({ error: 'enhancement_type_required' }, { status: 400 });
  if (!VALID_ENHANCEMENT_TYPES.has(enhancementType as ImageEnhancementType)) {
    return NextResponse.json({ error: 'enhancement_type_invalid' }, { status: 400 });
  }

  const request: ProductImageRequest = {
    imageUrl,
    enhancementType: enhancementType as ImageEnhancementType,
    sceneDescription: typeof body.sceneDescription === 'string' ? body.sceneDescription.trim().slice(0, 1000) : undefined,
    lifestyleContext: typeof body.lifestyleContext === 'string' ? body.lifestyleContext.trim().slice(0, 200) : undefined,
    angleType: typeof body.angleType === 'string' ? body.angleType.trim().slice(0, 50) : undefined,
    outputFormat:
      body.outputFormat === 'png' || body.outputFormat === 'jpg' || body.outputFormat === 'webp'
        ? body.outputFormat
        : undefined,
    outputSize:
      body.outputSize && typeof body.outputSize === 'object' &&
      typeof body.outputSize.width === 'number' && typeof body.outputSize.height === 'number'
        ? {
            width: Math.max(1, Math.min(8192, Math.round(body.outputSize.width))),
            height: Math.max(1, Math.min(8192, Math.round(body.outputSize.height))),
          }
        : undefined,
  };

  // Server-side validation (catches conditional requirements, e.g. scene_description).
  const validation = validateImageRequest(request);
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join(', ') }, { status: 400 });
  }

  const cost = ENHANCEMENT_COSTS[request.enhancementType];

  try {
    await deductCredits(uid, cost, 'creative:product-image');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await enhanceProductImage(request, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:product-image');
    console.error('[creative/product-image] error:', String(e));
    return NextResponse.json({ error: 'enhancement_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
