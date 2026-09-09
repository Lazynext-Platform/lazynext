import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BrandManagementService } from '@/lib/services/brand-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ audits: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['status', 'frequency']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const audits = await BrandManagementService.listAudits(organizationId, opts as never);
  return NextResponse.json({ audits });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const frequency = String(body.frequency || '').trim();
  if (!title || !frequency) return NextResponse.json({ error: 'title_frequency_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const audit = await BrandManagementService.createAudit(ws.organizationId, ws.id, {
      title, frequency: frequency as never,
      description: body.description, scope: body.scope,
      startDate: body.startDate, endDate: body.endDate,
      status: body.status, leadAuditor: body.leadAuditor,
      findings: body.findings, score: body.score, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ audit }, { status: 201 });
  } catch (e) {
    console.error('[brand-management/audits] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_audit' }, { status: 500 });
  }
}
