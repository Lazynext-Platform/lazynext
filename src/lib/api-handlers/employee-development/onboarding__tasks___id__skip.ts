import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OnboardingService } from '@/lib/services/onboarding-service';

/** POST /api/employee-development/onboarding/tasks/[id]/skip — skip a task */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const task = await OnboardingService.skipTask(id, body.reason ? String(body.reason) : undefined);
    return NextResponse.json({ task });
  } catch (e) {
    console.error('[employee-development/onboarding/tasks/skip] error:', e);
    return NextResponse.json({ error: 'failed_to_skip_task' }, { status: 500 });
  }
}
