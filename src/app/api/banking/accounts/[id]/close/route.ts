import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BankingService } from '@/lib/services/banking-service';

/** POST /api/banking/accounts/[id]/close — close a bank account */
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
    const account = await BankingService.closeAccount(id, session.user.id);
    if (!account) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ account });
  } catch (e) {
    console.error('[banking/accounts/close] error:', e);
    return NextResponse.json({ error: 'failed_to_close_account' }, { status: 500 });
  }
}
