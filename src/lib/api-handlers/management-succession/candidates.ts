import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ManagementSuccessionService } from '@/lib/services/management-succession-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ candidates: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['planId', 'type', 'status', 'rank']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const candidates = await ManagementSuccessionService.listCandidates(organizationId, opts as never);
  return NextResponse.json({ candidates });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId || '').trim();
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!planId || !name || !type) return NextResponse.json({ error: 'planId_name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const candidate = await ManagementSuccessionService.createCandidate(ws.organizationId, ws.id, {
      planId, name, type: type as never,
      description: body.description, status: body.status, rank: body.rank,
      currentRole: body.currentRole, targetRole: body.targetRole,
      readinessLevel: body.readinessLevel, developmentNeeds: body.developmentNeeds,
      strengths: body.strengths, gaps: body.gaps, mentor: body.mentor, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ candidate }, { status: 201 });
  } catch (e) {
    console.error('[management-succession/candidates] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_candidate' }, { status: 500 });
  }
}
