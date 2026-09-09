import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ParkingManagementService } from '@/lib/services/parking-management-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const visitorParking = await ParkingManagementService.expireVisitorParking(id, session.user.id);
  if (!visitorParking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ visitorParking });
}
