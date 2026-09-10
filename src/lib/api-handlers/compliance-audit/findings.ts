import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/findings — list findings */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ findings: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; severity?: string; controlId?: string } = {};
  const status = url.searchParams.get('status');
  const severity = url.searchParams.get('severity');
  const controlId = url.searchParams.get('controlId');
  if (status) opts.status = status;
  if (severity) opts.severity = severity;
  if (controlId) opts.controlId = controlId;

  const findings = await ComplianceAuditService.listFindings(organizationId, opts as never);
  return NextResponse.json({ findings });
}

/** POST /api/compliance-audit/findings — create a finding */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const finding = await ComplianceAuditService.createFinding(
      ws.organizationId, ws.id,
      { title, controlId: body.controlId, testId: body.testId, description: body.description, severity: body.severity, recommendation: body.recommendation, status: body.status, dueDate: body.dueDate },
      session.user.id,
    );
    return NextResponse.json({ finding }, { status: 201 });
  } catch (e) {
    console.error('[compliance-audit/findings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_finding' }, { status: 500 });
  }
}
