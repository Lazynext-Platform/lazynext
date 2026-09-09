import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SecurityService } from '@/lib/services/security';

/**
 * GET /api/security/events — list security events for a workspace.
 * Query params: workspaceId (required), severity, unresolved, limit
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id_required' }, { status: 400 });
  }

  const severity = url.searchParams.get('severity') || undefined;
  const unresolved = url.searchParams.get('unresolved') === 'true';
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;

  try {
    const events = await SecurityService.listSecurityEvents(workspaceId, {
      severity: severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
      unresolved,
      limit,
    });
    return NextResponse.json({ events });
  } catch (e) {
    console.error('[security/events] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_events' }, { status: 500 });
  }
}

/**
 * POST /api/security/events — create a security event.
 * Body: { organizationId, workspaceId?, type, severity?, description, actorId?, ... }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string | null;
    type?: string;
    severity?: string;
    description?: string;
    actorId?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.organizationId || !body.type || !body.description) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const validSeverities = ['low', 'medium', 'high', 'critical'];
  const severity = body.severity && validSeverities.includes(body.severity)
    ? (body.severity as 'low' | 'medium' | 'high' | 'critical')
    : undefined;

  try {
    const event = await SecurityService.createEvent({
      organizationId: body.organizationId,
      workspaceId: body.workspaceId || null,
      type: body.type,
      severity,
      description: body.description,
      actorId: body.actorId || null,
      resourceType: body.resourceType || null,
      resourceId: body.resourceId || null,
      ipAddress: body.ipAddress || null,
      metadata: body.metadata || null,
    });
    if (!event) {
      return NextResponse.json({ error: 'failed_to_create_event' }, { status: 500 });
    }
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    console.error('[security/events] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_event' }, { status: 500 });
  }
}
