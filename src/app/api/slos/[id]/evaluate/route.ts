import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SLOService } from '@/lib/services/slo-service';

/**
 * POST /api/slos/[id]/evaluate — evaluate an SLO against telemetry.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const slo = await SLOService.evaluateSLO(id);
    if (!slo) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ slo });
  } catch (e) {
    console.error('[slos] evaluate error:', e);
    return NextResponse.json({ error: 'failed_to_evaluate_slo' }, { status: 500 });
  }
}
