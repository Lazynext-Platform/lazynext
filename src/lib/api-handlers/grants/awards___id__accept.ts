import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** POST /api/grants/awards/[id]/accept — accept an award */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const award = await GrantService.acceptAward(id, session.user.id);
    if (!award) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ award });
  } catch (e) {
    console.error('[grants/awards/accept] error:', e);
    return NextResponse.json({ error: 'failed_to_accept_award' }, { status: 500 });
  }
}
