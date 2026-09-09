import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PartnerService } from '@/lib/services/partner-service';

/** POST /api/partners/deals/[id]/close — close a deal */
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
  const stage = String(body.stage || '').trim();
  if (stage !== 'closed_won' && stage !== 'closed_lost') {
    return NextResponse.json({ error: 'stage_must_be_closed_won_or_closed_lost' }, { status: 400 });
  }

  try {
    const deal = await PartnerService.closeDeal(id, stage as never, session.user.id, body.notes);
    if (!deal) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ deal });
  } catch (e) {
    console.error('[partners/deals/close] error:', e);
    return NextResponse.json({ error: 'failed_to_close_deal' }, { status: 500 });
  }
}
