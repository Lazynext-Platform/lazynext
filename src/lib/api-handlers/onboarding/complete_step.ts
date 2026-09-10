import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OnboardingService } from '@/lib/services/onboarding-service';

/**
 * POST /api/onboarding/complete-step — mark an onboarding step as completed.
 * Body: { stepId: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { stepId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.stepId || typeof body.stepId !== 'string') {
    return NextResponse.json({ error: 'stepId_required' }, { status: 400 });
  }

  try {
    const result = await OnboardingService.completeStep(session.user.id, body.stepId);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[onboarding/complete-step] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_step' }, { status: 500 });
  }
}
