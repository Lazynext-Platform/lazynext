import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ journeys: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const journeys = await CustomerJourneyService.listJourneys(organizationId, opts as never);
  return NextResponse.json({ journeys });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const journey = await CustomerJourneyService.createJourney(ws.organizationId, ws.id, {
      title,
      description: body.description, persona: body.persona,
      status: body.status, startDate: body.startDate, endDate: body.endDate,
      owner: body.owner, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ journey }, { status: 201 });
  } catch (e) {
    console.error('[customer-journey/journeys] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_journey' }, { status: 500 });
  }
}
