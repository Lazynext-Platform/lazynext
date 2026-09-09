import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** POST /api/sustainability/reports/[id]/publish — publish a report */
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
    const report = await SustainabilityService.publishReport(id, session.user.id);
    if (!report) {
      return NextResponse.json({ error: 'report_not_found' }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[sustainability/reports/publish] error:', e);
    return NextResponse.json({ error: 'failed_to_publish_report' }, { status: 500 });
  }
}
