import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CreativeBudgetBridge } from '@/lib/services/creative-budget-bridge';

/**
 * POST /api/creative-budget/check — check if a creative spend is within budget.
 *
 * Body: { amount: number }
 * Returns: { allowed, remaining, limit }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const amount = Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    const ws = workspaces[0];
    const result = await CreativeBudgetBridge.checkCreativeBudget(
      ws.id,
      ws.organizationId,
      amount,
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error('[creative-budget/check] error:', e);
    return NextResponse.json({ error: 'failed_to_check_budget' }, { status: 500 });
  }
}
