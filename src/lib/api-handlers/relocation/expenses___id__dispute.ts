import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RelocationService } from '@/lib/services/relocation-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const expense = await RelocationService.disputeExpense(id, session.user.id);
  if (!expense) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ expense });
}
