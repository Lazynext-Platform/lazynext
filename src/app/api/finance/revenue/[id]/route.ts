import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * PATCH /api/finance/revenue/[id] — defer a revenue recognition.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    // Default action is "defer"
    if (body.action === 'defer' || !body.action) {
      const record = await FinanceService.deferRevenue(id);
      return NextResponse.json({ revenue: record });
    }
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  } catch (e) {
    console.error('[finance/revenue] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_revenue' }, { status: 500 });
  }
}
