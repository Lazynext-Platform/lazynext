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

/*
 * ────────────────────────────────────────────────────────────────────────────
 * PRODUCTION LIMITATION — Cross-isolate presence (documented)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * The in-memory `presenceStore` below is scoped to a single Worker isolate.
 * Cloudflare Workers run many isolates in parallel, so a heartbeat sent to
 * isolate A is invisible to a GET request handled by isolate B. This means
 * online members may appear offline to teammates whose requests land on a
 * different isolate.
 *
 * Recommended production fixes (in order of preference):
 *
 *   1. Durable Objects (BEST): A per-team Durable Object holds the canonical
 *      presence map. All presence requests for a team are routed to the same
 *      DO instance via the team id, giving a single source of truth with
 *      sub-second fan-out via WebSocket Hibernation API. This is the
 *      Cloudflare-recommended pattern for real-time presence.
 *
 *   2. D1-backed presence: Add a `lastSeenAt` column to the TeamMember model
 *      (or a dedicated `TeamPresence` table) and update it on every heartbeat.
 *      GET queries rows where `lastSeenAt > now() - 30s`. This is durable and
 *      cross-isolate but adds a DB write per heartbeat (~1 write/10s/user),
 *      which increases D1 write load. A TTL index or periodic cleanup job is
 *      needed to prune stale rows.
 *
 *   3. Workers KV: Store presence with a short TTL (e.g. 30s) keyed by
 *      `presence:{teamId}:{userId}`. KV is eventually consistent (~60s) so it
 *      is not ideal for real-time presence but works for "who's roughly
 *      online" semantics.
 *
 * Best-effort improvement implemented here:
 *   The TeamMember model has no `lastSeenAt` field, and adding one requires a
 *   schema migration (see prisma/schema.prisma). As a lightweight best-effort
 *   persistence that does NOT require a migration, we write a `member_online`
 *   entry to the TeamActivity log (D1-backed) the first time a user becomes
 *   present in a session (i.e. when they were not already in the in-memory
 *   store). This records presence events durably across isolates without
 *   spamming the activity feed on every 10s heartbeat. When a proper
 *   `lastSeenAt` field or Durable Object is introduced, this activity-log
 *   write can be removed.
 * ────────────────────────────────────────────────────────────────────────────
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
  try {
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
  } catch (err) {
    console.error(`checkMembership error for team ${teamId}:`, err);
    return { error: NextResponse.json({ error: 'internal_error' }, { status: 500 }), user: null };
  }
}

/**
 * GET /api/teams/[id]/presence
 * Returns all currently-online team members with their current page.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
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
  } catch (err) {
    console.error(`GET /api/teams/${id}/presence error:`, err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * POST /api/teams/[id]/presence
 * Heartbeat — updates the caller's presence entry.
 * Body: { page: string }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { error, user } = await checkMembership(id);
    if (error || !user) return error;

    const body = await req.json().catch(() => ({}));
    const page = typeof body.page === 'string' ? body.page.slice(0, 200) : '/dashboard';

    const team = getTeamPresence(id);
    // Detect first presence in this isolate (user was not online here before).
    // This is used for the best-effort D1 activity-log write (see header comment).
    const wasOnline = team.has(user.id);

    team.set(user.id, {
      userId: user.id,
      userName: user.name || user.email || 'Unknown',
      userImage: user.image || null,
      page,
      lastSeen: Date.now(),
    });

    // Best-effort D1 persistence: log a `member_online` activity the first time
    // a user becomes present in this isolate. This is fire-and-forget and
    // intentionally NOT awaited so a slow DB write never blocks the heartbeat.
    // It records presence events durably across isolates without spamming the
    // activity feed on every 10s heartbeat. See the header comment for the
    // full production recommendation (Durable Objects / lastSeenAt column).
    if (!wasOnline) {
      try {
        const { prisma } = await import('@/lib/prisma');
        // Fire-and-forget: attach a .catch() so rejections never surface as
        // unhandled promise rejections. The heartbeat response is not delayed.
        prisma.teamActivity.create({
          data: {
            teamId: id,
            userId: user.id,
            type: 'member_online',
            summary: `${user.name || user.email || 'A member'} came online`,
            metadataJson: JSON.stringify({ page }),
          },
        }).catch(() => { /* best-effort: ignore DB errors */ });
      } catch {
        /* best-effort: ignore import/DB errors */
      }
    }

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
  } catch (err) {
    console.error(`POST /api/teams/${id}/presence error:`, err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/[id]/presence
 * Remove the caller's presence entry (e.g., on page unload).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { error, user } = await checkMembership(id);
    if (error || !user) return error;

    const team = presenceStore.get(id);
    if (team) team.delete(user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/teams/${id}/presence error:`, err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
