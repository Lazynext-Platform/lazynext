import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BudgetingService } from '@/lib/services/budgeting-service';

/** POST /api/budgeting/budgets/[id]/spending — record spending against a budget */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const entry = await BudgetingService.recordSpending(id, {
      amountUsd: body.amountUsd !== undefined ? Number(body.amountUsd) : undefined,
      amountCredits: body.amountCredits !== undefined ? Number(body.amountCredits) : undefined,
      category: body.category,
      description: body.description,
      toolCallId: body.toolCallId,
      agentRunId: body.agentRunId,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    console.error('[budgeting] spending error:', e);
    return NextResponse.json({ error: 'failed_to_record_spending' }, { status: 500 });
  }
}
