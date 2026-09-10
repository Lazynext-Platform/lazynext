import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import {
  createTimeline,
  addTrack,
  addClip,
  addTransition,
  addMarker,
  validateTimeline,
} from '@/lib/editor/timeline-builder';
import type { TrackType, AspectRatio, Timeline } from '@/lib/editor/types';

export const maxDuration = 30;

/**
 * GET /api/editor/timeline
 * Lists the authenticated user's saved timelines from D1.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const timelines = await prisma.timeline.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      durationSec: true,
      fps: true,
      ratio: true,
      creationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ timelines });
}

/**
 * POST /api/editor/timeline
 * Body: { action: 'create' | 'addTrack' | 'addClip' | 'addTransition' | 'addMarker' | 'validate' | 'save' | 'load' | 'delete', ... }
 *
 * - create/addTrack/addClip/addTransition/addMarker/validate: in-memory timeline operations (no DB)
 * - save: persist a timeline to D1 (create or update)
 * - load: fetch a saved timeline by ID from D1
 * - delete: delete a saved timeline by ID from D1
 *
 * No credit cost — this is pure data manipulation.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  if (!action) return NextResponse.json({ error: 'action_required' }, { status: 400 });

  try {
    switch (action) {
      // ── In-memory timeline operations ──
      case 'create': {
        const timeline = createTimeline({
          name: body.name,
          fps: body.fps,
          ratio: body.ratio as AspectRatio | undefined,
        });
        return NextResponse.json({ timeline });
      }

      case 'addTrack': {
        if (!body.timeline) return NextResponse.json({ error: 'timeline_required' }, { status: 400 });
        const type = body.type as TrackType | undefined;
        if (!type || !['video', 'audio', 'text', 'overlay'].includes(type)) {
          return NextResponse.json({ error: 'invalid_track_type' }, { status: 400 });
        }
        const timeline = addTrack(body.timeline, type, body.name);
        return NextResponse.json({ timeline });
      }

      case 'addClip': {
        if (!body.timeline) return NextResponse.json({ error: 'timeline_required' }, { status: 400 });
        if (!body.trackId) return NextResponse.json({ error: 'trackId_required' }, { status: 400 });
        if (!body.clip) return NextResponse.json({ error: 'clip_required' }, { status: 400 });
        const timeline = addClip(body.timeline, body.trackId, body.clip);
        return NextResponse.json({ timeline });
      }

      case 'addTransition': {
        if (!body.timeline) return NextResponse.json({ error: 'timeline_required' }, { status: 400 });
        if (!body.transition) return NextResponse.json({ error: 'transition_required' }, { status: 400 });
        const timeline = addTransition(body.timeline, body.transition);
        return NextResponse.json({ timeline });
      }

      case 'addMarker': {
        if (!body.timeline) return NextResponse.json({ error: 'timeline_required' }, { status: 400 });
        if (!body.marker) return NextResponse.json({ error: 'marker_required' }, { status: 400 });
        const timeline = addMarker(body.timeline, body.marker);
        return NextResponse.json({ timeline });
      }

      case 'validate': {
        if (!body.timeline) return NextResponse.json({ error: 'timeline_required' }, { status: 400 });
        const result = validateTimeline(body.timeline);
        return NextResponse.json({ result });
      }

      // ── D1 persistence operations ──
      case 'save': {
        if (!body.timeline) return NextResponse.json({ error: 'timeline_required' }, { status: 400 });
        const tl = body.timeline as Timeline;
        const id = typeof body.id === 'string' ? body.id : undefined;
        const creationId = typeof body.creationId === 'string' ? body.creationId : null;

        const data = {
          userId: uid,
          creationId,
          name: tl.name || 'Untitled',
          durationSec: tl.durationSec || 0,
          fps: tl.fps || 30,
          ratio: tl.ratio || '16:9',
          tracksJson: JSON.stringify(tl.tracks || []),
          markersJson: JSON.stringify(tl.markers || []),
        };

        if (id) {
          // Update existing — verify ownership
          const existing = await prisma.timeline.findUnique({ where: { id }, select: { userId: true } });
          if (!existing || existing.userId !== uid) {
            return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });
          }
          const updated = await prisma.timeline.update({ where: { id }, data });
          return NextResponse.json({ timeline: updated });
        }

        // Create new
        const created = await prisma.timeline.create({ data });
        return NextResponse.json({ timeline: created });
      }

      case 'load': {
        if (!body.id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
        const record = await prisma.timeline.findUnique({ where: { id: body.id } });
        if (!record || record.userId !== uid) {
          return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });
        }
        // Parse JSON fields back to arrays
        const timeline = {
          ...record,
          tracks: JSON.parse(record.tracksJson || '[]'),
          markers: JSON.parse(record.markersJson || '[]'),
        };
        return NextResponse.json({ timeline });
      }

      case 'delete': {
        if (!body.id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
        const existing = await prisma.timeline.findUnique({ where: { id: body.id }, select: { userId: true } });
        if (!existing || existing.userId !== uid) {
          return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });
        }
        await prisma.timeline.delete({ where: { id: body.id } });
        return NextResponse.json({ deleted: true });
      }

      default:
        return NextResponse.json({ error: 'invalid_action', detail: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[editor/timeline] error:', message);
    return NextResponse.json({ error: 'timeline_operation_failed' }, { status: 500 });
  }
}
