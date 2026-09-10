import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ReportTemplateService } from '@/lib/services/report-template-service';

/** GET /api/report-templates/[id] — get a report template by ID */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const template = await ReportTemplateService.get(id);
  if (!template) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ template });
}

/** PATCH /api/report-templates/[id] — update a report template */
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
    const template = await ReportTemplateService.update(id, {
      name: body.name,
      description: body.description,
      category: body.category,
      dataSource: body.dataSource,
      columns: body.columns,
      filters: body.filters,
      groupBy: body.groupBy,
      orderBy: body.orderBy,
      schedule: body.schedule,
      format: body.format,
      icon: body.icon,
      tags: body.tags,
    });
    if (!template) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (e) {
    console.error('[report-templates] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_template' }, { status: 500 });
  }
}

/** DELETE /api/report-templates/[id] — delete a report template */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const deleted = await ReportTemplateService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
