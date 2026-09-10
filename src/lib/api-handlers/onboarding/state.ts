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

  try {
    const state = await OnboardingService.getOnboardingState(session.user.id);
    return NextResponse.json(state);
  } catch (e) {
    console.error('[onboarding/state] error:', e);
    return NextResponse.json({ error: 'failed_to_get_state' }, { status: 500 });
  }
}
