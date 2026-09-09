import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** POST /api/gov-relations/policies/[id]/position — update the position on a policy */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const position = String(body.position || '').trim();
  if (!position) {
    return NextResponse.json({ error: 'position_required' }, { status: 400 });
  }

  try {
    const policy = await GovRelationsService.updatePosition(id, position, session.user.id);
    if (!policy) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[gov-relations/policies/position] error:', e);
    return NextResponse.json({ error: 'failed_to_update_position' }, { status: 500 });
  }
}
