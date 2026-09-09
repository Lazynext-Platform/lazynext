import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ARService } from '@/lib/services/ar-service';

/** GET /api/invoicing/ar/dunning — get dunning list */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ dunningList: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const dunningList = await ARService.getDunningList(organizationId);
  return NextResponse.json({ dunningList });
}
