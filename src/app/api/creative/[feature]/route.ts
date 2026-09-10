import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { withAtlas } from '@/lib/request-context';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeAtlasError } from '@/lib/security';
import { getCreativeFeature } from '@/lib/creative/registry';

export const maxDuration = 60;

/**
 * GET /api/creative/[feature]
 * Returns the credit cost and feature info for a creative generation feature.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const handler = getCreativeFeature(feature);
  if (!handler) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ feature, creditCost: handler.creditCost });
}

async function __byokPOST(req: Request, { params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const handler = getCreativeFeature(feature);
  if (!handler) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const validation = handler.validate(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = handler.creditCost;
  try {
    await deductCredits(uid, cost, `creative:${feature}`);
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

  try {
    const result = await handler.generate(body, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, `creative:${feature}`).catch(() => {});
    const { error, status } = safeAtlasError(e, `creative/${feature}`, 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
