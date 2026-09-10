import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ARService } from '@/lib/services/ar-service';

/** GET /api/invoicing/ar/receivables — get all receivables */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ receivables: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const groupBy = req.nextUrl.searchParams.get('groupBy');

  if (groupBy === 'customer') {
    const grouped = await ARService.getReceivablesByCustomer(organizationId);
    return NextResponse.json({ receivablesByCustomer: grouped });
  }

  const receivables = await ARService.getReceivables(organizationId);
  return NextResponse.json({ receivables });
}
