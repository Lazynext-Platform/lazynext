import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RiskService } from '@/lib/services/risk-service';

/** GET /api/risks/[id] — get a risk by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const risk = await RiskService.get(id);
  if (!risk) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ risk });
}

/** PATCH /api/risks/[id] — update a risk */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const risk = await RiskService.update(id, {
      title: body.title,
      description: body.description,
      category: body.category,
      likelihood: body.likelihood,
      impact: body.impact,
      owner: body.owner,
      status: body.status,
      mitigationPlan: body.mitigationPlan,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    if (!risk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ risk });
  } catch (e) {
    console.error('[risks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_risk' }, { status: 500 });
  }
}

/** DELETE /api/risks/[id] — delete a risk */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const deleted = await RiskService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
