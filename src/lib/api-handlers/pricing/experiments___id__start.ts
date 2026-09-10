import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PricingService } from '@/lib/services/pricing-service';

/** POST /api/pricing/experiments/[id]/start — start a price experiment */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const experiment = await PricingService.startExperiment(id, session.user.id);
    if (!experiment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ experiment });
  } catch (e) {
    console.error('[pricing/experiments/start] error:', e);
    return NextResponse.json({ error: 'failed_to_start_experiment' }, { status: 500 });
  }
}
