import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateHousingService } from '@/lib/services/corporate-housing-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const booking = await CorporateHousingService.completeBooking(id, session.user.id);
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ booking });
}
