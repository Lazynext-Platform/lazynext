import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TraceService } from '@/lib/services/trace-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/traces/[id]/spans — start a span within a trace.
 * The [id] param is the traceId.
 * Body: { organizationId?, parentSpanId?, name, service, operation, attributes? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: traceId } = await params;

  let body: {
    organizationId?: string;
    parentSpanId?: string;
    name?: string;
    service?: string;
    operation?: string;
    attributes?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  if (!body.service?.trim()) {
    return NextResponse.json({ error: 'service_required' }, { status: 400 });
  }
  if (!body.operation?.trim()) {
    return NextResponse.json({ error: 'operation_required' }, { status: 400 });
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

    const spanId = await TraceService.startSpan(organizationId, {
      traceId,
      parentSpanId: body.parentSpanId,
      name: body.name.trim(),
      service: body.service.trim(),
      operation: body.operation.trim(),
      attributes: body.attributes,
    });
    return NextResponse.json({ spanId }, { status: 201 });
  } catch (e) {
    console.error('[traces] start span error:', e);
    return NextResponse.json({ error: 'failed_to_start_span' }, { status: 500 });
  }
}
