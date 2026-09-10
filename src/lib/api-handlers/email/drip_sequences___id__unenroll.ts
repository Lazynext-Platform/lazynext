import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DripSequenceService } from '@/lib/services/drip-sequence-service';

/** POST /api/email/drip-sequences/[id]/unenroll — unenroll a subscriber from a drip sequence */
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
  const subscriberId = String(body.subscriberId || '').trim();
  if (!subscriberId) {
    return NextResponse.json({ error: 'subscriber_id_required' }, { status: 400 });
  }

  try {
    const results = await DripSequenceService.unenrollSubscriber(id, subscriberId);
    return NextResponse.json({ cancelled: results.length });
  } catch (e) {
    console.error('[email/drip-sequences/[id]/unenroll] error:', e);
    return NextResponse.json({ error: 'failed_to_unenroll' }, { status: 500 });
  }
}
