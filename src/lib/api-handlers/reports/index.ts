import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ReportBuilderService } from '@/lib/services/report-builder-service';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/** GET /api/reports — list custom reports for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ reports: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const reports = await ReportBuilderService.list(organizationId, {
    workspaceId: sp.get('workspaceId') || undefined,
    dataSource: (sp.get('dataSource') as 'tasks' | 'projects' | 'invoices' | 'expenses') || undefined,
    schedule: (sp.get('schedule') as 'none' | 'daily' | 'weekly' | 'monthly') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ reports });
}

/** POST /api/reports — create a new custom report */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

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
    const report = await ReportBuilderService.create(organizationId, {
      name,
      description: body.description,
      dataSource: body.dataSource,
      columns: body.columns,
      filters: body.filters,
      groupBy: body.groupBy,
      orderBy: body.orderBy,
      schedule: body.schedule,
      format: body.format,
      isPublic: body.isPublic,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    console.error('[reports] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_report' }, { status: 500 });
  }
}
