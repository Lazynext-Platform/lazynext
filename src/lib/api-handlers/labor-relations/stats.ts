import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LaborRelationsService } from '@/lib/services/labor-relations-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { unionCount: 0, grievanceCount: 0, contractCount: 0, disputeCount: 0, byUnionType: {}, byUnionStatus: {}, byGrievanceType: {}, byGrievanceStatus: {}, byGrievancePriority: {}, byContractType: {}, byContractStatus: {}, byDisputeType: {}, byDisputeStatus: {}, byDisputePriority: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await LaborRelationsService.getLaborRelationsStats(organizationId);
  return NextResponse.json({ stats });
}
