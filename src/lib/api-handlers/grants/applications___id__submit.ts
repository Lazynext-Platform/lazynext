import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** POST /api/grants/applications/[id]/submit — submit an application */
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
    const application = await GrantService.submitApplication(id, session.user.id);
    if (!application) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ application });
  } catch (e) {
    console.error('[grants/applications/submit] error:', e);
    return NextResponse.json({ error: 'failed_to_submit_application' }, { status: 500 });
  }
}
