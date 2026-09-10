import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BoardService } from '@/lib/services/board-service';

/** POST /api/board/board-packs/[id]/distribute — distribute a board pack */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const boardPack = await BoardService.distributeBoardPack(id, session.user.id, body.recipients);
    if (!boardPack) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ boardPack });
  } catch (e) {
    console.error('[board/board-packs] distribute error:', e);
    return NextResponse.json({ error: 'failed_to_distribute_board_pack' }, { status: 500 });
  }
}
