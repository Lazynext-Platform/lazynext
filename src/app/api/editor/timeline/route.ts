import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  createTimeline,
  addTrack,
  addClip,
  addTransition,
  addMarker,
  validateTimeline,
} from '@/lib/editor/timeline-builder';
import type { TrackType, AspectRatio } from '@/lib/editor/types';

export const maxDuration = 30;

/**
 * POST /api/editor/timeline
 * Body: { action: 'create' | 'addTrack' | 'addClip' | 'addTransition' | 'addMarker' | 'validate', ... }
 * Returns the updated timeline or validation result.
 * No credit cost — this is pure data manipulation.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  if (!action) return NextResponse.json({ error: 'action_required' }, { status: 400 });

  try {
    switch (action) {
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

      default:
        return NextResponse.json({ error: 'invalid_action', detail: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[editor/timeline] error:', message);
    return NextResponse.json({ error: 'timeline_operation_failed', detail: message }, { status: 500 });
  }
}
