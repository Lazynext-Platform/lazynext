import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PerformanceService } from '@/lib/services/performance';

/**
 * GET /api/performance/api-health — API health check.
 *
 * Pings key internal endpoints and returns response times and status codes.
 * Optional query param: ?baseUrl=http://localhost:3100
 *
 * Requires an authenticated session.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const baseUrl = sp.get('baseUrl') || undefined;
    const health = await PerformanceService.getApiHealth(baseUrl);
    return NextResponse.json(health);
  } catch (e) {
    console.error('[performance/api-health] error:', e);
    return NextResponse.json({ error: 'failed_to_check_api_health' }, { status: 500 });
  }
}
