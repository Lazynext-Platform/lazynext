import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/compliance/[id] — get a single compliance record */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const compliance = await GovRelationsService.getCompliance(id);
  if (!compliance) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ compliance });
}

/** PATCH /api/gov-relations/compliance/[id] — update a compliance record */
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
    const compliance = await GovRelationsService.updateCompliance(id, {
      title: body.title, complianceType: body.complianceType, status: body.status,
      dueDate: body.dueDate, period: body.period, amount: body.amount, notes: body.notes,
    });
    if (!compliance) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ compliance });
  } catch (e) {
    console.error('[gov-relations/compliance] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_compliance' }, { status: 500 });
  }
}
