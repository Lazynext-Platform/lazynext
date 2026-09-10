import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/policies — list monitored policies */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ policies: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { policyType?: string; status?: string; jurisdiction?: string } = {};
  const policyType = url.searchParams.get('policyType');
  const status = url.searchParams.get('status');
  const jurisdiction = url.searchParams.get('jurisdiction');
  if (policyType) opts.policyType = policyType;
  if (status) opts.status = status;
  if (jurisdiction) opts.jurisdiction = jurisdiction;

  const policies = await GovRelationsService.listPolicies(organizationId, opts as never);
  return NextResponse.json({ policies });
}

/** POST /api/gov-relations/policies — create a monitored policy */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const policyType = String(body.policyType || '').trim();
  const level = String(body.level || '').trim();
  const jurisdiction = String(body.jurisdiction || '').trim();
  if (!title || !policyType || !level || !jurisdiction) {
    return NextResponse.json({ error: 'title_type_level_jurisdiction_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const policy = await GovRelationsService.createPolicy(
      ws.organizationId, ws.id,
      {
        title, policyType: policyType as never,
        status: body.status, jurisdiction,
        billNumber: body.billNumber, sponsor: body.sponsor,
        summary: body.summary, impactAssessment: body.impactAssessment,
        position: body.position, introducedDate: body.introducedDate,
        lastActionDate: body.lastActionDate, nextActionDate: body.nextActionDate,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ policy }, { status: 201 });
  } catch (e) {
    console.error('[gov-relations/policies] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_policy' }, { status: 500 });
  }
}
