import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/audit-reports — list audit reports */
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
  const opts: { frameworkId?: string; status?: string } = {};
  const frameworkId = url.searchParams.get('frameworkId');
  const status = url.searchParams.get('status');
  if (frameworkId) opts.frameworkId = frameworkId;
  if (status) opts.status = status;

  const reports = await ComplianceAuditService.listAuditReports(organizationId, opts as never);
  return NextResponse.json({ reports });
}

/** POST /api/compliance-audit/audit-reports — create an audit report */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const frameworkId = String(body.frameworkId || '').trim();
  const title = String(body.title || '').trim();
  const auditor = String(body.auditor || '').trim();
  const startDate = String(body.startDate || '').trim();
  const scope = String(body.scope || '').trim();
  if (!frameworkId || !title || !auditor || !startDate || !scope) {
    return NextResponse.json({ error: 'frameworkId_title_auditor_startDate_scope_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const report = await ComplianceAuditService.createAuditReport(
      ws.organizationId, ws.id,
      { frameworkId, title, auditor, startDate, endDate: body.endDate, scope, summary: body.summary, status: body.status },
      session.user.id,
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    console.error('[compliance-audit/audit-reports] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_audit_report' }, { status: 500 });
  }
}
