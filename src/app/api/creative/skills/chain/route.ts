import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getChain, executeChain, estimateChainCredits } from '@/lib/creative/skill-library';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { randomUUID } from 'crypto';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const chainId = typeof body.chainId === 'string' ? body.chainId : '';
  const inputs = (body.inputs && typeof body.inputs === 'object' ? body.inputs : {}) as Record<string, unknown>;

  if (!chainId) return NextResponse.json({ error: 'chain_id_required' }, { status: 400 });

  const chain = getChain(chainId);
  if (!chain) {
    return NextResponse.json({ error: 'chain_not_found' }, { status: 404 });
  }

  // Charge the total chain credits up front with an idempotency key
  // so duplicate requests (e.g. retries) don't double-charge.
  const cost = estimateChainCredits(chain);
  const idempotencyKey = `chain:${chainId}:${randomUUID()}`;
  if (cost > 0) {
    try {
      await deductCredits(uid, cost, `creative:skill-chain:${chainId}`, undefined, idempotencyKey);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed',
        },
        { status: 402 },
      );
    }
  }

  try {
    const { results, finalOutput } = await executeChain(chainId, inputs, planTier);
    return NextResponse.json({ results, finalOutput });
  } catch (e) {
    if (cost > 0) await refundCredits(uid, cost, `creative:skill-chain:${chainId}`);
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[creative/skills/chain] execute ${chainId} error:`, message);
    return NextResponse.json({ error: 'chain_execution_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
