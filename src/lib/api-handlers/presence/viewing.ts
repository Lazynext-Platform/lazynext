import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PresenceService } from '@/lib/services/presence-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/presence/viewing — get users viewing a resource.
 * Query: resourceType, resourceId, workspaceId
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const resourceType = sp.get('resourceType') || undefined;
  const resourceId = sp.get('resourceId') || undefined;
  const workspaceId = sp.get('workspaceId') || undefined;

  if (!resourceType || !resourceId || !workspaceId) {
    return NextResponse.json(
      { error: 'resourceType_resourceId_and_workspaceId_required' },
      { status: 400 },
    );
  }

  try {
    const viewing = await PresenceService.getViewing(resourceType, resourceId, workspaceId);
    return NextResponse.json({ viewing });
  } catch (e) {
    console.error('[presence] viewing list error:', e);
    return NextResponse.json({ error: 'failed_to_get_viewing' }, { status: 500 });
  }
}

/**
 * POST /api/presence/viewing — start viewing a resource.
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

  const workspaceId = body.workspaceId?.trim();
  const organizationId = body.organizationId?.trim();
  const resourceType = body.resourceType?.trim();
  const resourceId = body.resourceId?.trim();

  if (!resourceType || !resourceId) {
    return NextResponse.json({ error: 'resourceType_and_resourceId_required' }, { status: 400 });
  }

  let orgId = organizationId;
  if (!orgId && workspaceId) {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    orgId = ws.organizationId;
  }

  if (!orgId || !workspaceId) {
    return NextResponse.json(
      { error: 'organizationId_and_workspaceId_required' },
      { status: 400 },
    );
  }

  try {
    const ok = await PresenceService.startViewing(
      orgId,
      workspaceId,
      session.user.id,
      resourceType,
      resourceId,
    );
    return NextResponse.json({ ok }, { status: 201 });
  } catch (e) {
    console.error('[presence] start viewing error:', e);
    return NextResponse.json({ error: 'failed_to_start_viewing' }, { status: 500 });
  }
}

/**
 * DELETE /api/presence/viewing — stop viewing a resource.
 * Query: resourceType, resourceId
 */
export async function DELETE(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const resourceType = sp.get('resourceType') || undefined;
  const resourceId = sp.get('resourceId') || undefined;

  if (!resourceType || !resourceId) {
    return NextResponse.json({ error: 'resourceType_and_resourceId_required' }, { status: 400 });
  }

  try {
    const ok = await PresenceService.stopViewing(session.user.id, resourceType, resourceId);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error('[presence] stop viewing error:', e);
    return NextResponse.json({ error: 'failed_to_stop_viewing' }, { status: 500 });
  }
}
