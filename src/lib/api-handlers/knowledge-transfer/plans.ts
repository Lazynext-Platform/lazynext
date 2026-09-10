import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ plans: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['status', 'priority', 'department']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const plans = await KnowledgeTransferService.listPlans(organizationId, opts as never);
  return NextResponse.json({ plans });
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
    const plan = await KnowledgeTransferService.createPlan(ws.organizationId, ws.id, {
      title,
      description: body.description, owner: body.owner, priority: body.priority,
      status: body.status, sourcePerson: body.sourcePerson, targetPerson: body.targetPerson,
      department: body.department, skills: body.skills, startDate: body.startDate,
      endDate: body.endDate, milestones: body.milestones, progress: body.progress, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    console.error('[knowledge-transfer/plans] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_plan' }, { status: 500 });
  }
}
