import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const royalty = await FranchiseDevelopmentService.getRoyalty(id);
  if (!royalty) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ royalty });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const royalty = await FranchiseDevelopmentService.updateRoyalty(id, body);
    if (!royalty) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ royalty });
  } catch (e) {
    console.error('[franchise-development/royalties] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_royalty' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await FranchiseDevelopmentService.deleteRoyalty(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
