import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DeiService } from '@/lib/services/dei-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ initiatives: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string; owner?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const owner = url.searchParams.get('owner');
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (owner) opts.owner = owner;
  const initiatives = await DeiService.listInitiatives(organizationId, opts as never);
  return NextResponse.json({ initiatives });
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
    const initiative = await DeiService.createInitiative(
      ws.organizationId, ws.id,
      {
        name, type: type as never, description: body.description, owner: body.owner,
        startDate: body.startDate, endDate: body.endDate, budget: body.budget,
        status: body.status, objectives: body.objectives, targetGroups: body.targetGroups, metrics: body.metrics,
      },
      session.user.id,
    );
    return NextResponse.json({ initiative }, { status: 201 });
  } catch (e) {
    console.error('[dei/initiatives] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_initiative' }, { status: 500 });
  }
}
