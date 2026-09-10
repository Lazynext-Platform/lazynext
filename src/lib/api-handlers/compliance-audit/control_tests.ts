import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/control-tests — list control tests */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ tests: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { controlId?: string; result?: string } = {};
  const controlId = url.searchParams.get('controlId');
  const result = url.searchParams.get('result');
  if (controlId) opts.controlId = controlId;
  if (result) opts.result = result;

  const tests = await ComplianceAuditService.listControlTests(organizationId, opts as never);
  return NextResponse.json({ tests });
}

/** POST /api/compliance-audit/control-tests — create a control test */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const controlId = String(body.controlId || '').trim();
  const testDate = String(body.testDate || '').trim();
  const tester = String(body.tester || '').trim();
  const result = String(body.result || '').trim();
  if (!controlId || !testDate || !tester || !result) {
    return NextResponse.json({ error: 'controlId_testDate_tester_result_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const test = await ComplianceAuditService.createControlTest(
      ws.organizationId, ws.id,
      { controlId, testDate, tester, method: body.method, result: result as never, notes: body.notes, evidenceIds: body.evidenceIds },
      session.user.id,
    );
    return NextResponse.json({ test }, { status: 201 });
  } catch (e) {
    console.error('[compliance-audit/control-tests] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_control_test' }, { status: 500 });
  }
}
