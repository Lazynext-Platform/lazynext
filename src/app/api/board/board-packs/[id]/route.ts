import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/board-packs/[id] — get a single board pack */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const boardPack = await BoardService.getBoardPack(id);
  if (!boardPack) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ boardPack });
}

/** PATCH /api/board/board-packs/[id] — update a board pack */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const boardPack = await BoardService.updateBoardPack(id, {
      title: body.title, sections: body.sections, status: body.status,
      distributedDate: body.distributedDate, distributedTo: body.distributedTo, confidential: body.confidential,
    });
    if (!boardPack) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ boardPack });
  } catch (e) {
    console.error('[board/board-packs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_board_pack' }, { status: 500 });
  }
}
