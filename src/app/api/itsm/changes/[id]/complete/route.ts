import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ChangeManagementService } from '@/lib/services/change-management-service';

/** POST /api/itsm/changes/[id]/complete — mark a change request as implemented/completed */
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
    const change = await ChangeManagementService.completeChangeRequest(id);
    return NextResponse.json({ change });
  } catch (e) {
    console.error('[itsm/changes/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete' }, { status: 500 });
  }
}
