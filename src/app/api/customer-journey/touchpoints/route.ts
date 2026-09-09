import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ touchpoints: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['journeyId', 'stageId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const touchpoints = await CustomerJourneyService.listTouchpoints(organizationId, opts as never);
  return NextResponse.json({ touchpoints });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const journeyId = String(body.journeyId || '').trim();
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!journeyId || !name || !type) return NextResponse.json({ error: 'journeyId_name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const touchpoint = await CustomerJourneyService.createTouchpoint(ws.organizationId, ws.id, {
      journeyId, name, type: type as never,
      stageId: body.stageId, description: body.description, channel: body.channel,
      status: body.status, owner: body.owner, frequency: body.frequency, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ touchpoint }, { status: 201 });
  } catch (e) {
    console.error('[customer-journey/touchpoints] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_touchpoint' }, { status: 500 });
  }
}
