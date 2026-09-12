import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OnboardingService } from '@/lib/services/onboarding-service';

/**
 * GET /api/onboarding/state — get the current user's onboarding progress state.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Retry up to 3 times on cold start — Prisma/D1 may not be ready on the
  // first request after a Cloudflare Worker isolate is created.
  const delays = [200, 500, 1000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const state = await OnboardingService.getOnboardingState(session.user.id);
      return NextResponse.json(state);
    } catch (e) {
      if (attempt < delays.length) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      // Cold start — return default state so client retry can re-fetch
      return NextResponse.json({
        steps: [
          { id: 'welcome', completed: false },
          { id: 'organization', completed: false },
          { id: 'workspace', completed: false },
          { id: 'profile', completed: false },
          { id: 'agents', completed: false },
          { id: 'goal', completed: false },
          { id: 'plan', completed: false },
          { id: 'task', completed: false },
          { id: 'sample', completed: false },
          { id: 'integrations', completed: false },
          { id: 'done', completed: false },
        ],
        completedCount: 0,
        totalSteps: 11,
        progress: 0,
      });
    }
  }
  return NextResponse.json({ error: 'failed_to_get_state' }, { status: 500 });
}
