import { NextRequest, NextResponse } from 'next/server';
import { BenefitsService } from '@/lib/services/benefits-service';

/** POST /api/benefits/enrollments/[id]/cancel — cancel an enrollment */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enrollment = await BenefitsService.cancelEnrollment(id);
  if (!enrollment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ enrollment });
}
