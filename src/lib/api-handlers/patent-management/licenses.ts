import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PatentManagementService } from '@/lib/services/patent-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ licenses: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['applicationId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const licenses = await PatentManagementService.listLicenses(organizationId, opts as never);
  return NextResponse.json({ licenses });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.applicationId || '').trim();
  const licensee = String(body.licensee || '').trim();
  const type = String(body.type || '').trim();
  if (!applicationId || !licensee || !type) return NextResponse.json({ error: 'applicationId_licensee_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const license = await PatentManagementService.createLicense(ws.organizationId, ws.id, {
      applicationId, licensee, type: type as never,
      description: body.description, status: body.status,
      startDate: body.startDate, endDate: body.endDate,
      royaltyRate: body.royaltyRate, upfrontFee: body.upfrontFee,
      territory: body.territory, fieldOfUse: body.fieldOfUse,
      terms: body.terms, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ license }, { status: 201 });
  } catch (e) {
    console.error('[patent-management/licenses] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_license' }, { status: 500 });
  }
}
