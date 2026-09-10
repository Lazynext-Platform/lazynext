import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/monitoring/[id] — get a single monitoring */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const monitoring = await RegulatoryService.getMonitoring(id);
  if (!monitoring) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ monitoring });
}

/** PATCH /api/regulatory/monitoring/[id] — update monitoring */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const monitoring = await RegulatoryService.updateMonitoring(id, {
      topic: body.topic, jurisdiction: body.jurisdiction, agency: body.agency,
      sources: body.sources, frequency: body.frequency, status: body.status,
      lastChecked: body.lastChecked, findings: body.findings,
      assignedTo: body.assignedTo, alerts: body.alerts,
    });
    if (!monitoring) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ monitoring });
  } catch (e) {
    console.error('[regulatory/monitoring] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_monitoring' }, { status: 500 });
  }
}

/** DELETE /api/regulatory/monitoring/[id] — delete monitoring */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await RegulatoryService.deleteMonitoring(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[regulatory/monitoring] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_monitoring' }, { status: 500 });
  }
}
