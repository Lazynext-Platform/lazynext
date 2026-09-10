import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SessionManagementService } from '@/lib/services/session-management-service';

/** DELETE /api/security/sessions/[id] — revoke a session */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const result = await SessionManagementService.revokeSession(id);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[security/sessions/delete] error:', e);
    return NextResponse.json({ error: 'failed_to_revoke_session' }, { status: 500 });
  }
}
