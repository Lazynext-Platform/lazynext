import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ResearchService } from '@/lib/services/research';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/research/sessions — list research sessions (query: workspaceId).
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
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const sessions = await ResearchService.listSessions(workspaceId);
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error('[research/sessions] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_sessions' }, { status: 500 });
  }
}

/**
 * POST /api/research/sessions — create a research session.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    organizationId?: string;
    query?: string;
    agentRunId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: 'query_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const organizationId = body.organizationId?.trim() || workspace.organizationId;

    const researchSession = await ResearchService.createSession(workspaceId, {
      organizationId,
      query,
      ownerId: session.user.id,
      agentRunId: body.agentRunId?.trim() || undefined,
    });
    return NextResponse.json({ session: researchSession }, { status: 201 });
  } catch (e) {
    console.error('[research/sessions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_session' }, { status: 500 });
  }
}
