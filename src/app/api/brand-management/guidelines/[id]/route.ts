import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BrandManagementService } from '@/lib/services/brand-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const guideline = await BrandManagementService.getGuideline(id);
  if (!guideline) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ guideline });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const guideline = await BrandManagementService.updateGuideline(id, body);
    if (!guideline) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ guideline });
  } catch (e) {
    console.error('[brand-management/guidelines] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_guideline' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await BrandManagementService.deleteGuideline(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
