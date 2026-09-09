import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BankingService } from '@/lib/services/banking-service';

/** POST /api/banking/wires/[id]/approve — approve a wire transfer */
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
    const wire = await BankingService.approveWireTransfer(id, session.user.id);
    if (!wire) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ wire });
  } catch (e) {
    console.error('[banking/wires/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve_wire' }, { status: 500 });
  }
}
