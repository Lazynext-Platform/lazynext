import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BankingService } from '@/lib/services/banking-service';

/** POST /api/banking/reconciliations/[id]/complete — complete a reconciliation */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const reconciliation = await BankingService.completeReconciliation(id, session.user.id);
    if (!reconciliation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ reconciliation });
  } catch (e) {
    console.error('[banking/reconciliations/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_reconciliation' }, { status: 500 });
  }
}
