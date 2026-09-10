import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ReportTemplateService } from '@/lib/services/report-template-service';

/** GET /api/report-templates — list report templates for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ templates: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const templates = await ReportTemplateService.list(organizationId, {
    workspaceId: sp.get('workspaceId') || undefined,
    category: sp.get('category') || undefined,
    dataSource: (sp.get('dataSource') as 'tasks' | 'projects' | 'invoices' | 'expenses') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ templates });
}

/** POST /api/report-templates — create a new report template */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  if (!body.dataSource) {
    return NextResponse.json({ error: 'data_source_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const template = await ReportTemplateService.create(organizationId, {
      name,
      description: body.description,
      category: body.category,
      dataSource: body.dataSource,
      columns: body.columns,
      filters: body.filters,
      groupBy: body.groupBy,
      orderBy: body.orderBy,
      schedule: body.schedule,
      format: body.format,
      isBuiltIn: body.isBuiltIn,
      icon: body.icon,
      tags: body.tags,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (e) {
    console.error('[report-templates] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_template' }, { status: 500 });
  }
}
