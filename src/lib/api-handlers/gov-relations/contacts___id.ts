import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/contacts/[id] — get a single government contact */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const contact = await GovRelationsService.getContact(id);
  if (!contact) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ contact });
}

/** PATCH /api/gov-relations/contacts/[id] — update a government contact */
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
    const contact = await GovRelationsService.updateContact(id, {
      name: body.name, contactType: body.contactType, level: body.level,
      title: body.title, organization: body.organization,
      email: body.email, phone: body.phone,
      jurisdiction: body.jurisdiction, relationshipStatus: body.relationshipStatus,
      lastContactDate: body.lastContactDate, notes: body.notes,
    });
    if (!contact) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ contact });
  } catch (e) {
    console.error('[gov-relations/contacts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_contact' }, { status: 500 });
  }
}

/** DELETE /api/gov-relations/contacts/[id] — delete a government contact */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await GovRelationsService.deleteContact(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
