import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmergencyResponseService } from '@/lib/services/emergency-response-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ contacts: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const contacts = await EmergencyResponseService.listEmergencyContacts(organizationId, opts as never);
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const contact = await EmergencyResponseService.createEmergencyContact(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, contactName: body.contactName,
      role: body.role, phone: body.phone, email: body.email, address: body.address,
      availability: body.availability, priority: body.priority, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    console.error('[emergency-response/contacts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_contact' }, { status: 500 });
  }
}
