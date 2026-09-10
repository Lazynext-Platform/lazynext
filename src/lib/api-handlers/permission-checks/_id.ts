import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PermissionService } from '@/lib/services/permission-service';
import { safeError } from '@/lib/security';

/**
 * GET /api/permission-checks/[id]
 * Get a recorded permission decision by ID.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const check = await PermissionService.getPermissionCheck(id);
    if (!check) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);
    if (!wsIds.includes(check.workspaceId)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Not a member of this workspace' },
        { status: 403 },
      );
    }

    return NextResponse.json({ check });
  } catch (e) {
    return NextResponse.json(
      safeError(e, 'permission-checks/[id]', 'get_failed'),
      { status: 500 },
    );
  }
}
