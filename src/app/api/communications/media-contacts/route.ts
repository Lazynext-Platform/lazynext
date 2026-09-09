import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/media-contacts — list media contacts */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ mediaContacts: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { outlet?: string; beat?: string; status?: string } = {};
  const outlet = url.searchParams.get('outlet');
  const beat = url.searchParams.get('beat');
  const status = url.searchParams.get('status');
  if (outlet) opts.outlet = outlet;
  if (beat) opts.beat = beat;
  if (status) opts.status = status;

  const mediaContacts = await CommunicationsService.listMediaContacts(organizationId, opts as never);
  return NextResponse.json({ mediaContacts });
}

/** POST /api/communications/media-contacts — create a media contact */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const outlet = String(body.outlet || '').trim();
  if (!name || !outlet) {
    return NextResponse.json({ error: 'name_and_outlet_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const mediaContact = await CommunicationsService.createMediaContact(
      ws.organizationId, ws.id,
      {
        name, outlet, role: body.role, email: body.email, phone: body.phone,
        beat: body.beat, relationship: body.relationship, notes: body.notes, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ mediaContact }, { status: 201 });
  } catch (e) {
    console.error('[communications/media-contacts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_media_contact' }, { status: 500 });
  }
}
