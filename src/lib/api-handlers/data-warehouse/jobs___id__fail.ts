import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const errorMessage = String(body.errorMessage || '');
  const job = await DataWarehouseService.failJob(id, errorMessage, session.user.id);
  if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ job });
}
