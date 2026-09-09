import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TransportationManagementService } from '@/lib/services/transportation-management-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const trip = await TransportationManagementService.startTrip(id, session.user.id);
  if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ trip });
}
