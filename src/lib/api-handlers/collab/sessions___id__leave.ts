import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CollabEditorService } from '@/lib/services/collab-editor-service';

/**
 * POST /api/collab/sessions/[id]/leave — leave an editing session.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const left = await CollabEditorService.leaveSession(id, session.user.id);
    if (!left) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ session: left });
  } catch (e) {
    console.error('[collab] leave session error:', e);
    return NextResponse.json({ error: 'failed_to_leave_session' }, { status: 500 });
  }
}
