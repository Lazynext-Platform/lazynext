import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ training: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['unitId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const training = await FranchiseDevelopmentService.listTraining(organizationId, opts as never);
  return NextResponse.json({ training });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const unitId = String(body.unitId || '').trim();
  const franchiseeName = String(body.franchiseeName || '').trim();
  const type = String(body.type || '').trim();
  if (!unitId || !franchiseeName || !type) return NextResponse.json({ error: 'unitId_franchiseeName_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const training = await FranchiseDevelopmentService.createTraining(ws.organizationId, ws.id, {
      unitId, franchiseeName, type: type as never,
      description: body.description, status: body.status,
      scheduledDate: body.scheduledDate, completedDate: body.completedDate,
      trainer: body.trainer, location: body.location,
      attendees: body.attendees, certifications: body.certifications, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ training }, { status: 201 });
  } catch (e) {
    console.error('[franchise-development/training] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_training' }, { status: 500 });
  }
}
