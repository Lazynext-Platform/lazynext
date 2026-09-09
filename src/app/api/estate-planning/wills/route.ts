import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EstatePlanningService } from '@/lib/services/estate-planning-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ wills: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const wills = await EstatePlanningService.listWills(organizationId, opts as never);
  return NextResponse.json({ wills });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !type) return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const will = await EstatePlanningService.createWill(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status, testator: body.testator,
      executorIds: body.executorIds, beneficiaryIds: body.beneficiaryIds,
      witnesses: body.witnesses, notarized: body.notarized,
      executedDate: body.executedDate, probateDate: body.probateDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ will }, { status: 201 });
  } catch (e) {
    console.error('[estate-planning/wills] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_will' }, { status: 500 });
  }
}
