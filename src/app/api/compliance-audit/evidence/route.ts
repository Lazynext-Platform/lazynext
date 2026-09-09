import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/evidence — list evidence */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ evidence: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { controlId?: string; testId?: string; type?: string } = {};
  const controlId = url.searchParams.get('controlId');
  const testId = url.searchParams.get('testId');
  const type = url.searchParams.get('type');
  if (controlId) opts.controlId = controlId;
  if (testId) opts.testId = testId;
  if (type) opts.type = type;

  const evidence = await ComplianceAuditService.listEvidence(organizationId, opts as never);
  return NextResponse.json({ evidence });
}

/** POST /api/compliance-audit/evidence — create evidence */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const collectedBy = String(body.collectedBy || '').trim();
  if (!name || !type || !collectedBy) {
    return NextResponse.json({ error: 'name_type_collectedBy_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const evidence = await ComplianceAuditService.createEvidence(
      ws.organizationId, ws.id,
      { name, type: type as never, collectedBy, controlId: body.controlId, testId: body.testId, description: body.description, fileRef: body.fileRef, collectedDate: body.collectedDate },
      session.user.id,
    );
    return NextResponse.json({ evidence }, { status: 201 });
  } catch (e) {
    console.error('[compliance-audit/evidence] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_evidence' }, { status: 500 });
  }
}
