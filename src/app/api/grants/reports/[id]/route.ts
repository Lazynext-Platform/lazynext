import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/reports/[id] — get a single report */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const report = await GrantService.getReport(id);
  if (!report) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ report });
}

/** PATCH /api/grants/reports/[id] — update a report */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const report = await GrantService.updateReport(id, {
      type: body.type, dueDate: body.dueDate, submittedDate: body.submittedDate,
      status: body.status, content: body.content, attachments: body.attachments,
      findings: body.findings, budgetUtilized: body.budgetUtilized,
    });
    if (!report) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[grants/reports] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_report' }, { status: 500 });
  }
}
