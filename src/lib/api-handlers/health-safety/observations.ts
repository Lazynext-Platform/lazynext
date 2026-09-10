import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/observations — list observations */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ observations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { behavior?: string; location?: string } = {};
  const behavior = url.searchParams.get('behavior');
  const location = url.searchParams.get('location');
  if (behavior) opts.behavior = behavior;
  if (location) opts.location = location;

  const observations = await HealthSafetyService.listObservations(organizationId, opts as never);
  return NextResponse.json({ observations });
}

/** POST /api/health-safety/observations — create an observation */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const observer = String(body.observer || '').trim();
  const date = String(body.date || '').trim();
  const location = String(body.location || '').trim();
  const behavior = String(body.behavior || '').trim();
  if (!observer || !date || !location || !behavior) {
    return NextResponse.json({ error: 'observer_date_location_behavior_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const observation = await HealthSafetyService.createObservation(
      ws.organizationId, ws.id,
      {
        observer, date, location, behavior: behavior as never,
        description: body.description, category: body.category,
        feedback: body.feedback, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ observation }, { status: 201 });
  } catch (e) {
    console.error('[health-safety/observations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_observation' }, { status: 500 });
  }
}
