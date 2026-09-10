import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/patents — list patents */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ patents: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; patentType?: string; jurisdiction?: string } = {};
  const status = url.searchParams.get('status');
  const patentType = url.searchParams.get('patentType');
  const jurisdiction = url.searchParams.get('jurisdiction');
  if (status) opts.status = status;
  if (patentType) opts.patentType = patentType;
  if (jurisdiction) opts.jurisdiction = jurisdiction;

  const patents = await InnovationService.listPatents(organizationId, opts as never);
  return NextResponse.json({ patents });
}

/** POST /api/innovation/patents — create a patent */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const status = String(body.status || '').trim();
  if (!title || !status) {
    return NextResponse.json({ error: 'title_status_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const patent = await InnovationService.createPatent(
      ws.organizationId, ws.id,
      {
        title, status: status as never, applicationNumber: body.applicationNumber,
        filingDate: body.filingDate, inventor: body.inventor, assignee: body.assignee,
        abstract: body.abstract, claims: body.claims, patentType: body.patentType,
        jurisdiction: body.jurisdiction, grantedDate: body.grantedDate, expiryDate: body.expiryDate,
      },
      session.user.id,
    );
    return NextResponse.json({ patent }, { status: 201 });
  } catch (e) {
    console.error('[innovation/patents] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_patent' }, { status: 500 });
  }
}
