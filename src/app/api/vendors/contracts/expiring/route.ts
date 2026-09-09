import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorContractService } from '@/lib/services/vendor-contract-service';

/** GET /api/vendors/contracts/expiring — contracts expiring within N days */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ contracts: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;
  const days = sp.get('days') ? Number(sp.get('days')) : 30;

  const contracts = await VendorContractService.getExpiring(organizationId, days);

  return NextResponse.json({ contracts });
}
