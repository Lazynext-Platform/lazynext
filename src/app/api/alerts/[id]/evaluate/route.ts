import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AlertService } from '@/lib/services/alert-service';

/**
 * POST /api/alerts/[id]/evaluate — evaluate an alert against current telemetry.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const alert = await AlertService.evaluateAlert(id);
    if (!alert) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ alert });
  } catch (e) {
    console.error('[alerts] evaluate error:', e);
    return NextResponse.json({ error: 'failed_to_evaluate_alert' }, { status: 500 });
  }
}
