import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BrandManagementService } from '@/lib/services/brand-management-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const guideline = await BrandManagementService.archiveGuideline(id, session.user.id);
  if (!guideline) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ guideline });
}
