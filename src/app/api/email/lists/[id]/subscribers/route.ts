import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** POST /api/email/lists/[id]/subscribers — add a subscriber to a list */
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
  const subscriberId = String(body.subscriberId || '').trim();
  if (!subscriberId) {
    return NextResponse.json({ error: 'subscriber_id_required' }, { status: 400 });
  }

  try {
    const result = await SubscriberService.addToList(id, subscriberId);
    return NextResponse.json({ ok: true, subscriber: result });
  } catch (e) {
    console.error('[email/lists/[id]/subscribers] add error:', e);
    return NextResponse.json({ error: 'failed_to_add_to_list' }, { status: 500 });
  }
}

/** DELETE /api/email/lists/[id]/subscribers — remove a subscriber from a list */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const subscriberId = searchParams.get('subscriberId') || '';

  try {
    const result = await SubscriberService.removeFromList(id, subscriberId);
    return NextResponse.json({ ok: true, subscriber: result });
  } catch (e) {
    console.error('[email/lists/[id]/subscribers] remove error:', e);
    return NextResponse.json({ error: 'failed_to_remove_from_list' }, { status: 500 });
  }
}
