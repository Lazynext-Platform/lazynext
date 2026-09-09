import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityReportingService } from '@/lib/services/sustainability-reporting-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const assurance = await SustainabilityReportingService.completeAssuranceEngagement(id, session.user.id);
  if (!assurance) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ assurance });
}
