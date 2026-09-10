import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RelocationService } from '@/lib/services/relocation-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const caseRecord = await RelocationService.getCase(id);
  if (!caseRecord) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ case: caseRecord });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const caseRecord = await RelocationService.updateCase(id, body);
    if (!caseRecord) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ case: caseRecord });
  } catch (e) {
    console.error('[relocation/cases] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_case' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await RelocationService.deleteCase(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
