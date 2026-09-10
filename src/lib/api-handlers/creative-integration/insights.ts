import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CreativeIntegrationService } from '@/lib/services/creative-integration';

/**
 * GET /api/creative-integration/insights — performance insights for the user.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const insights = await CreativeIntegrationService.getPerformanceInsights(session.user.id);
    return NextResponse.json({ insights });
  } catch (e) {
    console.error('[creative-integration/insights] error:', e);
    return NextResponse.json({ error: 'failed_to_get_insights' }, { status: 500 });
  }
}
