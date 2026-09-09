import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CsatService } from '@/lib/services/csat-service';

/** GET /api/feedback/csat/surveys/[id]/score — get CSAT score */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const opts: { dateRange?: [Date, Date] } = {};
  if (startDate && endDate) {
    opts.dateRange = [new Date(startDate), new Date(endDate)];
  }

  const score = await CsatService.getScore(id, opts);
  return NextResponse.json({ score });
}
