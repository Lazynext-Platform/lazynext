import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { APService } from '@/lib/services/ap-service';

/** GET /api/invoicing/ap/payables — get all payables */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ payables: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const groupBy = req.nextUrl.searchParams.get('groupBy');

  if (groupBy === 'vendor') {
    const grouped = await APService.getPayablesByVendor(organizationId);
    return NextResponse.json({ payablesByVendor: grouped });
  }

  const payables = await APService.getPayables(organizationId);
  return NextResponse.json({ payables });
}
