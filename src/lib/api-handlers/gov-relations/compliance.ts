import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/compliance — list compliance records */
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
  const opts: { complianceType?: string; status?: string } = {};
  const complianceType = url.searchParams.get('complianceType');
  const status = url.searchParams.get('status');
  if (complianceType) opts.complianceType = complianceType;
  if (status) opts.status = status;

  const compliance = await GovRelationsService.listCompliance(organizationId, opts as never);
  return NextResponse.json({ compliance });
}

/** POST /api/gov-relations/compliance — create a compliance record */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const complianceType = String(body.complianceType || '').trim();
  const title = String(body.title || '').trim();
  if (!complianceType || !title) {
    return NextResponse.json({ error: 'type_title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const compliance = await GovRelationsService.createCompliance(
      ws.organizationId, ws.id,
      {
        title, complianceType: complianceType as never,
        status: body.status, dueDate: body.dueDate,
        period: body.period, amount: body.amount, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ compliance }, { status: 201 });
  } catch (e) {
    console.error('[gov-relations/compliance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_compliance' }, { status: 500 });
  }
}
