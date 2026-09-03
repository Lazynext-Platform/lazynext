import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { canInviteMembers } from '@/lib/plan-guard';
import { createNotification } from '@/lib/notifications';

/**
 * GET /api/admin/members?workspaceId=... — list members of a workspace.
 * POST /api/admin/members — invite a member to a workspace (by email).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  // Verify the user is a member of this workspace
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (!ws) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const members = await prisma.membership.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ members, role: ws.role });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { workspaceId?: string; email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = body.workspaceId;
  const email = body.email?.trim().toLowerCase();
  const role = body.role?.trim() || 'member';

  if (!workspaceId || !email) {
    return NextResponse.json({ error: 'workspaceId_and_email_required' }, { status: 400 });
  }

  // Only owners and admins can invite
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (!ws) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (ws.role !== 'owner' && ws.role !== 'admin') {
    return NextResponse.json({ error: 'insufficient_permissions' }, { status: 403 });
  }

  // Plan limit check
  const guard = await canInviteMembers(workspaceId, session.user.id);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason || 'plan_limit_exceeded', limit: guard.limit, current: guard.current, tier: guard.tier },
      { status: 402 },
    );
  }

  // Find user by email
  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    return NextResponse.json({ error: 'user_not_found', message: 'User must create an account first.' }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: targetUser.id, workspaceId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'already_a_member' }, { status: 409 });
  }

  const membership = await prisma.membership.create({
    data: {
      userId: targetUser.id,
      workspaceId,
      role,
    },
  });

  // Notify the invited user
  await createNotification({
    userId: targetUser.id,
    workspaceId,
    type: 'system',
    title: `You've been added to a workspace`,
    body: `You are now a ${role} of this workspace.`,
  }).catch(() => {});

  return NextResponse.json({ membership }, { status: 201 });
}
