import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OccupationalHealthService } from '@/lib/services/occupational-health-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const surveillance = await OccupationalHealthService.getMedicalSurveillance(id);
  if (!surveillance) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ surveillance });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const surveillance = await OccupationalHealthService.updateMedicalSurveillance(id, body);
    if (!surveillance) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ surveillance });
  } catch (e) {
    console.error('[occupational-health/surveillances] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_surveillance' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await OccupationalHealthService.deleteMedicalSurveillance(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
