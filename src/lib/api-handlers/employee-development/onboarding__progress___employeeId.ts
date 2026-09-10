import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OnboardingService } from '@/lib/services/onboarding-service';

/** GET /api/employee-development/onboarding/progress/[employeeId] — onboarding progress */
export async function GET(
  _req: NextRequest,
  { params }: { params: { employeeId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { employeeId } = params;
  const [progress, tasks] = await Promise.all([
    OnboardingService.getProgress(employeeId),
    OnboardingService.getByEmployee(employeeId),
  ]);
  return NextResponse.json({ progress, tasks });
}
