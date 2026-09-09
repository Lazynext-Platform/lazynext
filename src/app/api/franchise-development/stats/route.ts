import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { unitCount: 0, activeUnitCount: 0, agreementCount: 0, executedAgreementCount: 0, royaltyCount: 0, pendingRoyaltyCount: 0, trainingCount: 0, scheduledTrainingCount: 0, byUnitType: {}, byUnitStatus: {}, byAgreementType: {}, byAgreementStatus: {}, byRoyaltyType: {}, byRoyaltyStatus: {}, byTrainingType: {}, byTrainingStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await FranchiseDevelopmentService.getFranchiseDevelopmentStats(organizationId);
  return NextResponse.json({ stats });
}
