import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/frameworks — list frameworks */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ frameworks: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { standard?: string; status?: string } = {};
  const standard = url.searchParams.get('standard');
  const status = url.searchParams.get('status');
  if (standard) opts.standard = standard;
  if (status) opts.status = status;

  const frameworks = await ComplianceAuditService.listFrameworks(organizationId, opts as never);
  return NextResponse.json({ frameworks });
}

/** POST /api/compliance-audit/frameworks — create a framework */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const standard = String(body.standard || '').trim();
  if (!name || !standard) {
    return NextResponse.json({ error: 'name_and_standard_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const framework = await ComplianceAuditService.createFramework(
      ws.organizationId, ws.id,
      { name, standard: standard as never, description: body.description, version: body.version, status: body.status, requirements: body.requirements },
      session.user.id,
    );
    return NextResponse.json({ framework }, { status: 201 });
  } catch (e) {
    console.error('[compliance-audit/frameworks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_framework' }, { status: 500 });
  }
}
