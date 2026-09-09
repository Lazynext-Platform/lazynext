import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WorkflowService } from '@/lib/services/workflow-service';

/** GET /api/workflows — list workflows for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ workflows: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const take = url.searchParams.get('take') ? Number(url.searchParams.get('take')) : undefined;

  const workflows = await WorkflowService.list(organizationId, { status: status as never, search, take });
  return NextResponse.json({ workflows });
}

/** POST /api/workflows — create a new workflow */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const workflow = await WorkflowService.create(organizationId, {
      name,
      description: body.description,
      workspaceId: body.workspaceId || undefined,
      nodes: body.nodes || [],
      edges: body.edges || [],
      variables: body.variables || [],
      config: body.config || {},
      createdBy: session.user.id,
    });
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (e) {
    console.error('[workflows] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_workflow' }, { status: 500 });
  }
}
