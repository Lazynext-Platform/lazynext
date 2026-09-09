import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ logs: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['visitId', 'badgeId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const logs = await VisitorManagementService.listAccessLogs(organizationId, opts as never);
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  if (!type) return NextResponse.json({ error: 'type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const log = await VisitorManagementService.createAccessLog(ws.organizationId, ws.id, {
      type: type as never,
      visitId: body.visitId, badgeId: body.badgeId, description: body.description,
      status: body.status, timestamp: body.timestamp, location: body.location,
      officer: body.officer, outcome: body.outcome, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ log }, { status: 201 });
  } catch (e) {
    console.error('[visitor-management/access-logs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_access_log' }, { status: 500 });
  }
}
