import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BudgetingService } from '@/lib/services/budgeting-service';

/** GET /api/budgeting/forecasts/[id] — get a single forecast */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const forecast = await BudgetingService.getForecast(id);
  if (!forecast) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ forecast });
}

/** DELETE /api/budgeting/forecasts/[id] — delete a forecast */
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
    const ok = await BudgetingService.deleteForecast(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[budgeting] delete forecast error:', e);
    return NextResponse.json({ error: 'failed_to_delete_forecast' }, { status: 500 });
  }
}
