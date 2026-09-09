import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LegalContractService } from '@/lib/services/legal-contract-service';

/** GET /api/legal/contracts/expired — expired contracts */
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
  const contracts = await LegalContractService.getExpired(organizationId);
  return NextResponse.json({ contracts });
}
