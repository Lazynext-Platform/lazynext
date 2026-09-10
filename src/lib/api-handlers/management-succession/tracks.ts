import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ManagementSuccessionService } from '@/lib/services/management-succession-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ tracks: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['candidateId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const tracks = await ManagementSuccessionService.listTracks(organizationId, opts as never);
  return NextResponse.json({ tracks });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const candidateId = String(body.candidateId || '').trim();
  const type = String(body.type || '').trim();
  if (!candidateId || !type) return NextResponse.json({ error: 'candidateId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const track = await ManagementSuccessionService.createTrack(ws.organizationId, ws.id, {
      candidateId, type: type as never,
      description: body.description, status: body.status,
      startDate: body.startDate, endDate: body.endDate,
      milestones: body.milestones, certifications: body.certifications,
      rotations: body.rotations, mentor: body.mentor, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ track }, { status: 201 });
  } catch (e) {
    console.error('[management-succession/tracks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_track' }, { status: 500 });
  }
}
