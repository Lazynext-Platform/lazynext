import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CollabEditorService } from '@/lib/services/collab-editor-service';

/**
 * POST /api/collab/sessions/[id]/join — join an editing session.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const joined = await CollabEditorService.joinSession(id, session.user.id);
    if (!joined) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ session: joined });
  } catch (e) {
    console.error('[collab] join session error:', e);
    return NextResponse.json({ error: 'failed_to_join_session' }, { status: 500 });
  }
}
