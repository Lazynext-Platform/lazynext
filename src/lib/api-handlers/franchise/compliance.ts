import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/compliance — list compliance records */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ compliance: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { franchiseeId?: string; status?: string; type?: string } = {};
  const franchiseeId = url.searchParams.get('franchiseeId');
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  if (franchiseeId) opts.franchiseeId = franchiseeId;
  if (status) opts.status = status;
  if (type) opts.type = type;

  const compliance = await FranchiseService.listCompliance(organizationId, opts as never);
  return NextResponse.json({ compliance });
}

/** POST /api/franchise/compliance — create a compliance record */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const franchiseeId = String(body.franchiseeId || '').trim();
  const type = String(body.type || '').trim();
  const checkDate = String(body.checkDate || '').trim();
  const checker = String(body.checker || '').trim();
  const result = String(body.result || '').trim();
  if (!franchiseeId || !type || !checkDate || !checker || !result) {
    return NextResponse.json({ error: 'franchiseeId_type_checkDate_checker_result_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const compliance = await FranchiseService.createCompliance(
      ws.organizationId, ws.id,
      {
        franchiseeId, type: type as never, checkDate, checker, result: result as never,
        findings: body.findings, correctiveActions: body.correctiveActions,
        followUpDate: body.followUpDate, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ compliance }, { status: 201 });
  } catch (e) {
    console.error('[franchise/compliance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_compliance' }, { status: 500 });
  }
}
