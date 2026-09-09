import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OnboardingService } from '@/lib/services/onboarding-service';

/** GET /api/employee-development/onboarding/stats — onboarding stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, byCategory: {}, byStatus: {}, completionRate: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await OnboardingService.getStats(organizationId);
  return NextResponse.json({ stats });
}
