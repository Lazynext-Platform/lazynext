import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { QualityAssuranceService } from '@/lib/services/quality-assurance-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const capa = await QualityAssuranceService.getCapa(id);
  if (!capa) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ capa });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const capa = await QualityAssuranceService.updateCapa(id, body);
    if (!capa) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ capa });
  } catch (e) {
    console.error('[quality-assurance/capas] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_capa' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await QualityAssuranceService.deleteCapa(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
