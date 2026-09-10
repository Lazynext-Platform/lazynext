import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** POST /api/gov-relations/lobbying/[id]/register — register a lobbying activity */
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
  const registrationId = String(body.registrationId || '').trim();
  if (!registrationId) {
    return NextResponse.json({ error: 'registration_id_required' }, { status: 400 });
  }

  try {
    const lobbying = await GovRelationsService.registerLobbying(id, registrationId, session.user.id);
    if (!lobbying) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ lobbying });
  } catch (e) {
    console.error('[gov-relations/lobbying/register] error:', e);
    return NextResponse.json({ error: 'failed_to_register_lobbying' }, { status: 500 });
  }
}
