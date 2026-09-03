import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateProductBrief,
  validateProductBriefInput,
  PRODUCT_BRIEF_CREDIT_COST,
  type ProductBriefInput,
} from '@/lib/creative/product-brief';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { isUrlSafe, safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

const VALID_PLATFORMS = new Set(['tiktok', 'instagram', 'youtube', 'facebook']);

// ── GET: return credit cost and schema info ──

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  return NextResponse.json({
    creditCost: PRODUCT_BRIEF_CREDIT_COST,
    schema: {
      input: {
        productName: 'string (required)',
        productUrl: 'string (optional, http/https)',
        category: 'string (optional)',
        audience: 'string (optional)',
        platform: 'tiktok | instagram | youtube | facebook (optional)',
        durationSeconds: 'number (optional, 5-180)',
        price: 'string (optional)',
        benefits: 'string[] (required, at least 1)',
        painPoints: 'string[] (optional)',
        proofPoints: 'string[] (optional)',
        offer: 'string (optional)',
        tone: 'string (optional)',
      },
      output: {
        productRead: 'object { name, category, audience, keyBenefits[], positioning }',
        angles: 'AdAngle[] (3 angles)',
        scripts: 'UgcScript[] (3 scripts, one per angle)',
        storyboard: 'StoryboardScene[] (5 scenes)',
        generationPrompt: 'string (Atlas-ready video generation prompt)',
        complianceNotes: 'string[]',
      },
    },
  });
}

// ── POST: generate product brief ──

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  // Extract and sanitize input fields
  const productName = typeof body.productName === 'string' ? body.productName.trim().slice(0, 500) : '';
  if (!productName) return NextResponse.json({ error: 'product_name_required' }, { status: 400 });

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.has(body.platform)
      ? (body.platform as ProductBriefInput['platform'])
      : undefined;

  const durationSeconds =
    typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds) &&
    body.durationSeconds >= 5 && body.durationSeconds <= 180
      ? Math.round(body.durationSeconds)
      : undefined;

  const benefits = Array.isArray(body.benefits)
    ? body.benefits.filter((b: unknown) => typeof b === 'string' && b.trim()).map((b: string) => b.trim().slice(0, 500))
    : [];
  if (benefits.length === 0) return NextResponse.json({ error: 'benefits_required' }, { status: 400 });

  const input: ProductBriefInput = {
    productName,
    productUrl: typeof body.productUrl === 'string' && isUrlSafe(body.productUrl) ? body.productUrl.trim().slice(0, 2048) : undefined,
    category: typeof body.category === 'string' ? body.category.trim().slice(0, 200) : undefined,
    audience: typeof body.audience === 'string' ? body.audience.trim().slice(0, 500) : undefined,
    platform,
    durationSeconds,
    price: typeof body.price === 'string' ? body.price.trim().slice(0, 100) : undefined,
    benefits,
    painPoints: Array.isArray(body.painPoints)
      ? body.painPoints.filter((p: unknown) => typeof p === 'string' && p.trim()).map((p: string) => p.trim().slice(0, 500))
      : undefined,
    proofPoints: Array.isArray(body.proofPoints)
      ? body.proofPoints.filter((p: unknown) => typeof p === 'string' && p.trim()).map((p: string) => p.trim().slice(0, 500))
      : undefined,
    offer: typeof body.offer === 'string' ? body.offer.trim().slice(0, 500) : undefined,
    tone: typeof body.tone === 'string' ? body.tone.trim().slice(0, 200) : undefined,
  };

  // Server-side validation (catches all conditional requirements)
  const validation = validateProductBriefInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  // Charge credits
  try {
    await deductCredits(uid, PRODUCT_BRIEF_CREDIT_COST, 'creative:product-brief');
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'INSUFFICIENT_CREDITS'
            ? 'insufficient_credits'
            : 'charge_failed',
      },
      { status: 402 },
    );
  }

  // Generate the brief
  try {
    const result = await generateProductBrief(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, PRODUCT_BRIEF_CREDIT_COST, 'creative:product-brief');
    const { error, status } = safeAtlasError(e, 'creative/product-brief', 'product_brief_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
