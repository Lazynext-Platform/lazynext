import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/requirements — list requirements */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ requirements: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { jurisdiction?: string; category?: string; status?: string; owner?: string } = {};
  const jurisdiction = url.searchParams.get('jurisdiction');
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const owner = url.searchParams.get('owner');
  if (jurisdiction) opts.jurisdiction = jurisdiction;
  if (category) opts.category = category;
  if (status) opts.status = status;
  if (owner) opts.owner = owner;

  const requirements = await RegulatoryService.listRequirements(organizationId, opts as never);
  return NextResponse.json({ requirements });
}

/** POST /api/regulatory/requirements — create a requirement */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const jurisdiction = String(body.jurisdiction || '').trim();
  const agency = String(body.agency || '').trim();
  if (!title || !jurisdiction || !agency) {
    return NextResponse.json({ error: 'title_jurisdiction_and_agency_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const requirement = await RegulatoryService.createRequirement(
      ws.organizationId, ws.id,
      {
        title, jurisdiction, agency,
        description: body.description, category: body.category, frequency: body.frequency,
        owner: body.owner, status: body.status, lastAssessed: body.lastAssessed,
        nextAssessment: body.nextAssessment, evidence: body.evidence, references: body.references,
      },
      session.user.id,
    );
    return NextResponse.json({ requirement }, { status: 201 });
  } catch (e) {
    console.error('[regulatory/requirements] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_requirement' }, { status: 500 });
  }
}
