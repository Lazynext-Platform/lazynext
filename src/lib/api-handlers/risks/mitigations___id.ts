import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RiskMitigationService } from '@/lib/services/risk-mitigation-service';

/** GET /api/risks/mitigations/[id] — get a mitigation by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const mitigation = await RiskMitigationService.get(id);
  if (!mitigation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ mitigation });
}

/** PATCH /api/risks/mitigations/[id] — update a mitigation */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const mitigation = await RiskMitigationService.update(id, {
      action: body.action,
      type: body.type,
      owner: body.owner,
      dueDate: body.dueDate,
      cost: body.cost,
      effectiveness: body.effectiveness,
    });
    if (!mitigation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ mitigation });
  } catch (e) {
    console.error('[risks/mitigations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_mitigation' }, { status: 500 });
  }
}

/** DELETE /api/risks/mitigations/[id] — delete a mitigation */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const deleted = await RiskMitigationService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
