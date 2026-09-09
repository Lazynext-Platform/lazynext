import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/members/[id] — get a single member */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const member = await BoardService.getMember(id);
  if (!member) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ member });
}

/** PATCH /api/board/members/[id] — update a member */
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
    const member = await BoardService.updateMember(id, {
      name: body.name, role: body.role, email: body.email, phone: body.phone,
      expertise: body.expertise, committees: body.committees, termStart: body.termStart,
      termEnd: body.termEnd, status: body.status, bio: body.bio, compensation: body.compensation,
    });
    if (!member) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ member });
  } catch (e) {
    console.error('[board/members] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_member' }, { status: 500 });
  }
}

/** DELETE /api/board/members/[id] — delete a member */
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
    const ok = await BoardService.deleteMember(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[board/members] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_member' }, { status: 500 });
  }
}
