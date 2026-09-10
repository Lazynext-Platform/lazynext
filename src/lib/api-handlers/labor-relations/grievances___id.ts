import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LaborRelationsService } from '@/lib/services/labor-relations-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const grievance = await LaborRelationsService.getGrievance(id);
  if (!grievance) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ grievance });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const grievance = await LaborRelationsService.updateGrievance(id, body);
    if (!grievance) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ grievance });
  } catch (e) {
    console.error('[labor-relations/grievances] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_grievance' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await LaborRelationsService.deleteGrievance(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
