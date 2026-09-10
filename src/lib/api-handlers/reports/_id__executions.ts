import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ReportBuilderService } from '@/lib/services/report-builder-service';

/** GET /api/reports/[id]/executions — get execution history for a report */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const executions = await ReportBuilderService.getExecutions(id);
  return NextResponse.json({ executions });
}
