import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BrandManagementService } from '@/lib/services/brand-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ consistencies: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['auditId', 'status', 'severity']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const consistencies = await BrandManagementService.listConsistencies(organizationId, opts as never);
  return NextResponse.json({ consistencies });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const status = String(body.status || '').trim();
  const severity = String(body.severity || '').trim();
  if (!title || !status || !severity) return NextResponse.json({ error: 'title_status_severity_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const consistency = await BrandManagementService.createConsistency(ws.organizationId, ws.id, {
      title, status: status as never, severity: severity as never,
      auditId: body.auditId, assetId: body.assetId, guidelineId: body.guidelineId,
      description: body.description, recommendation: body.recommendation,
      detectedDate: body.detectedDate, detectedBy: body.detectedBy,
      resolvedDate: body.resolvedDate, resolvedBy: body.resolvedBy, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ consistency }, { status: 201 });
  } catch (e) {
    console.error('[brand-management/consistencies] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_consistency' }, { status: 500 });
  }
}
