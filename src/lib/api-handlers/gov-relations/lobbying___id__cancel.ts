import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** POST /api/gov-relations/lobbying/[id]/cancel — cancel a lobbying activity */
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
    const lobbying = await GovRelationsService.cancelLobbying(id, reason, session.user.id);
    if (!lobbying) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ lobbying });
  } catch (e) {
    console.error('[gov-relations/lobbying/cancel] error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_lobbying' }, { status: 500 });
  }
}
