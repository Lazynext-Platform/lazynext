import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BudgetingService } from '@/lib/services/budgeting-service';

/** DELETE /api/budgeting/scenarios/[id] — delete a scenario */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await BudgetingService.deleteScenario(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[budgeting] delete scenario error:', e);
    return NextResponse.json({ error: 'failed_to_delete_scenario' }, { status: 500 });
  }
}
