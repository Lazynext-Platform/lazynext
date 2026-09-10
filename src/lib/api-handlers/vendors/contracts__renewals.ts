import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorContractService } from '@/lib/services/vendor-contract-service';

/** GET /api/vendors/contracts/renewals — contracts needing renewal attention */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ contracts: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const contracts = await VendorContractService.getRenewalAlerts(organizationId);

  return NextResponse.json({ contracts });
}
