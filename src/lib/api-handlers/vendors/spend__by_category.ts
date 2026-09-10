import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorSpendService } from '@/lib/services/vendor-spend-service';

/** GET /api/vendors/spend/by-category — spend grouped by category */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ byCategory: {} });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const dateRange: { start?: string; end?: string } | undefined =
    sp.get('dateStart') || sp.get('dateEnd')
      ? { start: sp.get('dateStart') || undefined, end: sp.get('dateEnd') || undefined }
      : undefined;

  const byCategory = await VendorSpendService.getSpendByCategory(organizationId, { dateRange });

  return NextResponse.json({ byCategory });
}
