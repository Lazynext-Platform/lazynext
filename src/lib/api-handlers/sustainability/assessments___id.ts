import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/assessments/[id] — get an assessment */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const assessment = await SustainabilityService.getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'assessment_not_found' }, { status: 404 });
  }
  return NextResponse.json({ assessment });
}

/** PATCH /api/sustainability/assessments/[id] — update an assessment */
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
    const assessment = await SustainabilityService.updateAssessment(id, {
      framework: body.framework,
      rating: body.rating,
      score: body.score !== undefined ? Number(body.score) : undefined,
      assessor: body.assessor,
      assessmentDate: body.assessmentDate,
      findings: body.findings,
      recommendations: body.recommendations,
      status: body.status,
    });
    if (!assessment) {
      return NextResponse.json({ error: 'assessment_not_found' }, { status: 404 });
    }
    return NextResponse.json({ assessment });
  } catch (e) {
    console.error('[sustainability/assessments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_assessment' }, { status: 500 });
  }
}
