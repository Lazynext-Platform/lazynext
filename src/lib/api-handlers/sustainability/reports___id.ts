import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/reports/[id] — get a report */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const report = await SustainabilityService.getReport(id);
  if (!report) {
    return NextResponse.json({ error: 'report_not_found' }, { status: 404 });
  }
  return NextResponse.json({ report });
}

/** PATCH /api/sustainability/reports/[id] — update a report */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const report = await SustainabilityService.updateReport(id, {
      title: body.title,
      type: body.type,
      period: body.period,
      summary: body.summary,
      frameworks: body.frameworks,
      status: body.status,
      publishedDate: body.publishedDate,
    });
    if (!report) {
      return NextResponse.json({ error: 'report_not_found' }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[sustainability/reports] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_report' }, { status: 500 });
  }
}
