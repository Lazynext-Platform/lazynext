import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LegalMatterService } from '@/lib/services/legal-matter-service';

/** GET /api/legal/matters/open — open matters */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ matters: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const matters = await LegalMatterService.getOpen(organizationId);
  return NextResponse.json({ matters });
}
