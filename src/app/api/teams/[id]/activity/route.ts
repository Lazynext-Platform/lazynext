import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { logToolExecution } from '@/lib/telemetry';

/**
 * GET /api/teams/[id]/activity?limit=50
 * Returns the team activity feed (most recent first).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  const membership = await prisma.teamMember.findFirst({ where: { teamId: id, userId: uid } });
  if (!membership) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
  const cursor = url.searchParams.get('cursor'); // activity id for pagination

  const activities = await prisma.teamActivity.findMany({
    where: { teamId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  return NextResponse.json({
    activities: activities.map(a => ({
      id: a.id,
      type: a.type,
      summary: a.summary,
      metadata: JSON.parse(a.metadataJson || '{}'),
      createdAt: a.createdAt.toISOString(),
      user: a.user,
    })),
    nextCursor: activities.length === limit ? activities[activities.length - 1].id : null,
  });
}

/**
 * POST /api/teams/[id]/activity
 * Record a new activity event. Only team members can post.
 * Body: { type: string, summary: string, metadata?: object }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  const membership = await prisma.teamMember.findFirst({ where: { teamId: id, userId: uid } });
  if (!membership) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { type, summary, metadata } = body as { type?: string; summary?: string; metadata?: Record<string, unknown> };
  if (!type || !summary) return NextResponse.json({ error: 'type_and_summary_required' }, { status: 400 });

  const allowedTypes = [
    'member_joined', 'member_left', 'role_changed',
    'project_created', 'project_updated', 'project_shared',
    'comment_added', 'approval_requested', 'approval_granted',
    'custom',
  ];
  if (!allowedTypes.includes(type)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 });

  const activity = await prisma.teamActivity.create({
    data: {
      teamId: id,
      userId: uid,
      type,
      summary: String(summary).slice(0, 500),
      metadataJson: JSON.stringify(metadata || {}),
    },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  logToolExecution({ tool: 'team_activity', userId: uid, cost: 0, durationMs: 0, success: true });

  return NextResponse.json({
    id: activity.id,
    type: activity.type,
    summary: activity.summary,
    metadata: JSON.parse(activity.metadataJson),
    createdAt: activity.createdAt.toISOString(),
    user: activity.user,
  }, { status: 201 });
}
