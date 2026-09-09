import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DripSequenceService } from '@/lib/services/drip-sequence-service';

/** GET /api/email/drip-sequences/[id] — get a single drip sequence */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const sequence = await DripSequenceService.get(id);
  if (!sequence) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ sequence });
}

/** PATCH /api/email/drip-sequences/[id] — update a drip sequence */
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
    const sequence = await DripSequenceService.update(id, {
      name: body.name,
      description: body.description,
      steps: body.steps,
      status: body.status,
      listId: body.listId,
      trigger: body.trigger,
    });
    return NextResponse.json({ sequence });
  } catch (e) {
    console.error('[email/drip-sequences/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_sequence' }, { status: 500 });
  }
}

/** DELETE /api/email/drip-sequences/[id] — delete a drip sequence */
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
    await DripSequenceService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[email/drip-sequences/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_sequence' }, { status: 500 });
  }
}
