import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/experiments/[id] — get a single price experiment */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const experiment = await PricingService.getExperiment(id);
  if (!experiment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ experiment });
}

/** PATCH /api/pricing/experiments/[id] — update a price experiment */
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
    const experiment = await PricingService.updateExperiment(id, {
      name: body.name, description: body.description, modelId: body.modelId,
      variants: body.variants, startDate: body.startDate, endDate: body.endDate,
      status: body.status, targetSegment: body.targetSegment,
      successMetric: body.successMetric, results: body.results,
    });
    if (!experiment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ experiment });
  } catch (e) {
    console.error('[pricing/experiments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_experiment' }, { status: 500 });
  }
}
