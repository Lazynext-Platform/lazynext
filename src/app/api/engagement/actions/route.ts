import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngagementService } from '@/lib/services/engagement-service';

/** GET /api/engagement/actions — list actions */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ actions: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { surveyId?: string; status?: string; priority?: string; owner?: string } = {};
  const surveyId = url.searchParams.get('surveyId');
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const owner = url.searchParams.get('owner');
  if (surveyId) opts.surveyId = surveyId;
  if (status) opts.status = status;
  if (priority) opts.priority = priority;
  if (owner) opts.owner = owner;

  const actions = await EngagementService.listActions(organizationId, opts as never);
  return NextResponse.json({ actions });
}

/** POST /api/engagement/actions — create an action */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const action = await EngagementService.createAction(
      ws.organizationId, ws.id,
      {
        title,
        surveyId: body.surveyId,
        description: body.description,
        owner: body.owner,
        priority: body.priority,
        status: body.status,
        progress: body.progress,
        dueDate: body.dueDate,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ action }, { status: 201 });
  } catch (e) {
    console.error('[engagement/actions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_action' }, { status: 500 });
  }
}
