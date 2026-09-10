import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityReportingService } from '@/lib/services/sustainability-reporting-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const disclosure = await SustainabilityReportingService.publishSustainabilityDisclosure(id, session.user.id);
  if (!disclosure) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ disclosure });
}
