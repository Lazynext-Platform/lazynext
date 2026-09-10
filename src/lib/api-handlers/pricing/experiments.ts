import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/experiments — list price experiments */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ experiments: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; modelId?: string } = {};
  const status = url.searchParams.get('status');
  const modelId = url.searchParams.get('modelId');
  if (status) opts.status = status;
  if (modelId) opts.modelId = modelId;

  const experiments = await PricingService.listExperiments(organizationId, opts as never);
  return NextResponse.json({ experiments });
}

/** POST /api/pricing/experiments — create a price experiment */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const startDate = String(body.startDate || '').trim();
  if (!name || !startDate || !Array.isArray(body.variants)) {
    return NextResponse.json({ error: 'name_startDate_variants_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const experiment = await PricingService.createExperiment(
      ws.organizationId, ws.id,
      {
        name, startDate,
        description: body.description, modelId: body.modelId,
        variants: body.variants, endDate: body.endDate,
        status: body.status, targetSegment: body.targetSegment,
        successMetric: body.successMetric, results: body.results,
      },
      session.user.id,
    );
    return NextResponse.json({ experiment }, { status: 201 });
  } catch (e) {
    console.error('[pricing/experiments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_experiment' }, { status: 500 });
  }
}
