import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnvironmentalComplianceService } from '@/lib/services/environmental-compliance-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ wastes: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'facility']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const wastes = await EnvironmentalComplianceService.listWastes(organizationId, opts as never);
  return NextResponse.json({ wastes });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  if (!type) return NextResponse.json({ error: 'type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const waste = await EnvironmentalComplianceService.createWaste(ws.organizationId, ws.id, {
      type: type as never,
      description: body.description, status: body.status, facility: body.facility,
      source: body.source, amount: body.amount, unit: body.unit,
      disposalMethod: body.disposalMethod, contractor: body.contractor,
      generatedDate: body.generatedDate, disposedDate: body.disposedDate,
      manifestNumber: body.manifestNumber, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ waste }, { status: 201 });
  } catch (e) {
    console.error('[environmental-compliance/wastes] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_waste' }, { status: 500 });
  }
}
