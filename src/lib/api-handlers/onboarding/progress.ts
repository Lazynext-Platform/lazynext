import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/onboarding/progress — get overall onboarding progress for an organization.
 * Query: organizationId
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const organizationId = req.nextUrl.searchParams.get('organizationId');
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  try {
    // Verify the user has access to a workspace in this organization
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const progress = await OnboardingService.getOnboardingProgress(organizationId);
    return NextResponse.json(progress);
  } catch (e) {
    console.error('[onboarding/progress] error:', e);
    return NextResponse.json({ error: 'failed_to_get_progress' }, { status: 500 });
  }
}
