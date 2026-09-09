import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const program = await CorporateGivingService.getProgram(id);
  if (!program) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ program });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const program = await CorporateGivingService.updateProgram(id, body);
    if (!program) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ program });
  } catch (e) {
    console.error('[corporate-giving/programs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_program' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CorporateGivingService.deleteProgram(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
