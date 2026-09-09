import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SsoService } from '@/lib/services/sso-service';

/** GET /api/security/sso/metadata — get SP metadata XML */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const metadata = await SsoService.getMetadata(organizationId);
    return new NextResponse(metadata, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[security/sso/metadata] error:', e);
    return NextResponse.json({ error: 'failed_to_get_metadata' }, { status: 500 });
  }
}
