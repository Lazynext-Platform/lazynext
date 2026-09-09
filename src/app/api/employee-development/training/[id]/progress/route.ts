import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** POST /api/employee-development/training/[id]/progress — update training progress */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const progress = Number(body.progress);
  if (Number.isNaN(progress)) {
    return NextResponse.json({ error: 'progress_required' }, { status: 400 });
  }

  try {
    const plan = await EmployeeDevelopmentService.updateTrainingProgress(id, progress);
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[employee-development/training/progress] error:', e);
    return NextResponse.json({ error: 'failed_to_update_progress' }, { status: 500 });
  }
}
