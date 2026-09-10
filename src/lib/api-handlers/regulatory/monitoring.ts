import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/monitoring — list monitoring */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ monitoring: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { jurisdiction?: string; status?: string; frequency?: string } = {};
  const jurisdiction = url.searchParams.get('jurisdiction');
  const status = url.searchParams.get('status');
  const frequency = url.searchParams.get('frequency');
  if (jurisdiction) opts.jurisdiction = jurisdiction;
  if (status) opts.status = status;
  if (frequency) opts.frequency = frequency;

  const monitoring = await RegulatoryService.listMonitoring(organizationId, opts as never);
  return NextResponse.json({ monitoring });
}

/** POST /api/regulatory/monitoring — create monitoring */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const topic = String(body.topic || '').trim();
  const jurisdiction = String(body.jurisdiction || '').trim();
  const frequency = String(body.frequency || '').trim();
  if (!topic || !jurisdiction || !frequency) {
    return NextResponse.json({ error: 'topic_jurisdiction_and_frequency_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const monitoring = await RegulatoryService.createMonitoring(
      ws.organizationId, ws.id,
      {
        topic, jurisdiction, frequency: frequency as never,
        agency: body.agency, sources: body.sources, status: body.status,
        lastChecked: body.lastChecked, findings: body.findings,
        assignedTo: body.assignedTo, alerts: body.alerts,
      },
      session.user.id,
    );
    return NextResponse.json({ monitoring }, { status: 201 });
  } catch (e) {
    console.error('[regulatory/monitoring] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_monitoring' }, { status: 500 });
  }
}
