import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BankingService } from '@/lib/services/banking-service';

/** GET /api/banking/reconciliations/[id] — get a single reconciliation */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const reconciliation = await BankingService.getReconciliation(id);
  if (!reconciliation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ reconciliation });
}

/** PATCH /api/banking/reconciliations/[id] — update a reconciliation */
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
    const reconciliation = await BankingService.updateReconciliation(id, {
      period: body.period, statementBalance: body.statementBalance,
      bookBalance: body.bookBalance, status: body.status, notes: body.notes,
    });
    if (!reconciliation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ reconciliation });
  } catch (e) {
    console.error('[banking/reconciliations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_reconciliation' }, { status: 500 });
  }
}
