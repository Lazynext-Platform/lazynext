import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { NpsService } from '@/lib/services/nps-service';

/** GET /api/feedback/nps/surveys/[id]/trend — get NPS trend */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const opts: { dateRange?: [Date, Date] } = {};
  if (startDate && endDate) {
    opts.dateRange = [new Date(startDate), new Date(endDate)];
  }

  const trend = await NpsService.getTrend(id, opts);
  return NextResponse.json({ trend });
}
