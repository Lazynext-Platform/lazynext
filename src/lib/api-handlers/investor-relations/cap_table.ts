import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/cap-table — list cap table entries */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ capTable: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { stakeholderType?: string; shareClass?: string } = {};
  const stakeholderType = url.searchParams.get('stakeholderType');
  const shareClass = url.searchParams.get('shareClass');
  if (stakeholderType) opts.stakeholderType = stakeholderType;
  if (shareClass) opts.shareClass = shareClass;

  const capTable = await InvestorRelationsService.listCapTable(organizationId, opts as never);
  return NextResponse.json({ capTable });
}

/** POST /api/investor-relations/cap-table — create a cap table entry */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const stakeholderName = String(body.stakeholderName || '').trim();
  const stakeholderType = String(body.stakeholderType || '').trim();
  const shareClass = String(body.shareClass || '').trim();
  const shares = Number(body.shares);
  if (!stakeholderName || !stakeholderType || !shareClass || !shares) {
    return NextResponse.json({ error: 'stakeholder_name_type_class_and_shares_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const entry = await InvestorRelationsService.createCapTableEntry(
      ws.organizationId, ws.id,
      {
        stakeholderName, stakeholderType: stakeholderType as never, shares,
        shareClass: shareClass as never,
        pricePerShare: body.pricePerShare, ownershipPercent: body.ownershipPercent,
        vestingSchedule: body.vestingSchedule, grantDate: body.grantDate, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ capTableEntry: entry }, { status: 201 });
  } catch (e) {
    console.error('[investor-relations/cap-table] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_cap_table_entry' }, { status: 500 });
  }
}
