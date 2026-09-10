import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/policies/[id] — get a single monitored policy */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const policy = await GovRelationsService.getPolicy(id);
  if (!policy) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ policy });
}

/** PATCH /api/gov-relations/policies/[id] — update a monitored policy */
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
    const policy = await GovRelationsService.updatePolicy(id, {
      title: body.title, policyType: body.policyType, status: body.status,
      jurisdiction: body.jurisdiction, billNumber: body.billNumber,
      sponsor: body.sponsor, summary: body.summary,
      impactAssessment: body.impactAssessment, position: body.position,
      introducedDate: body.introducedDate, lastActionDate: body.lastActionDate,
      nextActionDate: body.nextActionDate, notes: body.notes,
    });
    if (!policy) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[gov-relations/policies] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_policy' }, { status: 500 });
  }
}

/** DELETE /api/gov-relations/policies/[id] — delete a monitored policy */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await GovRelationsService.deletePolicy(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
