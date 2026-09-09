import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TraceService } from '@/lib/services/trace-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/traces — list traces.
 * Query params: status, startTime, endTime, limit
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') || undefined;
  const startTime = sp.get('startTime') ? new Date(sp.get('startTime')!) : undefined;
  const endTime = sp.get('endTime') ? new Date(sp.get('endTime')!) : undefined;
  const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ traces: [] });
    }
    const organizationId = workspaces[0].organizationId;

    const traces = await TraceService.listTraces(organizationId, { status, startTime, endTime, limit });
    return NextResponse.json({ traces });
  } catch (e) {
    console.error('[traces] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_traces' }, { status: 500 });
  }
}

/**
 * POST /api/traces — start a new trace.
 * Body: { organizationId?, rootSpanName, labels? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    rootSpanName?: string;
    labels?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.rootSpanName?.trim()) {
    return NextResponse.json({ error: 'rootSpanName_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let organizationId = body.organizationId?.trim();
    if (organizationId) {
      const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      organizationId = workspaces[0].organizationId;
    }

    const traceId = await TraceService.startTrace(organizationId, {
      rootSpanName: body.rootSpanName.trim(),
      labels: body.labels,
    });
    return NextResponse.json({ traceId }, { status: 201 });
  } catch (e) {
    console.error('[traces] start error:', e);
    return NextResponse.json({ error: 'failed_to_start_trace' }, { status: 500 });
  }
}
