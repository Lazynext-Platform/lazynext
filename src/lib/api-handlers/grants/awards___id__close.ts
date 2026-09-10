import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** POST /api/grants/awards/[id]/close — close an award */
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
    const award = await GrantService.closeAward(id, session.user.id, body.notes);
    if (!award) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ award });
  } catch (e) {
    console.error('[grants/awards/close] error:', e);
    return NextResponse.json({ error: 'failed_to_close_award' }, { status: 500 });
  }
}
