import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MAService } from '@/lib/services/ma-service';

/** POST /api/ma/deals/[id]/terminate — terminate a deal */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const deal = await MAService.terminateDeal(id, reason, session.user.id);
    if (!deal) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ deal });
  } catch (e) {
    console.error('[ma/deals/terminate] error:', e);
    return NextResponse.json({ error: 'failed_to_terminate_deal' }, { status: 500 });
  }
}
