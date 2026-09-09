import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ImportExportService } from '@/lib/services/import-export-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ declarations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const declarations = await ImportExportService.listDeclarations(organizationId, opts as never);
  return NextResponse.json({ declarations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const reference = String(body.reference || '').trim();
  const type = String(body.type || '').trim();
  if (!reference || !type) return NextResponse.json({ error: 'reference_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const declaration = await ImportExportService.createDeclaration(ws.organizationId, ws.id, {
      reference, type: type as never,
      shipmentId: body.shipmentId, description: body.description, status: body.status,
      country: body.country, port: body.port, declaredValue: body.declaredValue,
      currency: body.currency, hsCode: body.hsCode, goodsDescription: body.goodsDescription,
      quantity: body.quantity, origin: body.origin, destination: body.destination,
      importer: body.importer, exporter: body.exporter, broker: body.broker,
      filingDate: body.filingDate, approvalDate: body.approvalDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ declaration }, { status: 201 });
  } catch (e) {
    console.error('[import-export/declarations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_declaration' }, { status: 500 });
  }
}
