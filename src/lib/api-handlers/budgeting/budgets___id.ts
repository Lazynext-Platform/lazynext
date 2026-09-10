import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BudgetingService } from '@/lib/services/budgeting-service';

/** GET /api/budgeting/budgets/[id] — get a single budget */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const budget = await BudgetingService.getBudget(id);
  if (!budget) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ budget });
}

/** PATCH /api/budgeting/budgets/[id] — update a budget */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const budget = await BudgetingService.updateBudget(id, body);
    if (!budget) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ budget });
  } catch (e) {
    console.error('[budgeting] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_budget' }, { status: 500 });
  }
}

/** DELETE /api/budgeting/budgets/[id] — delete a budget */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await BudgetingService.deleteBudget(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[budgeting] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_budget' }, { status: 500 });
  }
}
