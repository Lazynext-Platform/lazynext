import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OnboardingService } from '@/lib/services/onboarding-service';

/** POST /api/employee-development/onboarding/tasks/[id]/complete — mark task completed */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const task = await OnboardingService.completeTask(id);
    return NextResponse.json({ task });
  } catch (e) {
    console.error('[employee-development/onboarding/tasks/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_task' }, { status: 500 });
  }
}
