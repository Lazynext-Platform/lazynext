import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommunicationsService } from '@/lib/services/communications-service';

/** POST /api/communications/press-releases/[id]/publish — publish a press release */
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
    const pressRelease = await CommunicationsService.publishPressRelease(id, session.user.id);
    if (!pressRelease) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ pressRelease });
  } catch (e) {
    console.error('[communications/press-releases/publish] error:', e);
    return NextResponse.json({ error: 'failed_to_publish_press_release' }, { status: 500 });
  }
}
