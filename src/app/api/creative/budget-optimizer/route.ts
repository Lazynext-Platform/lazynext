import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { optimizeBudget, validateOptimizationRequest, BUDGET_OPTIMIZER_COST, type OptimizationRequest } from '@/lib/creative/budget-optimizer';
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
  const validation = validateOptimizationRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, BUDGET_OPTIMIZER_COST, 'creative:budget-optimizer');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await optimizeBudget({ ...(body as OptimizationRequest), planTier });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, BUDGET_OPTIMIZER_COST, 'creative:budget-optimizer');
    console.error('[creative/budget-optimizer] error:', String(e));
    return NextResponse.json({ error: 'optimization_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
