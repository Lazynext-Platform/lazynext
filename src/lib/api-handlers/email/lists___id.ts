import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** GET /api/email/lists/[id] — get a single list */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const list = await SubscriberService.getList(id);
  if (!list) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ list });
}

/** PATCH /api/email/lists/[id] — update a list */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const list = await SubscriberService.updateList(id, {
      name: body.name,
      description: body.description,
      tags: body.tags,
      isPublic: body.isPublic,
    });
    return NextResponse.json({ list });
  } catch (e) {
    console.error('[email/lists/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_list' }, { status: 500 });
  }
}

/** DELETE /api/email/lists/[id] — delete a list */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await SubscriberService.deleteList(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[email/lists/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_list' }, { status: 500 });
  }
}
