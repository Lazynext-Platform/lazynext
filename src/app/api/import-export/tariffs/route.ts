import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ImportExportService } from '@/lib/services/import-export-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ tariffs: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'country']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const tariffs = await ImportExportService.listTariffs(organizationId, opts as never);
  return NextResponse.json({ tariffs });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const hsCode = String(body.hsCode || '').trim();
  const description = String(body.description || '').trim();
  const type = String(body.type || '').trim();
  const rate = Number(body.rate);
  if (!hsCode || !description || !type || !Number.isFinite(rate)) return NextResponse.json({ error: 'hsCode_description_type_rate_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const tariff = await ImportExportService.createTariff(ws.organizationId, ws.id, {
      hsCode, description, type: type as never, rate,
      unit: body.unit, country: body.country, status: body.status,
      effectiveDate: body.effectiveDate, expiryDate: body.expiryDate,
      preferentialRate: body.preferentialRate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ tariff }, { status: 201 });
  } catch (e) {
    console.error('[import-export/tariffs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_tariff' }, { status: 500 });
  }
}
