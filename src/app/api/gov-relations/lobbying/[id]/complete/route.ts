import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** POST /api/gov-relations/lobbying/[id]/complete — complete a lobbying activity */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lobbying = await GovRelationsService.completeLobbying(id, session.user.id);
    if (!lobbying) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ lobbying });
  } catch (e) {
    console.error('[gov-relations/lobbying/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_lobbying' }, { status: 500 });
  }
}
