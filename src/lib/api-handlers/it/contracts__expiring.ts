import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITContractService } from '@/lib/services/it-contract-service';

/** GET /api/it/contracts/expiring — get contracts expiring soon */
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
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '30', 10);

  const contracts = await ITContractService.getExpiringContracts(organizationId, days);
  return NextResponse.json({ contracts });
}
