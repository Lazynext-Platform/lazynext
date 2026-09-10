import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** POST /api/employee-development/training/[id]/complete — mark training completed */
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
    const plan = await EmployeeDevelopmentService.completeTrainingPlan(id);
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[employee-development/training/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_training_plan' }, { status: 500 });
  }
}
