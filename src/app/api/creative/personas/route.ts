import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { generatePersonas, PERSONA_COST, validatePersonaRequest } from '@/lib/creative/persona-engine';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const productName = typeof body.productName === 'string' ? body.productName.trim().slice(0, 200) : '';
  const validation = validatePersonaRequest({ ...body, productName });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', details: validation.errors }, { status: 400 });
  }

  try {
    await deductCredits(uid, PERSONA_COST, 'creative:personas');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  const numberOfPersonas = Math.max(1, Math.min(5, Math.round(Number(body.numberOfPersonas)) || 3));

  try {
    const result = await generatePersonas({
      productName,
      productDescription: typeof body.productDescription === 'string' ? body.productDescription.trim().slice(0, 4000) : undefined,
      market: typeof body.market === 'string' ? body.market.trim().slice(0, 200) : undefined,
      numberOfPersonas,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, PERSONA_COST, 'creative:personas');
    console.error('[creative/personas] error:', String(e));
    return NextResponse.json({ error: 'personas_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
