import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BankingService } from '@/lib/services/banking-service';

/** POST /api/banking/wires/[id]/cancel — cancel a wire transfer */
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
  const reason = String(body.reason || '').trim();

  try {
    const wire = await BankingService.cancelWireTransfer(id, reason, session.user.id);
    if (!wire) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ wire });
  } catch (e) {
    console.error('[banking/wires/cancel] error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_wire' }, { status: 500 });
  }
}
