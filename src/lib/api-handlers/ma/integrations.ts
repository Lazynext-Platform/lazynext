import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/integrations — list integration records */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ integrations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { dealId?: string; status?: string } = {};
  const dealId = url.searchParams.get('dealId');
  const status = url.searchParams.get('status');
  if (dealId) opts.dealId = dealId;
  if (status) opts.status = status;

  const integrations = await MAService.listIntegrations(organizationId, opts as never);
  return NextResponse.json({ integrations });
}

/** POST /api/ma/integrations — create an integration record */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dealId = String(body.dealId || '').trim();
  const name = String(body.name || '').trim();
  const workstreams = body.workstreams;
  if (!dealId || !name || !Array.isArray(workstreams)) {
    return NextResponse.json({ error: 'dealId_name_and_workstreams_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const integration = await MAService.createIntegration(
      ws.organizationId, ws.id,
      {
        dealId, name, workstreams,
        timeline: body.timeline, budget: body.budget, status: body.status,
        synergies: body.synergies, risks: body.risks,
      },
      session.user.id,
    );
    return NextResponse.json({ integration }, { status: 201 });
  } catch (e) {
    console.error('[ma/integrations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_integration' }, { status: 500 });
  }
}
