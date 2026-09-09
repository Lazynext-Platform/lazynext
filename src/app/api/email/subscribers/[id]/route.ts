import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** GET /api/email/subscribers/[id] — get a single subscriber */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const subscriber = await SubscriberService.getSubscriber(id);
  if (!subscriber) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ subscriber });
}

/** PATCH /api/email/subscribers/[id] — update a subscriber */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const subscriber = await SubscriberService.updateSubscriber(id, {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      status: body.status,
      tags: body.tags,
      metadata: body.metadata,
      listIds: body.listIds,
    });
    return NextResponse.json({ subscriber });
  } catch (e) {
    console.error('[email/subscribers/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_subscriber' }, { status: 500 });
  }
}

/** DELETE /api/email/subscribers/[id] — remove a subscriber */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await SubscriberService.removeSubscriber(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[email/subscribers/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_remove_subscriber' }, { status: 500 });
  }
}
