import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SecurityService } from '@/lib/services/security';

/**
 * GET /api/security/events/[id] — get a single security event.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const event = await SecurityService.getSecurityEvent(id);
    if (!event) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (e) {
    console.error('[security/events] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_event' }, { status: 500 });
  }
}

/**
 * PATCH /api/security/events/[id] — resolve a security event.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: { resolvedBy?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const resolvedBy = body.resolvedBy || session.user.id;

  try {
    const event = await SecurityService.resolveEvent(id, resolvedBy);
    if (!event) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (e) {
    console.error('[security/events] resolve error:', e);
    return NextResponse.json({ error: 'failed_to_resolve_event' }, { status: 500 });
  }
}
