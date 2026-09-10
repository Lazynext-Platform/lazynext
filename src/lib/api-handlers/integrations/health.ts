import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IntegrationHealthService } from '@/lib/services/integration-health';

/**
 * GET /api/integrations/health — integration health summary for the current user.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const summary = await IntegrationHealthService.getHealthSummary(session.user.id);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[integrations] health error:', e);
    return NextResponse.json({ error: 'failed_to_get_health' }, { status: 500 });
  }
}
