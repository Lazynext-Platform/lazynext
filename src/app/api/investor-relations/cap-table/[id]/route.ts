import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/cap-table/[id] — get a single cap table entry */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const capTableEntry = await InvestorRelationsService.getCapTableEntry(id);
  if (!capTableEntry) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ capTableEntry });
}

/** PATCH /api/investor-relations/cap-table/[id] — update a cap table entry */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const capTableEntry = await InvestorRelationsService.updateCapTableEntry(id, {
      stakeholderName: body.stakeholderName, stakeholderType: body.stakeholderType,
      shares: body.shares, shareClass: body.shareClass, pricePerShare: body.pricePerShare,
      ownershipPercent: body.ownershipPercent, vestingSchedule: body.vestingSchedule,
      grantDate: body.grantDate, notes: body.notes,
    });
    if (!capTableEntry) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ capTableEntry });
  } catch (e) {
    console.error('[investor-relations/cap-table] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_cap_table_entry' }, { status: 500 });
  }
}

/** DELETE /api/investor-relations/cap-table/[id] — delete a cap table entry */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await InvestorRelationsService.deleteCapTableEntry(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[investor-relations/cap-table] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_cap_table_entry' }, { status: 500 });
  }
}
