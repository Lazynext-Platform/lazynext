import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/franchisees — list franchisees */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ franchisees: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; territory?: string; franchiseType?: string } = {};
  const status = url.searchParams.get('status');
  const territory = url.searchParams.get('territory');
  const franchiseType = url.searchParams.get('franchiseType');
  if (status) opts.status = status;
  if (territory) opts.territory = territory;
  if (franchiseType) opts.franchiseType = franchiseType;

  const franchisees = await FranchiseService.listFranchisees(organizationId, opts as never);
  return NextResponse.json({ franchisees });
}

/** POST /api/franchise/franchisees — create a franchisee */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const franchiseType = String(body.franchiseType || '').trim();
  if (!name || !franchiseType) {
    return NextResponse.json({ error: 'name_franchiseType_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const franchisee = await FranchiseService.createFranchisee(
      ws.organizationId, ws.id,
      {
        name, franchiseType: franchiseType as never,
        contactName: body.contactName, contactEmail: body.contactEmail,
        contactPhone: body.contactPhone, territory: body.territory,
        franchiseFee: body.franchiseFee, royaltyRate: body.royaltyRate,
        status: body.status, location: body.location,
        joinedDate: body.joinedDate, experience: body.experience,
        financialStatus: body.financialStatus, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ franchisee }, { status: 201 });
  } catch (e) {
    console.error('[franchise/franchisees] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_franchisee' }, { status: 500 });
  }
}
