import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AlertService } from '@/lib/services/alert-service';

/**
 * GET /api/alerts/[id] — get a single alert.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const alert = await AlertService.getAlert(id);
    if (!alert) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ alert });
  } catch (e) {
    console.error('[alerts] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_alert' }, { status: 500 });
  }
}

/**
 * PATCH /api/alerts/[id] — update an alert.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    name?: string;
    description?: string;
    severity?: string;
    source?: string;
    metricName?: string;
    condition?: Record<string, unknown>;
    threshold?: number;
    metadata?: Record<string, unknown>;
    workspaceId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const existing = await AlertService.getAlert(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await AlertService.updateAlert(id, {
      name: body.name?.trim(),
      description: body.description,
      severity: body.severity,
      source: body.source,
      metricName: body.metricName,
      condition: body.condition,
      threshold: body.threshold,
      metadata: body.metadata,
      workspaceId: body.workspaceId,
    });
    return NextResponse.json({ alert: updated });
  } catch (e) {
    console.error('[alerts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_alert' }, { status: 500 });
  }
}
