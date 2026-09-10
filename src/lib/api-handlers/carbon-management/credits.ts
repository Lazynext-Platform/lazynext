import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CarbonManagementService } from '@/lib/services/carbon-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ credits: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const credits = await CarbonManagementService.listCarbonCredits(organizationId, opts as never);
  return NextResponse.json({ credits });
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
    const credit = await CarbonManagementService.createCarbonCredit(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status,
      serialNumber: body.serialNumber, amount: body.amount, unit: body.unit,
      price: body.price, vintage: body.vintage, project: body.project, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ credit }, { status: 201 });
  } catch (e) {
    console.error('[carbon-management/credits] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_credit' }, { status: 500 });
  }
}
