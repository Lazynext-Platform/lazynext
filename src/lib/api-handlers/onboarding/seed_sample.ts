import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/onboarding/seed-sample — seed sample data for a new org/workspace.
 * Body: { organizationId?: string, workspaceId?: string }
 * If not provided, uses the user's first workspace.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { organizationId?: string; workspaceId?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  try {
    let organizationId = body.organizationId;
    let workspaceId = body.workspaceId;

    // If not provided, use the user's first workspace
    if (!workspaceId || !organizationId) {
      const workspaces = await WorkspaceService.listForUser(session.user.id);
      if (workspaces.length === 0) {
        return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
      }
      const ws = workspaces[0];
      workspaceId = ws.id;
      organizationId = ws.organizationId;
    } else {
      // Verify access
      const workspaces = await WorkspaceService.listForUser(session.user.id);
      const hasAccess = workspaces.some(
        (w) => w.id === workspaceId && w.organizationId === organizationId,
      );
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    const summary = await OnboardingService.seedSampleData(
      organizationId!,
      workspaceId!,
      session.user.id,
    );
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error('[onboarding/seed-sample] error:', e);
    return NextResponse.json({ error: 'failed_to_seed_sample' }, { status: 500 });
  }
}
