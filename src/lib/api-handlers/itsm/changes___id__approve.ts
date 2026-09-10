import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ChangeManagementService } from '@/lib/services/change-management-service';

/** POST /api/itsm/changes/[id]/approve — approve a change request */
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
    const change = await ChangeManagementService.approveChangeRequest(id, session.user.id);
    return NextResponse.json({ change });
  } catch (e) {
    console.error('[itsm/changes/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve' }, { status: 500 });
  }
}
