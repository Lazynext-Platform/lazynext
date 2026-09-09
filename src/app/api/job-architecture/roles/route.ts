import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { JobArchitectureService } from '@/lib/services/job-architecture-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ roles: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['familyId', 'levelId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const roles = await JobArchitectureService.listRoles(organizationId, opts as never);
  return NextResponse.json({ roles });
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
    const role = await JobArchitectureService.createRole(ws.organizationId, ws.id, {
      title, type: type as never,
      familyId: body.familyId, levelId: body.levelId,
      description: body.description, status: body.status,
      grade: body.grade, salaryRange: body.salaryRange,
      responsibilities: body.responsibilities, qualifications: body.qualifications,
      reportsTo: body.reportsTo, directReports: body.directReports,
      fte: body.fte, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ role }, { status: 201 });
  } catch (e) {
    console.error('[job-architecture/roles] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_role' }, { status: 500 });
  }
}
