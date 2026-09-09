import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const pipeline = await DataWarehouseService.activatePipeline(id, session.user.id);
  if (!pipeline) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ pipeline });
}
