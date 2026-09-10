import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** POST /api/regulatory/filings/[id]/reject — reject a filing */
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
    const filing = await RegulatoryService.rejectFiling(id, reason, session.user.id);
    if (!filing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ filing });
  } catch (e) {
    console.error('[regulatory/filings] reject error:', e);
    return NextResponse.json({ error: 'failed_to_reject_filing' }, { status: 500 });
  }
}
