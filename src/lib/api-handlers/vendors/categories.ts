import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorService } from '@/lib/services/vendor-service';

/** GET /api/vendors/categories — get vendors grouped by category */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ categories: {} });
  }

  const organizationId = workspaces[0].organizationId;
  const categories = await VendorService.getByCategory(organizationId);

  return NextResponse.json({ categories });
}
