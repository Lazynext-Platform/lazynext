import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/reports — list reports (query: organizationId, type, status) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ reports: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { type?: 'annual'|'quarterly'|'monthly'|'custom'; status?: 'draft'|'in_review'|'published' } = {};
  const type = sp.get('type');
  const status = sp.get('status');
  if (type) opts.type = type as typeof opts.type;
  if (status) opts.status = status as typeof opts.status;

  const reports = await SustainabilityService.listReports(organizationId, opts);
  return NextResponse.json({ reports });
}

/** POST /api/sustainability/reports — create a report */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.title || !body.type || !body.period) {
    return NextResponse.json({ error: 'title_type_period_required' }, { status: 400 });
  }

  try {
    const report = await SustainabilityService.createReport(
      organizationId,
      workspaceId,
      {
        title: body.title,
        type: body.type,
        period: body.period,
        summary: body.summary,
        frameworks: body.frameworks,
        status: body.status,
        publishedDate: body.publishedDate,
      },
      session.user.id,
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    console.error('[sustainability/reports] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_report' }, { status: 500 });
  }
}
