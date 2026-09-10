import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ technicians: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['status', 'zone']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const technicians = await FieldServiceService.listTechnicians(organizationId, opts as never);
  return NextResponse.json({ technicians });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const technician = await FieldServiceService.createTechnician(ws.organizationId, ws.id, {
      name,
      email: body.email, phone: body.phone, skills: body.skills, certifications: body.certifications,
      status: body.status, zone: body.zone, availability: body.availability,
      rating: body.rating, completedJobs: body.completedJobs, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ technician }, { status: 201 });
  } catch (e) {
    console.error('[field-service/technicians] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_technician' }, { status: 500 });
  }
}
