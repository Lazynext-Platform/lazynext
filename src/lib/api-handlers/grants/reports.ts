import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/reports — list reports */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ reports: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { awardId?: string; status?: string; type?: string } = {};
  const awardId = url.searchParams.get('awardId');
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  if (awardId) opts.awardId = awardId;
  if (status) opts.status = status;
  if (type) opts.type = type;

  const reports = await GrantService.listReports(organizationId, opts as never);
  return NextResponse.json({ reports });
}

/** POST /api/grants/reports — create a report */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const awardId = String(body.awardId || '').trim();
  const type = String(body.type || '').trim();
  const dueDate = String(body.dueDate || '').trim();
  if (!awardId || !type || !dueDate) {
    return NextResponse.json({ error: 'awardId_type_dueDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const report = await GrantService.createReport(
      ws.organizationId, ws.id,
      {
        awardId, type: type as never, dueDate, submittedDate: body.submittedDate,
        status: body.status, content: body.content, attachments: body.attachments,
        findings: body.findings, budgetUtilized: body.budgetUtilized,
      },
      session.user.id,
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    console.error('[grants/reports] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_report' }, { status: 500 });
  }
}
