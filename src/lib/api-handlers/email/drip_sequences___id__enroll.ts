import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DripSequenceService } from '@/lib/services/drip-sequence-service';

/** POST /api/email/drip-sequences/[id]/enroll — enroll a subscriber in a drip sequence */
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
    const enrollment = await DripSequenceService.enrollSubscriber(id, subscriberId, session.user.id);
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (e) {
    console.error('[email/drip-sequences/[id]/enroll] error:', e);
    return NextResponse.json({ error: 'failed_to_enroll' }, { status: 500 });
  }
}
