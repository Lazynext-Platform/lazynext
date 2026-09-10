import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CrisisService } from '@/lib/services/crisis-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ drills: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string; planId?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const planId = url.searchParams.get('planId');
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (planId) opts.planId = planId;
  const drills = await CrisisService.listDrills(organizationId, opts as never);
  return NextResponse.json({ drills });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const scheduledDate = String(body.scheduledDate || '').trim();
  if (!name || !type || !scheduledDate) {
    return NextResponse.json({ error: 'name_type_date_required' }, { status: 400 });
  }
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const drill = await CrisisService.createDrill(
      ws.organizationId, ws.id,
      {
        name, type: type as never, scheduledDate, planId: body.planId,
        duration: body.duration, participants: body.participants,
        objectives: body.objectives, status: body.status, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ drill }, { status: 201 });
  } catch (e) {
    console.error('[crisis/drills] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_drill' }, { status: 500 });
  }
}
