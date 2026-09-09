import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InternalAuditService } from '@/lib/services/internal-audit-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ findings: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['planId', 'severity', 'status', 'auditType']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const findings = await InternalAuditService.listFindings(organizationId, opts as never);
  return NextResponse.json({ findings });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const auditType = String(body.auditType || '').trim();
  const severity = String(body.severity || '').trim();
  if (!title || !auditType || !severity) return NextResponse.json({ error: 'title_auditType_severity_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const finding = await InternalAuditService.createFinding(ws.organizationId, ws.id, {
      title, auditType: auditType as never, severity: severity as never,
      planId: body.planId, description: body.description, criteria: body.criteria,
      condition: body.condition, cause: body.cause, effect: body.effect,
      recommendation: body.recommendation, status: body.status,
      identifiedDate: body.identifiedDate, identifiedBy: body.identifiedBy,
    }, session.user.id);
    return NextResponse.json({ finding }, { status: 201 });
  } catch (e) {
    console.error('[internal-audit/findings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_finding' }, { status: 500 });
  }
}
