import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ReportBuilderService } from '@/lib/services/report-builder-service';

/** POST /api/reports/[id]/execute — execute a custom report */
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
    const result = await ReportBuilderService.execute(id, session.user.id);
    if (!result) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ result });
  } catch (e) {
    console.error('[reports/execute] error:', e);
    return NextResponse.json({ error: 'failed_to_execute_report' }, { status: 500 });
  }
}
