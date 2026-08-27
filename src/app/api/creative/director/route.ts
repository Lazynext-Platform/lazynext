import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { runCreativeDirector } from '@/lib/creative/director';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';

export const maxDuration = 120;

const DIRECTOR_BUDGET_DEFAULT = 30;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const budget = typeof body.budgetCredits === 'number' ? Math.min(body.budgetCredits, 50) : DIRECTOR_BUDGET_DEFAULT;

  // Pre-charge the full budget; refund unused credits after
  try {
    await deductCredits(uid, budget, 'creative:director');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await runCreativeDirector({
      brandUrl: body.brandUrl,
      productUrl: body.productUrl,
      productText: body.productText,
      productName: body.productName,
      platform: body.platform,
      format: body.format,
      budgetCredits: budget,
      requireStepApproval: false,
    });

    // Refund unused credits
    const unused = budget - result.totalCreditsSpent;
    if (unused > 0) {
      await refundSync(uid, unused, 'creative:director:refund');
    }

    return NextResponse.json({ result });
  } catch (e) {
    // Refund all credits on failure
    await refundSync(uid, budget, 'creative:director:failed');
    console.error('[creative/director] error:', String(e));
    return NextResponse.json({ error: 'director_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
