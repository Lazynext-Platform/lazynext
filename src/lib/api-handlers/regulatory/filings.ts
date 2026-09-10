import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/filings — list filings */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ filings: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string; jurisdiction?: string; agency?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const jurisdiction = url.searchParams.get('jurisdiction');
  const agency = url.searchParams.get('agency');
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (jurisdiction) opts.jurisdiction = jurisdiction;
  if (agency) opts.agency = agency;

  const filings = await RegulatoryService.listFilings(organizationId, opts as never);
  return NextResponse.json({ filings });
}

/** POST /api/regulatory/filings — create a filing */
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
  if (!title || !type || !jurisdiction || !agency) {
    return NextResponse.json({ error: 'title_type_jurisdiction_and_agency_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const filing = await RegulatoryService.createFiling(
      ws.organizationId, ws.id,
      {
        title, type: type as never, jurisdiction, agency,
        status: body.status, dueDate: body.dueDate, submittedDate: body.submittedDate,
        acceptedDate: body.acceptedDate, description: body.description,
        attachments: body.attachments, requirements: body.requirements,
        fees: body.fees, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ filing }, { status: 201 });
  } catch (e) {
    console.error('[regulatory/filings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_filing' }, { status: 500 });
  }
}
