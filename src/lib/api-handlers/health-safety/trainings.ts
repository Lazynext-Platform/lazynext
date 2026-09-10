import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/trainings — list trainings */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ trainings: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; status?: string } = {};
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  if (category) opts.category = category;
  if (status) opts.status = status;

  const trainings = await HealthSafetyService.listTrainings(organizationId, opts as never);
  return NextResponse.json({ trainings });
}

/** POST /api/health-safety/trainings — create a training */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const training = await HealthSafetyService.createTraining(
      ws.organizationId, ws.id,
      {
        name, description: body.description, category: body.category,
        requiredFor: body.requiredFor, durationHours: body.durationHours,
        frequencyMonths: body.frequencyMonths, provider: body.provider,
        certification: body.certification, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ training }, { status: 201 });
  } catch (e) {
    console.error('[health-safety/trainings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_training' }, { status: 500 });
  }
}
