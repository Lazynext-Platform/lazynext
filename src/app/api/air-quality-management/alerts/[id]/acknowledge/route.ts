import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AirQualityManagementService } from '@/lib/services/air-quality-management-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const alert = await AirQualityManagementService.acknowledgeAirAlert(id, session.user.id);
  if (!alert) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ alert });
}
