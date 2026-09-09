import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ badges: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['visitId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const badges = await VisitorManagementService.listBadges(organizationId, opts as never);
  return NextResponse.json({ badges });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const visitId = String(body.visitId || '').trim();
  const type = String(body.type || '').trim();
  if (!visitId || !type) return NextResponse.json({ error: 'visitId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const badge = await VisitorManagementService.createBadge(ws.organizationId, ws.id, {
      visitId, type: type as never,
      description: body.description, status: body.status, badgeNumber: body.badgeNumber,
      issuedAt: body.issuedAt, returnedAt: body.returnedAt, printedBy: body.printedBy,
      accessLevel: body.accessLevel, validAreas: body.validAreas, expiresAt: body.expiresAt,
      notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ badge }, { status: 201 });
  } catch (e) {
    console.error('[visitor-management/badges] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_badge' }, { status: 500 });
  }
}
