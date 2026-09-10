import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * Resolve the authenticated user's organization ID.
 * Returns { organizationId, userId } on success, or a NextResponse error.
 */
export async function resolveOrg(): Promise<
  | { ok: true; organizationId: string; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'no_workspace' }, { status: 400 }),
    };
  }

  return {
    ok: true,
    organizationId: workspaces[0].organizationId,
    userId: session.user.id,
  };
}
