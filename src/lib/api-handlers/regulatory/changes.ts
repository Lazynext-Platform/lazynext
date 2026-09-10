import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/changes — list changes */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ changes: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string; jurisdiction?: string; impactLevel?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const jurisdiction = url.searchParams.get('jurisdiction');
  const impactLevel = url.searchParams.get('impactLevel');
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (jurisdiction) opts.jurisdiction = jurisdiction;
  if (impactLevel) opts.impactLevel = impactLevel;

  const changes = await RegulatoryService.listChanges(organizationId, opts as never);
  return NextResponse.json({ changes });
}

/** POST /api/regulatory/changes — create a change */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const jurisdiction = String(body.jurisdiction || '').trim();
  const agency = String(body.agency || '').trim();
  const impactLevel = String(body.impactLevel || '').trim();
  if (!title || !type || !jurisdiction || !agency || !impactLevel) {
    return NextResponse.json({ error: 'title_type_jurisdiction_agency_and_impactLevel_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const change = await RegulatoryService.createChange(
      ws.organizationId, ws.id,
      {
        title, type: type as never, jurisdiction, agency,
        description: body.description, effectiveDate: body.effectiveDate,
        impactLevel: impactLevel as never, impactAreas: body.impactAreas,
        status: body.status, source: body.source, reference: body.reference,
      },
      session.user.id,
    );
    return NextResponse.json({ change }, { status: 201 });
  } catch (e) {
    console.error('[regulatory/changes] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_change' }, { status: 500 });
  }
}
