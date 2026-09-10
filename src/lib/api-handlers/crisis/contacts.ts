import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CrisisService } from '@/lib/services/crisis-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ contacts: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { role?: string; status?: string } = {};
  const role = url.searchParams.get('role');
  const status = url.searchParams.get('status');
  if (role) opts.role = role;
  if (status) opts.status = status;
  const contacts = await CrisisService.listContacts(organizationId, opts as never);
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const role = String(body.role || '').trim();
  if (!name || !role) return NextResponse.json({ error: 'name_role_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const contact = await CrisisService.createContact(
      ws.organizationId, ws.id,
      {
        name, role: role as never, department: body.department, phone: body.phone,
        email: body.email, alternatePhone: body.alternatePhone, status: body.status, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    console.error('[crisis/contacts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_contact' }, { status: 500 });
  }
}
