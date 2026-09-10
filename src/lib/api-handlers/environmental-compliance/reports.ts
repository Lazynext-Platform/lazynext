import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnvironmentalComplianceService } from '@/lib/services/environmental-compliance-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ reports: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const reports = await EnvironmentalComplianceService.listReports(organizationId, opts as never);
  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !type) return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const report = await EnvironmentalComplianceService.createReport(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status, period: body.period,
      author: body.author, submittedDate: body.submittedDate, approvedDate: body.approvedDate,
      findings: body.findings, recommendations: body.recommendations,
      attachments: body.attachments, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    console.error('[environmental-compliance/reports] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_report' }, { status: 500 });
  }
}
