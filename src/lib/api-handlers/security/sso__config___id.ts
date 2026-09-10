import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SsoService } from '@/lib/services/sso-service';

/** DELETE /api/security/sso/config/[id] — delete an SSO config */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    // The id is the memory record id; delete by config id
    // We list configs to find the matching one, then delete by provider
    const configs = await SsoService.listConfigs(organizationId);
    const config = configs.find((c) => c.id === id);
    if (!config) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    await SsoService.deleteConfig(organizationId, config.provider);
    return NextResponse.json({ deleted: true });
  } catch (e) {
    console.error('[security/sso/config/delete] error:', e);
    return NextResponse.json({ error: 'failed_to_delete_config' }, { status: 500 });
  }
}
