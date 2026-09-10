import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CollabEditorService } from '@/lib/services/collab-editor-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/collab/sessions — list active edit sessions for a workspace.
 * Query: workspaceId
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    const sessions = await CollabEditorService.getActiveSessions(workspaceId);
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error('[collab] list sessions error:', e);
    return NextResponse.json({ error: 'failed_to_list_sessions' }, { status: 500 });
  }
}

/**
 * POST /api/collab/sessions — start a collaborative editing session.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    resourceType?: string;
    resourceId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const resourceType = body.resourceType?.trim();
  const resourceId = body.resourceId?.trim();

  if (!resourceType || !resourceId) {
    return NextResponse.json({ error: 'resourceType_and_resourceId_required' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  let organizationId = body.organizationId?.trim();

  if (!organizationId && workspaceId) {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    organizationId = ws.organizationId;
  }

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  try {
    const editSession = await CollabEditorService.startSession(organizationId, {
      resourceType,
      resourceId,
      workspaceId,
      userId: session.user.id,
    });
    return NextResponse.json({ session: editSession }, { status: 201 });
  } catch (e) {
    console.error('[collab] start session error:', e);
    return NextResponse.json({ error: 'failed_to_start_session' }, { status: 500 });
  }
}
