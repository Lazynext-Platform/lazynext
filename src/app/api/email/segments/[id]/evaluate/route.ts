import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** POST /api/email/segments/[id]/evaluate — evaluate a segment and return matching subscriber IDs */
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
    const subscriberIds = await SubscriberService.evaluateSegment(id);
    return NextResponse.json({ subscriberIds, count: subscriberIds.length });
  } catch (e) {
    console.error('[email/segments/[id]/evaluate] error:', e);
    return NextResponse.json({ error: 'failed_to_evaluate' }, { status: 500 });
  }
}
