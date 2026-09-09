import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OnboardingService } from '@/lib/services/onboarding-service';

/**
 * POST /api/onboarding/reset — reset onboarding state for the current user.
 */
export async function POST(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await OnboardingService.resetOnboarding(session.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[onboarding/reset] error:', e);
    return NextResponse.json({ error: 'failed_to_reset' }, { status: 500 });
  }
}
