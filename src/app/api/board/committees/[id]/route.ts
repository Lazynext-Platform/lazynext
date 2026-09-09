import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/committees/[id] — get a single committee */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const committee = await BoardService.getCommittee(id);
  if (!committee) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ committee });
}

/** PATCH /api/board/committees/[id] — update a committee */
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
    const committee = await BoardService.updateCommittee(id, {
      name: body.name, type: body.type, charter: body.charter, members: body.members,
      chair: body.chair, meetingFrequency: body.meetingFrequency, status: body.status,
      establishedDate: body.establishedDate,
    });
    if (!committee) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ committee });
  } catch (e) {
    console.error('[board/committees] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_committee' }, { status: 500 });
  }
}

/** DELETE /api/board/committees/[id] — delete a committee */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await BoardService.deleteCommittee(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[board/committees] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_committee' }, { status: 500 });
  }
}
