import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommunicationsService } from '@/lib/services/communications-service';

/** POST /api/communications/crises/[id]/activate — activate a crisis */
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
    const crisis = await CommunicationsService.activateCrisis(id, session.user.id);
    if (!crisis) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ crisis });
  } catch (e) {
    console.error('[communications/crises/activate] error:', e);
    return NextResponse.json({ error: 'failed_to_activate_crisis' }, { status: 500 });
  }
}
