import { NextRequest, NextResponse } from 'next/server';
import { BenefitsService } from '@/lib/services/benefits-service';

/** POST /api/benefits/enrollments/[id]/cancel — cancel an enrollment */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const enrollment = await BenefitsService.cancelEnrollment(id);
  if (!enrollment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ enrollment });
}
