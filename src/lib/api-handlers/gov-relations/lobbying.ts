import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/lobbying — list lobbying activities */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ lobbying: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; policyId?: string } = {};
  const status = url.searchParams.get('status');
  const policyId = url.searchParams.get('policyId');
  if (status) opts.status = status;
  if (policyId) opts.policyId = policyId;

  const lobbying = await GovRelationsService.listLobbying(organizationId, opts as never);
  return NextResponse.json({ lobbying });
}

/** POST /api/gov-relations/lobbying — create a lobbying activity */
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
    const lobbying = await GovRelationsService.createLobbying(
      ws.organizationId, ws.id,
      {
        title, description: body.description, status: body.status,
        contactIds: body.contactIds, policyId: body.policyId,
        startDate: body.startDate, endDate: body.endDate,
        budget: body.budget, spent: body.spent, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ lobbying }, { status: 201 });
  } catch (e) {
    console.error('[gov-relations/lobbying] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_lobbying' }, { status: 500 });
  }
}
