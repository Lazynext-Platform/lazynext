import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EventService } from '@/lib/services/event';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/events — list events (query: workspaceId, type, take).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const type = sp.get('type') || undefined;
  const takeParam = sp.get('take');
  const take = takeParam ? Math.min(parseInt(takeParam, 10) || 100, 500) : 100;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const events = await EventService.list(workspaceId, { type }, take);
    return NextResponse.json({ events });
  } catch (e) {
    console.error('[events] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_events' }, { status: 500 });
  }
}

/**
 * POST /api/events — emit an event.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    organizationId?: string;
    type?: string;
    actor?: string;
    actorType?: 'user' | 'agent' | 'system';
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const type = body.type?.trim();
  if (!type) {
    return NextResponse.json({ error: 'type_required' }, { status: 400 });
  }

  try {
    // If workspaceId is provided, verify the user is a member
    let organizationId = body.organizationId?.trim();
    if (body.workspaceId) {
      const workspaces = await WorkspaceService.listForUser(session.user.id);
      const workspace = workspaces.find((w) => w.id === body.workspaceId);
      if (!workspace) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      if (!organizationId) organizationId = workspace.organizationId;
    }

    const event = await EventService.emit({
      workspaceId: body.workspaceId?.trim() || undefined,
      organizationId,
      type,
      actor: body.actor?.trim() || session.user.id,
      actorType: body.actorType || 'user',
      resourceType: body.resourceType?.trim() || undefined,
      resourceId: body.resourceId?.trim() || undefined,
      metadata: body.metadata,
      correlationId: body.correlationId?.trim() || undefined,
      source: body.source?.trim() || undefined,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    console.error('[events] emit error:', e);
    return NextResponse.json({ error: 'failed_to_emit_event' }, { status: 500 });
  }
}
