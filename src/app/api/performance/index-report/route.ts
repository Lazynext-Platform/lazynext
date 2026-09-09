import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PerformanceService } from '@/lib/services/performance';

/**
 * GET /api/performance/index-report — database index report.
 *
 * Returns a report of all indexes across all Prisma models, grouped by
 * models with indexes, models without indexes, and models that likely
 * need indexes (foreign keys without a corresponding @@index).
 *
 * Requires an authenticated session.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const report = await PerformanceService.getIndexReport();
    return NextResponse.json(report);
  } catch (e) {
    console.error('[performance/index-report] error:', e);
    return NextResponse.json({ error: 'failed_to_get_index_report' }, { status: 500 });
  }
}
