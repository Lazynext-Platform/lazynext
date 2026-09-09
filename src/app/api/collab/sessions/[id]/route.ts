import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CollabEditorService } from '@/lib/services/collab-editor-service';

/**
 * GET /api/collab/sessions/[id] — get session details.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const users = await CollabEditorService.getSessionUsers(id);
    return NextResponse.json({ id, users });
  } catch (e) {
    console.error('[collab] get session error:', e);
    return NextResponse.json({ error: 'failed_to_get_session' }, { status: 500 });
  }
}

/**
 * DELETE /api/collab/sessions/[id] — end an editing session.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ended = await CollabEditorService.endSession(id);
    if (!ended) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ session: ended });
  } catch (e) {
    console.error('[collab] end session error:', e);
    return NextResponse.json({ error: 'failed_to_end_session' }, { status: 500 });
  }
}
