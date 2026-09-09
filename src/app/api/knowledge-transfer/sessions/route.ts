import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ sessions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['mentorshipId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const sessions = await KnowledgeTransferService.listSessions(organizationId, opts as never);
  return NextResponse.json({ sessions });
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
    const sessionRecord = await KnowledgeTransferService.createSession(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, mentorshipId: body.mentorshipId, presenter: body.presenter,
      attendees: body.attendees, scheduledDate: body.scheduledDate, duration: body.duration,
      location: body.location, status: body.status, materials: body.materials,
      feedback: body.feedback, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ session: sessionRecord }, { status: 201 });
  } catch (e) {
    console.error('[knowledge-transfer/sessions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_session' }, { status: 500 });
  }
}
