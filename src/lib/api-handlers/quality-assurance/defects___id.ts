import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { QualityAssuranceService } from '@/lib/services/quality-assurance-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const defect = await QualityAssuranceService.getDefect(id);
  if (!defect) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ defect });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const defect = await QualityAssuranceService.updateDefect(id, body);
    if (!defect) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ defect });
  } catch (e) {
    console.error('[quality-assurance/defects] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_defect' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await QualityAssuranceService.deleteDefect(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
