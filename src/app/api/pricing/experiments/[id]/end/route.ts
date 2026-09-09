import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PricingService } from '@/lib/services/pricing-service';

/** POST /api/pricing/experiments/[id]/end — end a price experiment */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const results = String(body.results || '').trim();
  if (!results) {
    return NextResponse.json({ error: 'results_required' }, { status: 400 });
  }

  try {
    const experiment = await PricingService.endExperiment(id, results, session.user.id);
    if (!experiment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ experiment });
  } catch (e) {
    console.error('[pricing/experiments/end] error:', e);
    return NextResponse.json({ error: 'failed_to_end_experiment' }, { status: 500 });
  }
}
