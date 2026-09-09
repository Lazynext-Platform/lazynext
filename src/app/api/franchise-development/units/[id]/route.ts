import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const unit = await FranchiseDevelopmentService.getUnit(id);
  if (!unit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ unit });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const unit = await FranchiseDevelopmentService.updateUnit(id, body);
    if (!unit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ unit });
  } catch (e) {
    console.error('[franchise-development/units] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_unit' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await FranchiseDevelopmentService.deleteUnit(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
