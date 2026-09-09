import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/health-scores/[id] — get a single health score */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const healthScore = await CustomerSuccessService.getHealthScore(id);
  if (!healthScore) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ healthScore });
}

/** PATCH /api/customer-success/health-scores/[id] — update a health score */
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
    const healthScore = await CustomerSuccessService.updateHealthScore(id, {
      score: body.score, category: body.category, components: body.components,
      trend: body.trend, calculatedAt: body.calculatedAt, notes: body.notes,
    });
    if (!healthScore) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ healthScore });
  } catch (e) {
    console.error('[customer-success/health-scores] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_health_score' }, { status: 500 });
  }
}

/** DELETE /api/customer-success/health-scores/[id] — delete a health score */
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
    const ok = await CustomerSuccessService.deleteHealthScore(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[customer-success/health-scores] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_health_score' }, { status: 500 });
  }
}
