import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ mentorships: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['status', 'department']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const mentorships = await KnowledgeTransferService.listMentorships(organizationId, opts as never);
  return NextResponse.json({ mentorships });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const mentorId = String(body.mentorId || '').trim();
  const mentorName = String(body.mentorName || '').trim();
  const menteeId = String(body.menteeId || '').trim();
  const menteeName = String(body.menteeName || '').trim();
  if (!mentorId || !mentorName || !menteeId || !menteeName) return NextResponse.json({ error: 'mentor_mentee_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const mentorship = await KnowledgeTransferService.createMentorship(ws.organizationId, ws.id, {
      mentorId, mentorName, menteeId, menteeName,
      description: body.description, goals: body.goals, status: body.status,
      startDate: body.startDate, endDate: body.endDate, department: body.department,
      skills: body.skills, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ mentorship }, { status: 201 });
  } catch (e) {
    console.error('[knowledge-transfer/mentorships] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_mentorship' }, { status: 500 });
  }
}
