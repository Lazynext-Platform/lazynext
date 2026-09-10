import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MAService } from '@/lib/services/ma-service';

/** POST /api/ma/deals/[id]/advance — advance a deal to a new status */
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
  const status = String(body.status || '').trim();
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const deal = await MAService.advanceDeal(id, status as never, session.user.id);
    if (!deal) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ deal });
  } catch (e) {
    console.error('[ma/deals/advance] error:', e);
    return NextResponse.json({ error: 'failed_to_advance_deal' }, { status: 500 });
  }
}
