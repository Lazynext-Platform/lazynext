import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/resolutions/[id] — get a single resolution */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const resolution = await BoardService.getResolution(id);
  if (!resolution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ resolution });
}

/** PATCH /api/board/resolutions/[id] — update a resolution */
export async function PATCH(
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
    const resolution = await BoardService.updateResolution(id, {
      title: body.title, description: body.description, type: body.type,
      proposedBy: body.proposedBy, voteDeadline: body.voteDeadline, status: body.status,
      votes: body.votes, outcome: body.outcome, attachments: body.attachments,
    });
    if (!resolution) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ resolution });
  } catch (e) {
    console.error('[board/resolutions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_resolution' }, { status: 500 });
  }
}
