import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ scores: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['journeyId', 'touchpointId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const scores = await CustomerJourneyService.listScores(organizationId, opts as never);
  return NextResponse.json({ scores });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  const value = Number(body.value);
  if (!type || value === undefined || isNaN(value)) return NextResponse.json({ error: 'type_value_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const score = await CustomerJourneyService.createScore(ws.organizationId, ws.id, {
      type: type as never, value,
      journeyId: body.journeyId, touchpointId: body.touchpointId, stageId: body.stageId,
      maxValue: body.maxValue, respondentId: body.respondentId, respondentName: body.respondentName,
      comment: body.comment, collectedDate: body.collectedDate, status: body.status, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ score }, { status: 201 });
  } catch (e) {
    console.error('[customer-journey/scores] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_score' }, { status: 500 });
  }
}
