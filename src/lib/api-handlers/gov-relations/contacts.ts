import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/contacts — list government contacts */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ contacts: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { contactType?: string; level?: string; jurisdiction?: string } = {};
  const contactType = url.searchParams.get('contactType');
  const level = url.searchParams.get('level');
  const jurisdiction = url.searchParams.get('jurisdiction');
  if (contactType) opts.contactType = contactType;
  if (level) opts.level = level;
  if (jurisdiction) opts.jurisdiction = jurisdiction;

  const contacts = await GovRelationsService.listContacts(organizationId, opts as never);
  return NextResponse.json({ contacts });
}

/** POST /api/gov-relations/contacts — create a government contact */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const contactType = String(body.contactType || '').trim();
  const level = String(body.level || '').trim();
  if (!name || !contactType || !level) {
    return NextResponse.json({ error: 'name_type_level_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const contact = await GovRelationsService.createContact(
      ws.organizationId, ws.id,
      {
        name, contactType: contactType as never, level: level as never,
        title: body.title, organization: body.organization,
        email: body.email, phone: body.phone,
        jurisdiction: body.jurisdiction, relationshipStatus: body.relationshipStatus,
        lastContactDate: body.lastContactDate, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    console.error('[gov-relations/contacts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_contact' }, { status: 500 });
  }
}
