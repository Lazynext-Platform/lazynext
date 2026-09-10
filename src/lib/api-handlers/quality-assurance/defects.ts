import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { QualityAssuranceService } from '@/lib/services/quality-assurance-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ defects: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'severity', 'status', 'productId']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const defects = await QualityAssuranceService.listDefects(organizationId, opts as never);
  return NextResponse.json({ defects });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const severity = String(body.severity || '').trim();
  if (!title || !type || !severity) return NextResponse.json({ error: 'title_type_severity_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const defect = await QualityAssuranceService.createDefect(ws.organizationId, ws.id, {
      title, type: type as never, severity: severity as never,
      productId: body.productId, productName: body.productName, batchId: body.batchId,
      inspectionId: body.inspectionId, description: body.description, status: body.status,
      identifiedBy: body.identifiedBy, identifiedDate: body.identifiedDate,
      resolvedBy: body.resolvedBy, resolvedDate: body.resolvedDate,
      rootCause: body.rootCause, resolution: body.resolution, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ defect }, { status: 201 });
  } catch (e) {
    console.error('[quality-assurance/defects] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_defect' }, { status: 500 });
  }
}
