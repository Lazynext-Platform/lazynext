import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CollabEditorService } from '@/lib/services/collab-editor-service';

/**
 * GET /api/collab/sessions/[id]/snapshots — list snapshots for a session.
 * Query: limit
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const sp = req.nextUrl.searchParams;
  const limitParam = sp.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    const snapshots = await CollabEditorService.getSnapshots(id, limit);
    return NextResponse.json({ snapshots });
  } catch (e) {
    console.error('[collab] list snapshots error:', e);
    return NextResponse.json({ error: 'failed_to_list_snapshots' }, { status: 500 });
  }
}

/**
 * POST /api/collab/sessions/[id]/snapshots — save a content snapshot.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const content = body.content;
  if (content === undefined || content === null) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  try {
    const snapshot = await CollabEditorService.saveSnapshot(id, content, session.user.id);
    if (!snapshot) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (e) {
    console.error('[collab] save snapshot error:', e);
    return NextResponse.json({ error: 'failed_to_save_snapshot' }, { status: 500 });
  }
}
