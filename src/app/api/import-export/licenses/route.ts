import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ImportExportService } from '@/lib/services/import-export-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ licenses: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const licenses = await ImportExportService.listLicenses(organizationId, opts as never);
  return NextResponse.json({ licenses });
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
    const license = await ImportExportService.createLicense(ws.organizationId, ws.id, {
      reference, type: type as never,
      description: body.description, status: body.status,
      issuingAuthority: body.issuingAuthority, country: body.country, holder: body.holder,
      validFrom: body.validFrom, validTo: body.validTo,
      goods: body.goods, restrictions: body.restrictions, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ license }, { status: 201 });
  } catch (e) {
    console.error('[import-export/licenses] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_license' }, { status: 500 });
  }
}
