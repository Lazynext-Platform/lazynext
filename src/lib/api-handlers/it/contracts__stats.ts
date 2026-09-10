import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITContractService } from '@/lib/services/it-contract-service';

/** GET /api/it/contracts/stats — get IT contract stats */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ total: 0, byStatus: {}, totalActiveValue: 0 });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await ITContractService.getStats(organizationId);
  return NextResponse.json(stats);
}
