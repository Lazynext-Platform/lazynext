import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AirQualityManagementService } from '@/lib/services/air-quality-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const alert = await AirQualityManagementService.getAirAlert(id);
  if (!alert) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ alert });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const alert = await AirQualityManagementService.updateAirAlert(id, body);
    if (!alert) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ alert });
  } catch (e) {
    console.error('[air-quality-management/alerts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_alert' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await AirQualityManagementService.deleteAirAlert(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
