import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RelocationService } from '@/lib/services/relocation-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { caseCount: 0, moveCount: 0, expenseCount: 0, vendorCount: 0, byCaseType: {}, byCaseStatus: {}, byMoveType: {}, byMoveStatus: {}, byExpenseType: {}, byExpenseStatus: {}, byVendorType: {}, byVendorStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await RelocationService.getRelocationStats(organizationId);
  return NextResponse.json({ stats });
}
