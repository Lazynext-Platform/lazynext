import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CrisisCommunicationService } from '@/lib/services/crisis-communication-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { planCount: 0, messageCount: 0, communicationCount: 0, inquiryCount: 0, byPlanType: {}, byPlanStatus: {}, byMessageType: {}, byMessageStatus: {}, byCommunicationType: {}, byCommunicationStatus: {}, byInquiryType: {}, byInquiryStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await CrisisCommunicationService.getCrisisCommunicationStats(organizationId);
  return NextResponse.json({ stats });
}
