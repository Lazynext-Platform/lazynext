import { NextResponse } from 'next/server';

/**
 * Team Presence API — polling-based real-time presence.
 *
 * Since Cloudflare Workers don't support persistent WebSocket connections,
 * we use a polling approach with short TTLs. The client sends a heartbeat
 * every 10 seconds, and presence entries expire after 30 seconds of inactivity.
 *
 * Presence is stored in an in-memory map keyed by teamId. This works across
 * requests within the same Worker isolate. For multi-isolate deployments,
 * a Durable Object or KV store would be needed — but for the current
 * single-isolate deployment, this is sufficient.
 */

// ── In-memory presence store ──

interface PresenceEntry {
  userId: string;
  userName: string;
  userImage: string | null;
  page: string;
  lastSeen: number; // epoch ms
}

// Map<teamId, Map<userId, PresenceEntry>>
const presenceStore = new Map<string, Map<string, PresenceEntry>>();

const PRESENCE_TTL_MS = 30_000; // 30 seconds

function cleanStaleEntries(teamId: string): void {
  const team = presenceStore.get(teamId);
  if (!team) return;
  const now = Date.now();
  for (const [uid, entry] of team) {
    if (now - entry.lastSeen > PRESENCE_TTL_MS) {
      team.delete(uid);
    }
  }
  if (team.size === 0) presenceStore.delete(teamId);
}

function getTeamPresence(teamId: string): Map<string, PresenceEntry> {
  let team = presenceStore.get(teamId);
  if (!team) {
    team = new Map();
    presenceStore.set(teamId, team);
  }
  return team;
}

// ── Auth helper ──

async function checkMembership(teamId: string) {
  const { auth } = await import('@/../auth');
  const { prisma } = await import('@/lib/prisma');
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }), user: null };
  const uid = session.user.id;
  const membership = await prisma.teamMember.findFirst({
    where: { teamId, userId: uid },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
  if (!membership) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }), user: null };
  return { error: null, user: membership.user };
}

/**
 * GET /api/teams/[id]/presence
 * Returns all currently-online team members with their current page.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await checkMembership(id);
  if (error) return error;

  cleanStaleEntries(id);
  const team = getTeamPresence(id);
  const now = Date.now();

  const members = Array.from(team.values()).map(e => ({
    userId: e.userId,
    userName: e.userName,
    userImage: e.userImage,
    page: e.page,
    onlineFor: Math.round((now - e.lastSeen) / 1000), // seconds since last heartbeat
  }));

  return NextResponse.json({ members, count: members.length });
}

/**
 * POST /api/teams/[id]/presence
 * Heartbeat — updates the caller's presence entry.
 * Body: { page: string }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, user } = await checkMembership(id);
  if (error || !user) return error;

  const body = await req.json().catch(() => ({}));
  const page = typeof body.page === 'string' ? body.page.slice(0, 200) : '/dashboard';

  const team = getTeamPresence(id);
  team.set(user.id, {
    userId: user.id,
    userName: user.name || user.email || 'Unknown',
    userImage: user.image || null,
    page,
    lastSeen: Date.now(),
  });

  // Also return current presence for convenience
  cleanStaleEntries(id);
  const now = Date.now();
  const members = Array.from(team.values()).map(e => ({
    userId: e.userId,
    userName: e.userName,
    userImage: e.userImage,
    page: e.page,
    onlineFor: Math.round((now - e.lastSeen) / 1000),
  }));

  return NextResponse.json({ ok: true, members, count: members.length });
}

/**
 * DELETE /api/teams/[id]/presence
 * Remove the caller's presence entry (e.g., on page unload).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, user } = await checkMembership(id);
  if (error || !user) return error;

  const team = presenceStore.get(id);
  if (team) team.delete(user.id);

  return NextResponse.json({ ok: true });
}
