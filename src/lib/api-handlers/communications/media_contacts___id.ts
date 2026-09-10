import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/media-contacts/[id] — get a single media contact */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const mediaContact = await CommunicationsService.getMediaContact(id);
  if (!mediaContact) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ mediaContact });
}

/** PATCH /api/communications/media-contacts/[id] — update a media contact */
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
    const mediaContact = await CommunicationsService.updateMediaContact(id, {
      name: body.name, outlet: body.outlet, role: body.role, email: body.email,
      phone: body.phone, beat: body.beat, relationship: body.relationship,
      notes: body.notes, status: body.status,
    });
    if (!mediaContact) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ mediaContact });
  } catch (e) {
    console.error('[communications/media-contacts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_media_contact' }, { status: 500 });
  }
}

/** DELETE /api/communications/media-contacts/[id] — delete a media contact */
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
    const ok = await CommunicationsService.deleteMediaContact(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[communications/media-contacts] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_media_contact' }, { status: 500 });
  }
}
