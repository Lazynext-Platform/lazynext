import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BrandManagementService } from '@/lib/services/brand-management-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const score = Number(body.score ?? 0);
  const audit = await BrandManagementService.completeAudit(id, score, session.user.id);
  if (!audit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ audit });
}
