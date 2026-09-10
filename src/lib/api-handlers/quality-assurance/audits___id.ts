import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { QualityAssuranceService } from '@/lib/services/quality-assurance-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const audit = await QualityAssuranceService.getAudit(id);
  if (!audit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ audit });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const audit = await QualityAssuranceService.updateAudit(id, body);
    if (!audit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ audit });
  } catch (e) {
    console.error('[quality-assurance/audits] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_audit' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await QualityAssuranceService.deleteAudit(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
