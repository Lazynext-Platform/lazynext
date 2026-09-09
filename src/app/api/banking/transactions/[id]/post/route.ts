import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BankingService } from '@/lib/services/banking-service';

/** POST /api/banking/transactions/[id]/post — post a transaction */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const transaction = await BankingService.postTransaction(id, session.user.id);
    if (!transaction) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ transaction });
  } catch (e) {
    console.error('[banking/transactions/post] error:', e);
    return NextResponse.json({ error: 'failed_to_post_transaction' }, { status: 500 });
  }
}
