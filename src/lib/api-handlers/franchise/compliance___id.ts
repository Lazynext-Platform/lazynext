import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/compliance/[id] — get a single compliance record */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const compliance = await FranchiseService.getCompliance(id);
  if (!compliance) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ compliance });
}

/** PATCH /api/franchise/compliance/[id] — update a compliance record */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const compliance = await FranchiseService.updateCompliance(id, {
      type: body.type, checkDate: body.checkDate, checker: body.checker,
      result: body.result, findings: body.findings, correctiveActions: body.correctiveActions,
      followUpDate: body.followUpDate, status: body.status,
    });
    if (!compliance) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ compliance });
  } catch (e) {
    console.error('[franchise/compliance] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_compliance' }, { status: 500 });
  }
}
