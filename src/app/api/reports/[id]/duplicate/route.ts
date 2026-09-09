import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ReportBuilderService } from '@/lib/services/report-builder-service';

/** POST /api/reports/[id]/duplicate — duplicate a custom report */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const report = await ReportBuilderService.duplicate(id, session.user.id);
    if (!report) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    console.error('[reports/duplicate] error:', e);
    return NextResponse.json({ error: 'failed_to_duplicate_report' }, { status: 500 });
  }
}
