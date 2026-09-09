import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EstatePlanningService } from '@/lib/services/estate-planning-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ trusts: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const trusts = await EstatePlanningService.listTrusts(organizationId, opts as never);
  return NextResponse.json({ trusts });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const trust = await EstatePlanningService.createTrust(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, settlor: body.settlor,
      trustee: body.trustee, beneficiaryIds: body.beneficiaryIds, assets: body.assets,
      value: body.value, createdDate: body.createdDate, terminatedDate: body.terminatedDate,
      notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ trust }, { status: 201 });
  } catch (e) {
    console.error('[estate-planning/trusts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_trust' }, { status: 500 });
  }
}
