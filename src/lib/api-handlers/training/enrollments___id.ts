import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/enrollments/[id] — get a single enrollment */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const enrollment = await TrainingService.getEnrollment(id);
  if (!enrollment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ enrollment });
}

/** PATCH /api/training/enrollments/[id] — update an enrollment */
export async function PATCH(
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
    const enrollment = await TrainingService.updateEnrollment(id, {
      employeeName: body.employeeName, employeeEmail: body.employeeEmail, status: body.status,
      enrolledDate: body.enrolledDate, completedDate: body.completedDate, progress: body.progress,
      score: body.score, certificateId: body.certificateId, notes: body.notes,
    });
    if (!enrollment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ enrollment });
  } catch (e) {
    console.error('[training/enrollments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_enrollment' }, { status: 500 });
  }
}
