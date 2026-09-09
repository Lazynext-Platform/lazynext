import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ReportBuilderService } from '@/lib/services/report-builder-service';

/** GET /api/reports/[id] — get a custom report by ID */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const report = await ReportBuilderService.get(id);
  if (!report) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ report });
}

/** PATCH /api/reports/[id] — update a custom report */
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
    const report = await ReportBuilderService.update(id, {
      name: body.name,
      description: body.description,
      dataSource: body.dataSource,
      columns: body.columns,
      filters: body.filters,
      groupBy: body.groupBy,
      orderBy: body.orderBy,
      schedule: body.schedule,
      format: body.format,
      isPublic: body.isPublic,
    });
    if (!report) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[reports] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_report' }, { status: 500 });
  }
}

/** DELETE /api/reports/[id] — delete a custom report */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await ReportBuilderService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
