import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/members — list members */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ members: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { role?: string; status?: string } = {};
  const role = url.searchParams.get('role');
  const status = url.searchParams.get('status');
  if (role) opts.role = role;
  if (status) opts.status = status;

  const members = await BoardService.listMembers(organizationId, opts as never);
  return NextResponse.json({ members });
}

/** POST /api/board/members — create a member */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const role = String(body.role || '').trim();
  if (!name || !role) {
    return NextResponse.json({ error: 'name_and_role_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const member = await BoardService.createMember(
      ws.organizationId, ws.id,
      {
        name, role: role as never,
        email: body.email, phone: body.phone, expertise: body.expertise,
        committees: body.committees, termStart: body.termStart, termEnd: body.termEnd,
        status: body.status, bio: body.bio, compensation: body.compensation,
      },
      session.user.id,
    );
    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    console.error('[board/members] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_member' }, { status: 500 });
  }
}
