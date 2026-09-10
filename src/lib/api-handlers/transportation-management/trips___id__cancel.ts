import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TransportationManagementService } from '@/lib/services/transportation-management-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const trip = await TransportationManagementService.cancelTrip(id, session.user.id);
  if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ trip });
}
