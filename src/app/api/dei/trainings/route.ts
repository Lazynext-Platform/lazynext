import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DeiService } from '@/lib/services/dei-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ trainings: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; facilitator?: string } = {};
  const status = url.searchParams.get('status');
  const facilitator = url.searchParams.get('facilitator');
  if (status) opts.status = status;
  if (facilitator) opts.facilitator = facilitator;
  const trainings = await DeiService.listTrainings(organizationId, opts as never);
  return NextResponse.json({ trainings });
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
    const training = await DeiService.createTraining(
      ws.organizationId, ws.id,
      {
        title, description: body.description, facilitator: body.facilitator, audience: body.audience,
        format: body.format, duration: body.duration, scheduledDate: body.scheduledDate,
        status: body.status, materials: body.materials, completionRate: body.completionRate, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ training }, { status: 201 });
  } catch (e) {
    console.error('[dei/trainings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_training' }, { status: 500 });
  }
}
