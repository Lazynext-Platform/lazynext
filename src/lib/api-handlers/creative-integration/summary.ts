import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CreativeIntegrationService } from '@/lib/services/creative-integration';

/**
 * GET /api/creative-integration/summary — creative summary stats for the user.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const summary = await CreativeIntegrationService.getCreativeSummary(session.user.id);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[creative-integration/summary] error:', e);
    return NextResponse.json({ error: 'failed_to_get_summary' }, { status: 500 });
  }
}
