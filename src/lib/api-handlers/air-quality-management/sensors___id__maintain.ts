import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AirQualityManagementService } from '@/lib/services/air-quality-management-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const sensor = await AirQualityManagementService.maintainAirSensor(id, session.user.id);
  if (!sensor) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ sensor });
}
