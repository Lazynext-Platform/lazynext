import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { QualityAssuranceService } from '@/lib/services/quality-assurance-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ inspections: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'result']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const inspections = await QualityAssuranceService.listInspections(organizationId, opts as never);
  return NextResponse.json({ inspections });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || body.productName || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const inspection = await QualityAssuranceService.createInspection(ws.organizationId, ws.id, {
      type: type as never,
      productId: body.productId, productName: body.productName ?? name,
      batchId: body.batchId, inspector: body.inspector, inspectionDate: body.inspectionDate,
      location: body.location, sampleSize: body.sampleSize, defectsFound: body.defectsFound,
      status: body.status, result: body.result, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ inspection }, { status: 201 });
  } catch (e) {
    console.error('[quality-assurance/inspections] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_inspection' }, { status: 500 });
  }
}
