import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DeiService } from '@/lib/services/dei-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ goals: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string; owner?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const owner = url.searchParams.get('owner');
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (owner) opts.owner = owner;
  const goals = await DeiService.listGoals(organizationId, opts as never);
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  const title = String(body.title || '').trim();
  const targetValue = Number(body.targetValue);
  if (!type || !title || isNaN(targetValue)) {
    return NextResponse.json({ error: 'type_title_target_required' }, { status: 400 });
  }
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const goal = await DeiService.createGoal(
      ws.organizationId, ws.id,
      {
        type: type as never, title, targetValue, description: body.description,
        currentValue: body.currentValue, unit: body.unit, deadline: body.deadline,
        status: body.status, initiativeId: body.initiativeId, owner: body.owner,
      },
      session.user.id,
    );
    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) {
    console.error('[dei/goals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_goal' }, { status: 500 });
  }
}
