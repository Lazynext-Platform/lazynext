import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommunicationsService } from '@/lib/services/communications-service';

/** POST /api/communications/crises/[id]/resolve — resolve a crisis */
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
  const resolution = String(body.resolution || '').trim();
  if (!resolution) {
    return NextResponse.json({ error: 'resolution_required' }, { status: 400 });
  }

  try {
    const crisis = await CommunicationsService.resolveCrisis(id, resolution, session.user.id);
    if (!crisis) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ crisis });
  } catch (e) {
    console.error('[communications/crises/resolve] error:', e);
    return NextResponse.json({ error: 'failed_to_resolve_crisis' }, { status: 500 });
  }
}
