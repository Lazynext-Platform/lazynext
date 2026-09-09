import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SLOService } from '@/lib/services/slo-service';

/**
 * GET /api/slos/[id] — get a single SLO.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const slo = await SLOService.getSLO(id);
    if (!slo) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ slo });
  } catch (e) {
    console.error('[slos] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_slo' }, { status: 500 });
  }
}

/**
 * PATCH /api/slos/[id] — update an SLO.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    name?: string;
    description?: string;
    metricName?: string;
    target?: number;
    targetPercentile?: number;
    windowDays?: number;
    errorBudget?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const existing = await SLOService.getSLO(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await SLOService.updateSLO(id, {
      name: body.name?.trim(),
      description: body.description,
      metricName: body.metricName,
      target: body.target,
      targetPercentile: body.targetPercentile,
      windowDays: body.windowDays,
      errorBudget: body.errorBudget,
    });
    return NextResponse.json({ slo: updated });
  } catch (e) {
    console.error('[slos] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_slo' }, { status: 500 });
  }
}

/**
 * DELETE /api/slos/[id] — delete an SLO.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await SLOService.getSLO(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    await SLOService.deleteSLO(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[slos] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_slo' }, { status: 500 });
  }
}
