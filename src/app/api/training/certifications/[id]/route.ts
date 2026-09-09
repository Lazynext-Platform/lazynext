import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/certifications/[id] — get a single certification */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const certification = await TrainingService.getCertification(id);
  if (!certification) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ certification });
}

/** PATCH /api/training/certifications/[id] — update a certification */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const certification = await TrainingService.updateCertification(id, {
      name: body.name, description: body.description, issuer: body.issuer,
      validFrom: body.validFrom, validTo: body.validTo, requirements: body.requirements,
      courseId: body.courseId, employeeName: body.employeeName,
      certificateNumber: body.certificateNumber, status: body.status,
    });
    if (!certification) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ certification });
  } catch (e) {
    console.error('[training/certifications] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_certification' }, { status: 500 });
  }
}
